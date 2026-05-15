/**
 * Canonical vault exposure = CuratedEvent OPEN (same as GET /api/markets).
 * Read-only; used for catalog-debug liquidity coherence checks.
 */
import type { PrismaClient } from "@prisma/client";

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

function curatedMarketId(gameId: string): string {
  return `azuro-${gameId}`;
}

export async function resolveVaultCanonicalExposure(prisma: PrismaClient) {
  const curated = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    orderBy: [{ importanceScore: "desc" }, { startsAt: "asc" }],
    take: VAULT_CANONICAL_MARKET_CAP,
    select: {
      gameId: true,
      homeTeam: true,
      awayTeam: true,
      leagueName: true,
      importanceScore: true,
      status: true,
    },
  });

  const marketIds = curated.map((c) => curatedMarketId(c.gameId));
  const markets =
    marketIds.length > 0
      ? await prisma.market.findMany({
          where: { id: { in: marketIds } },
          select: { id: true, volume: true, event: true, status: true },
        })
      : [];

  const marketById = new Map(markets.map((m) => [m.id, m]));

  const slots: VaultExposureSlot[] = curated.map((c) => {
    const marketId = curatedMarketId(c.gameId);
    const m = marketById.get(marketId);
    return {
      marketId,
      gameId: c.gameId,
      marketName: m?.event ?? `${c.homeTeam} vs ${c.awayTeam}`,
      league: c.leagueName,
      importanceScore: c.importanceScore ?? 0,
      volume: m?.volume ?? 0,
    };
  });

  const totalCanonicalVolume = slots.reduce((s, x) => s + x.volume, 0);
  const allocationSource: VaultAllocationSource =
    totalCanonicalVolume >= MIN_TOTAL_VOLUME_FOR_VOLUME_WEIGHTS
      ? "real-market-volume"
      : "curated-appeal-fallback";

  return { slots, allocationSource, curatedOpenCount: curated.length };
}

export function buildVaultAllocationRows(
  slots: VaultExposureSlot[],
  allocationSource: VaultAllocationSource,
  totalLiquidity: number,
): VaultAllocationRow[] {
  if (slots.length === 0 || totalLiquidity <= 0) return [];

  const rawWeights = slots.map((slot) =>
    allocationSource === "real-market-volume"
      ? slot.volume
      : Math.max(0, slot.importanceScore),
  );

  let weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const useEqual = weightSum <= 0;
  if (useEqual) weightSum = slots.length;

  const rows = slots.map((slot, i) => {
    const weight = useEqual ? 1 / slots.length : rawWeights[i]! / weightSum;
    return {
      marketId: slot.marketId,
      marketName: slot.marketName,
      league: slot.league,
      allocation: Math.round(totalLiquidity * weight * 100) / 100,
      percentage: Math.round(weight * 100 * 100) / 100,
      weightSource: allocationSource,
    };
  });

  const sum = rows.reduce((s, r) => s + r.allocation, 0);
  const drift = Math.round((totalLiquidity - sum) * 100) / 100;
  if (rows.length > 0 && Math.abs(drift) >= 0.01) {
    rows[0] = {
      ...rows[0]!,
      allocation: Math.round((rows[0]!.allocation + drift) * 100) / 100,
    };
  }

  rows.sort((a, b) => b.allocation - a.allocation);
  return rows;
}
