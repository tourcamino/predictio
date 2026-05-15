/**
 * @deprecated Prefer `canonicalLiquidityState` — thin adapter for legacy imports.
 */
import type { PrismaClient } from "@prisma/client";
import {
  computeCanonicalMarketAllocations,
  type CanonicalMarketLiquidityRow,
} from "./canonicalLiquidityAllocation";
import { resolveCanonicalLiquidityState } from "./canonicalLiquidityState";

export const VAULT_CANONICAL_MARKET_CAP = 9;
export const MIN_TOTAL_VOLUME_FOR_VOLUME_WEIGHTS = 50;

export type VaultAllocationSource = "real-market-volume" | "curated-appeal-fallback";

export type VaultExposureSlot = {
  marketId: string;
  gameId: string;
  marketName: string;
  league: string;
  importanceScore: number;
  volume: number;
};

export type VaultAllocationRow = {
  marketId: string;
  marketName: string;
  league: string;
  allocation: number;
  percentage: number;
  weightSource: VaultAllocationSource;
};

function mapWeightSource(
  ws: CanonicalMarketLiquidityRow["weightSource"],
): VaultAllocationSource {
  return ws === "real-market-volume" ? "real-market-volume" : "curated-appeal-fallback";
}

export async function resolveVaultCanonicalExposure(prisma: PrismaClient) {
  const state = await resolveCanonicalLiquidityState(prisma);
  const slots: VaultExposureSlot[] = state.liquidityPerMarket.map((r) => ({
    marketId: r.marketId,
    gameId: r.gameId,
    marketName: r.marketName,
    league: r.league,
    importanceScore: r.appealScore,
    volume: r.volume,
  }));

  const allocationSource: VaultAllocationSource =
    state.diagnostics.weightSource === "real-market-volume"
      ? "real-market-volume"
      : "curated-appeal-fallback";

  return {
    slots,
    allocationSource,
    curatedOpenCount: state.canonicalOpenSlots,
  };
}

export function buildVaultAllocationRows(
  slots: VaultExposureSlot[],
  allocationSource: VaultAllocationSource,
  totalLiquidity: number,
): VaultAllocationRow[] {
  if (slots.length === 0 || totalLiquidity <= 0) return [];

  const weightSource =
    allocationSource === "real-market-volume"
      ? ("real-market-volume" as const)
      : ("curated-appeal" as const);

  const rows = computeCanonicalMarketAllocations(
    slots.map((s) => ({
      marketId: s.marketId,
      gameId: s.gameId,
      marketName: s.marketName,
      league: s.league,
      sport: "football",
      appealScore: s.importanceScore,
      volume: s.volume,
    })),
    totalLiquidity,
    weightSource,
  );

  return rows.map((r) => ({
    marketId: r.marketId,
    marketName: r.marketName,
    league: r.league,
    allocation: r.allocation,
    percentage: r.percentage,
    weightSource: mapWeightSource(r.weightSource),
  }));
}
