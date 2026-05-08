import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getVaultAllocations = baseProcedure
  .input(z.object({}).optional())
  .query(async () => {
    try {
      return await computeVaultAllocations();
    } catch (err) {
      console.warn(
        '[getVaultAllocations] DB error, returning empty allocations:',
        err instanceof Error ? err.message : err,
      );
      return { allocations: [] };
    }
  });

async function computeVaultAllocations() {
  let vaultState: Awaited<ReturnType<typeof db.vaultState.findUnique>> = null;
  try {
    vaultState = await db.vaultState.findUnique({
      where: { id: 'singleton' },
    });
  } catch (err) {
    console.warn('[getVaultAllocations] DB unavailable:', err instanceof Error ? err.message : err);
    return { allocations: [] };
  }

  if (!vaultState) {
    return { allocations: [] };
  }

  const activeMarkets = await db.market.findMany({
    where: {
      status: 'open',
    },
    select: {
      id: true,
      event: true,
      sport: true,
      league: true,
      volume: true,
    },
  });

  if (activeMarkets.length === 0) {
    return { allocations: [] };
  }

  const totalVolume = activeMarkets.reduce((sum, m) => sum + m.volume, 0);

  const existingAllocations = await db.vaultAllocation.findMany();
  const allocationMap = new Map(
    existingAllocations.map(a => [a.marketId, a])
  );

  const allocations = await Promise.all(
    activeMarkets.map(async (market) => {
      const weight = totalVolume > 0
        ? market.volume / totalVolume
        : 1 / activeMarkets.length;

      const allocatedUsdc = vaultState.totalTvl * weight;
      const percentage = weight * 100;
      const maxCap = vaultState.totalTvl * 0.30;

      const existing = allocationMap.get(market.id);
      let currentExposure = existing?.currentExposure || 0;

      if (!existing) {
        const activeOrders = await db.ammOrder.findMany({
          where: {
            marketId: market.id,
            status: 'ACTIVE',
          },
        });
        currentExposure = activeOrders.reduce((sum, o) => sum + o.size, 0);
      }

      await db.vaultAllocation.upsert({
        where: { marketId: market.id },
        create: {
          marketId: market.id,
          allocatedUsdc,
          percentage,
          maxCap,
          currentExposure,
        },
        update: {
          allocatedUsdc,
          percentage,
          maxCap,
        },
      });

      return {
        marketId: market.id,
        marketName: market.event,
        sport: market.sport,
        league: market.league,
        allocatedUsdc: Math.round(allocatedUsdc * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        maxCap: Math.round(maxCap * 100) / 100,
        currentExposure: Math.round(currentExposure * 100) / 100,
        availableToAllocate: Math.max(0, maxCap - currentExposure),
        utilizationRate: maxCap > 0 ? (currentExposure / maxCap) * 100 : 0,
      };
    })
  );

  allocations.sort((a, b) => b.allocatedUsdc - a.allocatedUsdc);

  return {
    totalTvl: vaultState.totalTvl,
    allocations,
  };
}
