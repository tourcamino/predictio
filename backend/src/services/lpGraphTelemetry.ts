/**
 * Full LP graph participation telemetry.
 */
import type { CanonicalLiquidityState } from "./canonicalLiquidityState";

export type LpGraphTelemetry = {
  LP_CONNECTED_MARKETS: number;
  LP_MIN_ALLOCATED_MARKETS: number;
  LP_ZERO_ALLOCATION_MARKETS: number;
  LP_TOTAL_WEIGHT: number;
  LP_TOP10_WEIGHT_SHARE: number;
  LP_LONGTAIL_WEIGHT_SHARE: number;
  ORPHAN_VAULT_COUNT: number;
  REGISTRY_OPEN_COUNT: number;
};

export function computeLpGraphTelemetry(
  state: CanonicalLiquidityState,
  registryOpenCount: number,
): LpGraphTelemetry {
  const rows = state.liquidityPerMarket;
  const n = rows.length;
  const minUsd = rows.length > 0 ? Math.min(...rows.map((r) => r.allocation)) : 0;
  const zeroCount = rows.filter((r) => r.allocation <= 0).length;
  const minAllocated = rows.filter((r) => r.allocation > 0).length;
  const totalWeight = rows.reduce((s, r) => s + r.normalizedWeight, 0);
  const sorted = [...rows].sort((a, b) => b.allocation - a.allocation);
  const top10Alloc = sorted.slice(0, 10).reduce((s, r) => s + r.allocation, 0);
  const totalAlloc = state.allocationSum;
  const longtail = sorted.slice(10).reduce((s, r) => s + r.allocation, 0);

  return {
    LP_CONNECTED_MARKETS: n,
    LP_MIN_ALLOCATED_MARKETS: minAllocated,
    LP_ZERO_ALLOCATION_MARKETS: zeroCount,
    LP_TOTAL_WEIGHT: Math.round(totalWeight * 10000) / 10000,
    LP_TOP10_WEIGHT_SHARE:
      totalAlloc > 0 ? Math.round((top10Alloc / totalAlloc) * 10000) / 10000 : 0,
    LP_LONGTAIL_WEIGHT_SHARE:
      totalAlloc > 0 ? Math.round((longtail / totalAlloc) * 10000) / 10000 : 0,
    ORPHAN_VAULT_COUNT: state.diagnostics.orphanAllocationCount,
    REGISTRY_OPEN_COUNT: registryOpenCount,
  };
}

const g = globalThis as typeof globalThis & {
  __predictioLastLpGraphTelemetry?: LpGraphTelemetry;
};

export function cacheLpGraphTelemetry(t: LpGraphTelemetry): void {
  g.__predictioLastLpGraphTelemetry = t;
}

export function getCachedLpGraphTelemetry(): LpGraphTelemetry | null {
  return g.__predictioLastLpGraphTelemetry ?? null;
}
