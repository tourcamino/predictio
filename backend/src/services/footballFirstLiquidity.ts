/**
 * Football-first LP slot selection — registry stays global; allocation prioritizes football.
 */
import { isFootballSportSlug } from "./canonicalSportTaxonomy";

export const FOOTBALL_LP_WEIGHT_MULTIPLIER = 3;

export type CuratedRowForLiquidity = {
  gameId: string;
  importanceScore: number | null;
  startsAt: Date;
  sportSlug: string | null;
  sport: string | null;
};

export function compareFootballFirstLiquidity(
  a: CuratedRowForLiquidity,
  b: CuratedRowForLiquidity,
): number {
  const af = isFootballSportSlug(a.sportSlug ?? a.sport);
  const bf = isFootballSportSlug(b.sportSlug ?? b.sport);
  if (af !== bf) return af ? -1 : 1;
  const scoreDiff = (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
  if (scoreDiff !== 0) return scoreDiff;
  return a.startsAt.getTime() - b.startsAt.getTime();
}

export function applyFootballLiquidityWeightBoost(
  baseWeight: number,
  sportSlug?: string | null,
): number {
  if (baseWeight <= 0) return 0;
  return isFootballSportSlug(sportSlug) ? baseWeight * FOOTBALL_LP_WEIGHT_MULTIPLIER : baseWeight;
}
