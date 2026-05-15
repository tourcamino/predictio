/**
 * Catalog filter waterfall — where inventory drops (writes filter-waterfall.json under os.tmpdir()).
 * Usage: node --env-file=.env --import tsx src/scripts/debug/filterWaterfallDiagnostics.ts
 */
import type { RawAzuroGame } from "../../services/azuroCuratorGraphql";
import { fetchAzuroGames, rawGameIsFootball } from "../../services/azuroCuratorGraphql";
import {
  passesProtocolContinuityTierD,
  passesStrictPremiumScoredItalian,
} from "../../services/editorialPremiumFirewall";
import { passesSurvivalInventoryScoredItalian } from "../../services/survivalInventoryGate";
import { buildMultisportPremiumPool } from "../../services/multisportIngestion";
import {
  buildEuropeanCurationGamesPayload,
  explainAppealPoolRejection,
  filterEuropeanUpcoming,
  getImportanceScore,
  isStalePrematchGame,
  kickoffSecFromRaw,
} from "../../services/eventCurationPipeline";
import { curationLookaheadDays, emergencyFetchNowSkewSec } from "../../services/emergencyRelaxMode";
import { writeDebugJson } from "./debugOut";

type Step = {
  step: string;
  count: number;
  pctOfPrevious: number | null;
  topRemovalReasons?: Record<string, number>;
  samplesOut?: Array<{ gameId: string; reason: string; detail?: string }>;
};

function pct(prev: number, cur: number): number | null {
  if (prev <= 0) return null;
  return Math.round((10000 * cur) / prev) / 100;
}

function scoreIt(g: RawAzuroGame) {
  return { raw: g, importanceScore: getImportanceScore(g) };
}

async function main() {
  const wallSec = Math.floor(Date.now() / 1000);
  const nowSec = wallSec - emergencyFetchNowSkewSec();
  const windowEndSec = wallSec + curationLookaheadDays() * 24 * 60 * 60;
  const rawFeed = await fetchAzuroGames({ minStartsAtSec: nowSec });

  const steps: Step[] = [];

  const norm = rawFeed.filter((g) => {
    const id = String(g.gameId || g.id || "").trim();
    const k = kickoffSecFromRaw(g);
    return id.length > 0 && k != null && Number.isFinite(k);
  });

  const notStale: RawAzuroGame[] = [];
  let staleN = 0;
  for (const g of rawFeed) {
    if (isStalePrematchGame(g, nowSec)) {
      staleN += 1;
    } else {
      notStale.push(g);
    }
  }

  const liveFootball = notStale.filter((g) => rawGameIsFootball(g));
  const upcoming = liveFootball.filter((g) => {
    const k = kickoffSecFromRaw(g);
    return k != null && k > nowSec && k < windowEndSec;
  });

  const eu = filterEuropeanUpcoming(rawFeed, nowSec, windowEndSec, {
    openActiveCount: 0,
  });

  const appealPass: RawAzuroGame[] = [];
  const appealRejectReasons: Record<string, number> = {};
  const appealSamples: Array<{ gameId: string; reason: string; detail?: string }> = [];
  for (const g of eu.europeanGames) {
    const imp = getImportanceScore(g);
    const ex = explainAppealPoolRejection(g, imp);
    if (ex.passes) {
      appealPass.push(g);
    } else {
      const key = ex.reason || "appeal_reject";
      appealRejectReasons[key] = (appealRejectReasons[key] ?? 0) + 1;
      if (appealSamples.length < 12) {
        appealSamples.push({
          gameId: String(g.gameId || ""),
          reason: key,
          detail: JSON.stringify({
            importanceScore: imp,
            appealScore: ex.appealScore,
            threshold: ex.requiredThreshold,
            tier: ex.tier,
          }),
        });
      }
    }
  }

  const strictPass = appealPass.filter((g) => passesStrictPremiumScoredItalian(scoreIt(g)));
  const strictRejectSamples: Step["samplesOut"] = [];
  for (const g of appealPass) {
    if (!passesStrictPremiumScoredItalian(scoreIt(g)) && strictRejectSamples.length < 12) {
      strictRejectSamples.push({
        gameId: String(g.gameId || ""),
        reason: "strict_premium_firewall",
      });
    }
  }

  const continuityPass = appealPass.filter((g) => passesProtocolContinuityTierD(scoreIt(g)));
  const continuityRejectSamples: Step["samplesOut"] = [];
  for (const g of appealPass) {
    if (!passesProtocolContinuityTierD(scoreIt(g)) && continuityRejectSamples.length < 8) {
      continuityRejectSamples.push({
        gameId: String(g.gameId || ""),
        reason: "continuity_tier_d_miss",
      });
    }
  }

  const ms = buildMultisportPremiumPool(rawFeed, nowSec, windowEndSec);
  const survivalPassUpcoming = upcoming.map(scoreIt).filter((it) => passesSurvivalInventoryScoredItalian(it));

  const final = await buildEuropeanCurationGamesPayload(new Set(), { openActiveCount: 0 });

  steps.push({ step: "rawFeed", count: rawFeed.length, pctOfPrevious: null });
  steps.push({
    step: "normalized (id+kickoff)",
    count: norm.length,
    pctOfPrevious: pct(rawFeed.length, norm.length),
  });
  steps.push({
    step: "validDates_liveNotStale",
    count: notStale.length,
    pctOfPrevious: pct(rawFeed.length, notStale.length),
  });
  steps.push({
    step: "validDates_footballUpcomingInWindow",
    count: upcoming.length,
    pctOfPrevious: pct(notStale.length, upcoming.length),
  });
  steps.push({
    step: "europeGate_futureWhitelisted",
    count: eu.europeanGames.length,
    pctOfPrevious: pct(upcoming.length, eu.europeanGames.length),
    topRemovalReasons: eu.rejectedByTier,
  });
  steps.push({
    step: "appealGate",
    count: appealPass.length,
    pctOfPrevious: pct(eu.europeanGames.length, appealPass.length),
    topRemovalReasons: appealRejectReasons,
    samplesOut: appealSamples,
  });
  steps.push({
    step: "strictFirewall (subset of appeal football path)",
    count: strictPass.length,
    pctOfPrevious: pct(appealPass.length, strictPass.length),
    samplesOut: strictRejectSamples,
  });
  steps.push({
    step: "continuityTierD_eligible_from_appeal",
    count: continuityPass.length,
    pctOfPrevious: pct(appealPass.length, continuityPass.length),
    samplesOut: continuityRejectSamples,
  });
  steps.push({
    step: "survivalGate_on_upcoming_football_scored",
    count: survivalPassUpcoming.length,
    pctOfPrevious: pct(upcoming.length, survivalPassUpcoming.length),
  });
  steps.push({
    step: "finalSelection_buildEuropeanCurationGamesPayload",
    count: final.games.length,
    pctOfPrevious: pct(appealPass.length + ms.premiumPool.length, final.games.length),
  });

  const out = {
    generatedAtIso: new Date().toISOString(),
    wallSec,
    nowSec,
    windowEndSec,
    emergencySkewSec: emergencyFetchNowSkewSec(),
    lookaheadDays: curationLookaheadDays(),
    steps,
    buildDiagnostics: final.diagnostics,
  };

  const dest = writeDebugJson("filter-waterfall.json", out);
  console.log("Wrote:", dest);
  for (const s of steps) {
    console.log(
      `${s.step}: ${s.count}` + (s.pctOfPrevious != null ? ` (${s.pctOfPrevious}% of previous)` : ""),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
