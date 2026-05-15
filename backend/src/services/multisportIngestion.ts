import type { RawAzuroGame } from "./azuroCuratorGraphql";
import { canonicalSportFromRaw, type CanonicalSport } from "./canonicalSportTaxonomy";
import {
  computePremiumScore,
  MULTISPORT_PREMIUM_POOL_MIN,
  qualifiesMultisportPremiumPool,
} from "./premiumSportScoring";
import type { ScoredItalian } from "./editorialCatalogOrchestrator";
import { isEmergencyCatalogBypass } from "./emergencyRelaxMode";
import { computeGlobalInterestScore, isInterestFirstCatalogMode } from "./globalInterestScore";

function kickoffSecFromRaw(g: RawAzuroGame): number | null {
  const kickoff = parseInt(String(g.startsAt), 10);
  return Number.isFinite(kickoff) ? kickoff : null;
}

function isStalePrematchGame(g: RawAzuroGame, nowSec: number): boolean {
  const kickoff = kickoffSecFromRaw(g);
  if (kickoff != null && kickoff <= nowSec) return true;
  const locked = kickoff != null ? kickoff - 5 * 60 : null;
  if (locked != null && locked <= nowSec) return true;
  return false;
}

export type MultisportIngestionResult = {
  multisportUpcoming: RawAzuroGame[];
  bySport: Record<CanonicalSport, number>;
  premiumPool: ScoredItalian[];
  rejectedLowPremium: number;
};

/**
 * Build multisport candidates from raw Azuro (non-football only).
 * Interest-first mode: all in-window games with markets, ranked by `computeGlobalInterestScore` (no premium floor).
 * Legacy: premium gate + `computePremiumScore` floor.
 */
export function buildMultisportPremiumPool(
  rawGames: RawAzuroGame[],
  nowSec: number,
  windowEndSec: number,
): MultisportIngestionResult {
  const bySport: Record<CanonicalSport, number> = {
    football: 0,
    tennis: 0,
    basketball: 0,
    motorsport: 0,
    mma: 0,
  };

  const multisportUpcoming: RawAzuroGame[] = [];
  let rejectedLowPremium = 0;

  const relax = isEmergencyCatalogBypass();
  const premiumFloor = relax ? 58 : MULTISPORT_PREMIUM_POOL_MIN;
  const interestFirst = isInterestFirstCatalogMode();

  for (const g of rawGames) {
    if (isStalePrematchGame(g, nowSec)) continue;
    const sport = canonicalSportFromRaw(g);
    if (!sport || sport === "football") continue;
    bySport[sport] += 1;

    const kickoff = kickoffSecFromRaw(g);
    if (kickoff == null || kickoff <= nowSec || kickoff >= windowEndSec) continue;

    if (interestFirst) {
      const ac = Number(g.activeConditionsCount ?? 0);
      if (ac <= 0) {
        rejectedLowPremium += 1;
        continue;
      }
      multisportUpcoming.push(g);
      continue;
    }

    if (!qualifiesMultisportPremiumPool(g)) {
      if (!relax) {
        rejectedLowPremium += 1;
        continue;
      }
      const scoredProbe = computePremiumScore(g);
      if (!scoredProbe || scoredProbe.premiumScore < 58) {
        rejectedLowPremium += 1;
        continue;
      }
    }
    multisportUpcoming.push(g);
  }

  const premiumPool: ScoredItalian[] = interestFirst
    ? multisportUpcoming
        .map((raw) => ({
          raw,
          importanceScore: computeGlobalInterestScore(raw),
        }))
        .sort((a, b) => {
          if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
          return parseInt(String(a.raw.startsAt), 10) - parseInt(String(b.raw.startsAt), 10);
        })
    : multisportUpcoming
        .map((raw) => {
          const scored = computePremiumScore(raw);
          return {
            raw,
            importanceScore: scored?.premiumScore ?? 0,
          };
        })
        .filter((it) => it.importanceScore >= premiumFloor)
        .sort((a, b) => {
          if (b.importanceScore !== a.importanceScore) return b.importanceScore - a.importanceScore;
          return parseInt(String(a.raw.startsAt), 10) - parseInt(String(b.raw.startsAt), 10);
        });

  return {
    multisportUpcoming,
    bySport,
    premiumPool,
    rejectedLowPremium,
  };
}
