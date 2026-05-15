/**
 * Count normalization / structural failures on raw Azuro rows.
 * Usage: node --env-file=.env --import tsx src/scripts/debug/normalizationFailures.ts
 */
import type { RawAzuroGame } from "../../services/azuroCuratorGraphql";
import { extract1x2DecimalOddsFromRawGame, fetchAzuroGames } from "../../services/azuroCuratorGraphql";
import { kickoffSecFromRaw } from "../../services/eventCurationPipeline";
import { emergencyFetchNowSkewSec } from "../../services/emergencyRelaxMode";
import { writeDebugJson } from "./debugOut";

function classifyFailure(g: RawAzuroGame): string | null {
  const gid = String(g.gameId || g.id || "").trim();
  if (!gid) return "missing_game_id";
  const k = kickoffSecFromRaw(g);
  if (k == null || !Number.isFinite(k)) return "invalid_starts_at";
  const parts = g.participants;
  if (!Array.isArray(parts) || parts.length < 2) return "invalid_participants";
  const a = String(parts[0]?.name || "").trim();
  const b = String(parts[1]?.name || "").trim();
  if (!a || !b) return "empty_team_name";
  const sport = (g.sport?.slug || g.sport?.name || "").trim();
  if (!sport) return "missing_sport";
  const odds = extract1x2DecimalOddsFromRawGame(g);
  if (odds.homeOdds == null && odds.drawOdds == null && odds.awayOdds == null) return "empty_1x2_odds";
  return null;
}

async function main() {
  const wall = Math.floor(Date.now() / 1000);
  const from = wall - emergencyFetchNowSkewSec();
  const raw = await fetchAzuroGames({ minStartsAtSec: from });
  const reasons: Record<string, number> = {};
  const samples: Record<string, RawAzuroGame[]> = {};

  let fail = 0;
  for (const g of raw) {
    const r = classifyFailure(g);
    if (!r) continue;
    fail += 1;
    reasons[r] = (reasons[r] ?? 0) + 1;
    const arr = (samples[r] ??= []);
    if (arr.length < 5) arr.push(g);
  }

  const out = {
    generatedAtIso: new Date().toISOString(),
    total: raw.length,
    normalizationFailures: fail,
    groupedByReason: reasons,
    rawFixtureSamples: samples,
  };

  const dest = writeDebugJson("normalization-failures.json", out);
  console.log("TOTAL", raw.length, "FAILURES", fail);
  console.log("Wrote:", dest);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
