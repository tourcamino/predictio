/**
 * Compare orchestrator output vs public GET /api/markets (DB-backed).
 * Usage: node --env-file=.env --import tsx src/scripts/debug/frontendBackendDiff.ts
 *
 * For client-side filter simulation, run the app and compare browser network tab;
 * this script only measures API vs fresh Azuro orchestration.
 */
import { buildEuropeanCurationGamesPayload } from "../../services/eventCurationPipeline";
import { writeDebugJson } from "./debugOut";

async function main() {
  const apiBase = (
    process.env.PREDICTIO_DEBUG_API_BASE ||
    process.env.PUBLIC_API_BASE ||
    "http://127.0.0.1:3001"
  ).replace(/\/$/, "");

  const { games, diagnostics } = await buildEuropeanCurationGamesPayload(new Set(), {
    openActiveCount: Number(process.env.PREDICTIO_DEBUG_OPEN_ACTIVE ?? "99") || 99,
  });

  let apiReturned = 0;
  let apiSample: unknown[] = [];
  try {
    const res = await fetch(`${apiBase}/api/markets`, {
      headers: { accept: "application/json" },
    });
    const json = (await res.json()) as { markets?: unknown[] };
    const markets = Array.isArray(json?.markets) ? json.markets : [];
    apiReturned = markets.length;
    apiSample = markets.slice(0, 5);
  } catch (e) {
    console.warn("GET /api/markets failed — is the backend running?", e);
  }

  const orchIds = games.map((g) => g.gameId);
  const out = {
    generatedAtIso: new Date().toISOString(),
    apiBase,
    BACKEND_ORCHESTRATOR_SELECTED: games.length,
    orchestratorSampleGameIds: orchIds.slice(0, 8),
    API_RETURNED: apiReturned,
    apiSampleIds: apiSample.map((m: unknown) => (m as { gameId?: string; id?: string })?.gameId ?? (m as { id?: string })?.id),
    diagnostics,
    note:
      "CLIENT_RECEIVED / RENDERED / FILTERED require a browser run; if ORCHESTRATOR_SELECTED>0 but API_RETURNED=0 the DB sync or env for Azuro on the server may differ.",
  };

  const dest = writeDebugJson("frontend-backend-diff.json", out);
  console.log("BACKEND SELECTED (orchestrator):", games.length);
  console.log("API RETURNED:", apiReturned);
  console.log("Wrote:", dest);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
