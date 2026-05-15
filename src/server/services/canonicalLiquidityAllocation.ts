/**
 * Pure allocation math (Vinxi mirror of backend/src/services/canonicalLiquidityAllocation.ts).
 */

export type LiquidityWeightSource = "curated-appeal" | "real-market-volume";

export type LiquidityAllocationSlot = {
  marketId: string;
  gameId: string;
  marketName: string;
  league: string;
  sport: string;
  appealScore: number;
  volume: number;
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

export const MIN_ALLOCATION_SHARE = 0.06;
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

function rawWeight(slot: LiquidityAllocationSlot, source: LiquidityWeightSource): number {
  if (source === "real-market-volume") return Math.max(0, slot.volume);
  return Math.max(0, slot.appealScore);
}

export function computeCanonicalMarketAllocations(
  slots: LiquidityAllocationSlot[],
  totalBudget: number,
  weightSource: LiquidityWeightSource,
): CanonicalMarketLiquidityRow[] {
  if (slots.length === 0 || totalBudget <= 0) return [];

  const n = slots.length;
  const minUsd = totalBudget * MIN_ALLOCATION_SHARE;
  const maxUsd = totalBudget * MAX_ALLOCATION_SHARE;

  const raw = slots.map((s) => rawWeight(s, weightSource));
  let sum = raw.reduce((a, b) => a + b, 0);
  const equal = sum <= 0;
  if (equal) sum = n;

  let allocations = slots.map((slot, i) => {
    const w = equal ? 1 / n : raw[i]! / sum;
    let usd = totalBudget * w;
    usd = Math.max(minUsd, Math.min(maxUsd, usd));
    return { slot, usd, w };
  });

  let total = allocations.reduce((s, a) => s + a.usd, 0);
  let drift = Math.round((totalBudget - total) * 100) / 100;

  if (Math.abs(drift) >= 0.01) {
    const headroom = allocations.map((a) => maxUsd - a.usd);
    const room = headroom.reduce((s, h) => s + Math.max(0, h), 0);
    if (drift > 0 && room > 0) {
      allocations = allocations.map((a, i) => ({
        ...a,
        usd: Math.round((a.usd + (drift * Math.max(0, headroom[i]!)) / room) * 100) / 100,
      }));
    } else if (drift < 0) {
      const reducible = allocations.map((a) => a.usd - minUsd);
      const cap = reducible.reduce((s, r) => s + Math.max(0, r), 0);
      if (cap > 0) {
        allocations = allocations.map((a, i) => ({
          ...a,
          usd: Math.round((a.usd + (drift * Math.max(0, reducible[i]!)) / cap) * 100) / 100,
        }));
      }
    }
    total = allocations.reduce((s, a) => s + a.usd, 0);
    drift = Math.round((totalBudget - total) * 100) / 100;
    if (allocations.length > 0 && Math.abs(drift) >= 0.01) {
      allocations[0] = {
        ...allocations[0]!,
        usd: Math.round((allocations[0]!.usd + drift) * 100) / 100,
      };
    }
  }

  const finalTotal = allocations.reduce((s, a) => s + a.usd, 0);

  return allocations
    .map(({ slot, usd, w }) => ({
      marketId: slot.marketId,
      gameId: slot.gameId,
      marketName: slot.marketName,
      league: slot.league,
      sport: slot.sport,
      appealScore: slot.appealScore,
      volume: slot.volume,
      allocation: Math.round(usd * 100) / 100,
      percentage:
        finalTotal > 0 ? Math.round((usd / finalTotal) * 100 * 100) / 100 : 0,
      normalizedWeight: Math.round(w * 10000) / 10000,
      weightSource,
    }))
    .sort((a, b) => b.allocation - a.allocation);
}
