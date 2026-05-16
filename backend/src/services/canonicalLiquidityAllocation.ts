/**
 * Weighted full-graph LP allocation — every OPEN registry market participates.
 */
import {
  applyFootballLiquidityWeightBoost,
} from "./footballFirstLiquidity";
import { isFootballSportSlug } from "./canonicalSportTaxonomy";

export type LiquidityWeightSource = "curated-appeal" | "real-market-volume";

export type LiquidityAllocationSlot = {
  marketId: string;
  gameId: string;
  marketName: string;
  league: string;
  sport: string;
  appealScore: number;
  volume: number;
  startsAtMs?: number;
};

export type CanonicalMarketLiquidityRow = {
  marketId: string;
  gameId: string;
  marketName: string;
  league: string;
  sport: string;
  appealScore: number;
  volume: number;
  allocation: number;
  percentage: number;
  normalizedWeight: number;
  weightSource: LiquidityWeightSource;
};

/** @deprecated Slot-era min share — use dynamic bounds in computeCanonicalMarketAllocations. */
export const MIN_ALLOCATION_SHARE = 0.06;
/** @deprecated Slot-era max share — use dynamic bounds in computeCanonicalMarketAllocations. */
export const MAX_ALLOCATION_SHARE = 0.4;

export function curatedMarketIdFromGameId(gameId: string): string {
  return `azuro-${gameId}`;
}

export function pickWeightSource(
  slots: LiquidityAllocationSlot[],
): LiquidityWeightSource {
  const totalVolume = slots.reduce((s, x) => s + x.volume, 0);
  return totalVolume >= 50 ? "real-market-volume" : "curated-appeal";
}

export function minAllocationUsd(totalBudget: number, marketCount: number): number {
  const envMin = Number(process.env.PREDICTIO_LP_MIN_ALLOCATION_USD ?? "8");
  const floor = Number.isFinite(envMin) && envMin > 0 ? envMin : 8;
  if (marketCount <= 0) return floor;
  const equalShare = totalBudget / marketCount;
  return Math.max(0.01, Math.min(floor, equalShare * 0.12));
}

export function maxAllocationUsd(totalBudget: number, _marketCount: number): number {
  const envShare = Number(process.env.PREDICTIO_LP_MAX_SHARE ?? "0.18");
  const share = Number.isFinite(envShare) ? Math.min(0.45, Math.max(0.05, envShare)) : 0.18;
  return totalBudget * share;
}

function leagueQualityBoost(league: string, sport: string): number {
  if (!isFootballSportSlug(sport)) return 1;
  const l = league.toLowerCase();
  if (
    /champions league|uefa champions|premier league|serie a|la liga|laliga|bundesliga|ligue 1|veikkausliiga|eredivisie|europa league/i.test(
      l,
    )
  ) {
    return 1.35;
  }
  return 1;
}

function kickoffProximityBoost(startsAtMs: number | undefined, nowMs: number): number {
  if (startsAtMs == null || !Number.isFinite(startsAtMs)) return 1;
  const hours = (startsAtMs - nowMs) / 3_600_000;
  if (hours < 0) return 0.4;
  if (hours <= 6) return 1.4;
  if (hours <= 24) return 1.15;
  if (hours <= 72) return 1;
  return 0.8;
}

function rawWeight(
  slot: LiquidityAllocationSlot,
  source: LiquidityWeightSource,
  nowMs: number,
): number {
  let base =
    source === "real-market-volume"
      ? Math.max(0, slot.volume)
      : Math.max(1, slot.appealScore);
  base = applyFootballLiquidityWeightBoost(base, slot.sport);
  base *= leagueQualityBoost(slot.league, slot.sport);
  base *= kickoffProximityBoost(slot.startsAtMs, nowMs);
  return Math.max(0.01, base);
}

function redistributeDrift(
  allocations: Array<{ usd: number; minUsd: number; maxUsd: number }>,
  totalBudget: number,
): number[] {
  let usds = allocations.map((a) => a.usd);
  for (let pass = 0; pass < 8; pass++) {
    const total = usds.reduce((s, u) => s + u, 0);
    const drift = Math.round((totalBudget - total) * 100) / 100;
    if (Math.abs(drift) < 0.01) break;

    if (drift > 0) {
      const headroom = usds.map((u, i) => allocations[i]!.maxUsd - u);
      const room = headroom.reduce((s, h) => s + Math.max(0, h), 0);
      if (room <= 0) break;
      usds = usds.map((u, i) =>
        Math.round((u + (drift * Math.max(0, headroom[i]!)) / room) * 100) / 100,
      );
    } else {
      const reducible = usds.map((u, i) => u - allocations[i]!.minUsd);
      const cap = reducible.reduce((s, r) => s + Math.max(0, r), 0);
      if (cap <= 0) break;
      usds = usds.map((u, i) =>
        Math.round((u + (drift * Math.max(0, reducible[i]!)) / cap) * 100) / 100,
      );
    }
  }
  return usds;
}

/**
 * Full LP graph: guaranteed min floor per OPEN market + weighted remainder (football-first).
 */
export function computeCanonicalMarketAllocations(
  slots: LiquidityAllocationSlot[],
  totalBudget: number,
  weightSource: LiquidityWeightSource,
  nowMs: number = Date.now(),
): CanonicalMarketLiquidityRow[] {
  const n = slots.length;
  if (n === 0 || totalBudget <= 0) return [];

  let minUsd = minAllocationUsd(totalBudget, n);
  const maxUsd = maxAllocationUsd(totalBudget, n);

  if (n * minUsd > totalBudget) {
    minUsd = Math.max(0.01, totalBudget / n);
  }

  const remainder = Math.max(0, totalBudget - n * minUsd);
  const weights = slots.map((s) => rawWeight(s, weightSource, nowMs));
  const sumW = weights.reduce((a, b) => a + b, 0) || n;

  const draft = slots.map((slot, i) => {
    const w = weights[i]! / sumW;
    let usd = minUsd + remainder * w;
    usd = Math.min(maxUsd, Math.max(minUsd, usd));
    return { slot, usd, w, minUsd, maxUsd };
  });

  let usds = redistributeDrift(draft, totalBudget);
  const driftFinal = totalBudget - usds.reduce((s, u) => s + u, 0);
  if (usds.length > 0 && Math.abs(driftFinal) >= 0.01) {
    usds = usds.map((u, i) =>
      i === 0 ? Math.round((u + driftFinal) * 100) / 100 : u,
    );
  }
  const finalTotal = usds.reduce((s, u) => s + u, 0) || totalBudget;

  return draft
    .map(({ slot, w }, i) => ({
      marketId: slot.marketId,
      gameId: slot.gameId,
      marketName: slot.marketName,
      league: slot.league,
      sport: slot.sport,
      appealScore: slot.appealScore,
      volume: slot.volume,
      allocation: Math.round(usds[i]! * 100) / 100,
      percentage:
        finalTotal > 0
          ? Math.round((usds[i]! / finalTotal) * 100 * 100) / 100
          : 0,
      normalizedWeight: Math.round(w * 10000) / 10000,
      weightSource,
    }))
    .sort((a, b) => b.allocation - a.allocation);
}
