/**
 * Sport density through major gates (writes sport-density-map.json).
 * Usage: node --env-file=.env --import tsx src/scripts/debug/sportDensityMap.ts
 */
import type { RawAzuroGame } from "../../services/azuroCuratorGraphql";
import { fetchAzuroGames } from "../../services/azuroCuratorGraphql";
import { canonicalSportFromRaw } from "../../services/canonicalSportTaxonomy";
import {
  passesProtocolContinuityTierD,
  passesStrictPremiumScoredItalian,
} from "../../services/editorialPremiumFirewall";
import { buildMultisportPremiumPool } from "../../services/multisportIngestion";
import {
  explainAppealPoolRejection,
  filterEuropeanUpcoming,
  getImportanceScore,
  isStalePrematchGame,
  kickoffSecFromRaw,
} from "../../services/eventCurationPipeline";
import { curationLookaheadDays, emergencyFetchNowSkewSec } from "../../services/emergencyRelaxMode";
import { writeDebugJson } from "./debugOut";

function bump(m: Record<string, number>, k: string) {
  m[k] = (m[k] ?? 0) + 1;
}

async function main() {
  const wallSec = Math.floor(Date.now() / 1000);
  const nowSec = wallSec - emergencyFetchNowSkewSec();
  const windowEndSec = wallSec + curationLookaheadDays() * 86400;
  const raw = await fetchAzuroGames({ minStartsAtSec: nowSec });

  const openish = raw.filter((g) => {
    const s = String(g.state ?? "").toLowerCase();
    return s === "prematch" || s === "open" || s === "";
  });

  const valid: RawAzuroGame[] = [];
  for (const g of raw) {
    if (isStalePrematchGame(g, nowSec)) continue;
    const k = kickoffSecFromRaw(g);
    if (k == null || k <= nowSec || k >= windowEndSec) continue;
    valid.push(g);
  }

  const eu = filterEuropeanUpcoming(raw, nowSec, windowEndSec, { openActiveCount: 0 });

  const appealOk: RawAzuroGame[] = [];
  for (const g of eu.europeanGames) {
    const imp = getImportanceScore(g);
    if (explainAppealPoolRejection(g, imp).passes) appealOk.push(g);
  }

  const strictOk = appealOk.filter((g) =>
    passesStrictPremiumScoredItalian({ raw: g, importanceScore: getImportanceScore(g) }),
  );
  const continuityOk = appealOk.filter((g) =>
    passesProtocolContinuityTierD({ raw: g, importanceScore: getImportanceScore(g) }),
  );

  const ms = buildMultisportPremiumPool(raw, nowSec, windowEndSec);

  const agg = (
    games: RawAzuroGame[],
  ): { open: Record<string, number>; valid: Record<string, number>; appeal: Record<string, number> } => {
    const open: Record<string, number> = {};
    const val: Record<string, number> = {};
    const app: Record<string, number> = {};
    for (const g of openish) {
      bump(open, canonicalSportFromRaw(g) ?? "unknown");
    }
    for (const g of valid) {
      bump(val, canonicalSportFromRaw(g) ?? "unknown");
    }
    for (const g of games) {
      bump(app, canonicalSportFromRaw(g) ?? "unknown");
    }
    return { open, valid: val, appeal: app };
  };

  const strictBy: Record<string, number> = {};
  for (const g of strictOk) bump(strictBy, canonicalSportFromRaw(g) ?? "unknown");
  const contBy: Record<string, number> = {};
  for (const g of continuityOk) bump(contBy, canonicalSportFromRaw(g) ?? "unknown");
  const multiBy: Record<string, number> = { ...ms.bySport };

  const out = {
    generatedAtIso: new Date().toISOString(),
    aggregates: agg(appealOk),
    strictQualifiedBySport: strictBy,
    continuityQualifiedBySport: contBy,
    multisportPremiumPoolBySport: multiBy,
  };

  const dest = writeDebugJson("sport-density-map.json", out);
  console.log("Wrote:", dest);
  console.log(JSON.stringify(out.aggregates.valid, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
