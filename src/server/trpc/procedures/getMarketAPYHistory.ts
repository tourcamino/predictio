import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getMarketAPYHistory = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      timeRange: z.enum(['7D', '30D', '90D', 'ALL']).default('30D'),
    })
  )
  .query(async ({ input }) => {
    const { marketId, timeRange } = input;

    // Map time range to days
    const daysMap = {
      '7D': 7,
      '30D': 30,
      '90D': 90,
      'ALL': 180,
    };
    
    const days = daysMap[timeRange];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Check if market exists
    const market = await db.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Market not found",
      });
    }

    // Get all LP positions for this market
    const positions = await db.liquidityPosition.findMany({
      where: {
        marketId,
      },
      include: {
        feeEarnings: {
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (positions.length === 0) {
      // No LP data yet, return empty history
      return {
        history: [],
        summary: {
          currentAPY: 0,
          startAPY: 0,
          avgAPY: 0,
          maxAPY: 0,
          minAPY: 0,
          apyChange: 0,
          apyChangePct: 0,
        },
      };
    }

    // Group fee earnings by day
    const feesByDay = new Map<string, { fees: number; volume: number }>();
    const poolSizeByDay = new Map<string, number>();

    positions.forEach(position => {
      position.feeEarnings.forEach(earning => {
        const dateKey = earning.createdAt.toISOString().slice(0, 10);
        const existing = feesByDay.get(dateKey) || { fees: 0, volume: 0 };
        feesByDay.set(dateKey, {
          fees: existing.fees + earning.amount,
          volume: existing.volume + earning.marketVolume,
        });
      });
    });

    // Generate daily history
    const history: Array<{
      timestamp: Date;
      apy: number;
      poolSize: number;
      volume24h: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().slice(0, 10);

      // Calculate pool size at this point in time
      const poolSize = positions
        .filter(p => p.createdAt <= date)
        .reduce((sum, p) => sum + p.depositedAmount, 0) || (market.totalLPPool || 0);

      const dayData = feesByDay.get(dateKey) || { fees: 0, volume: 0 };

      // Calculate APY for this day
      // APY = (daily fees / pool size) * 365 * 100
      const dailyReturn = poolSize > 0 ? dayData.fees / poolSize : 0;
      const apy = dailyReturn * 365 * 100;

      history.push({
        timestamp: date,
        apy: parseFloat(apy.toFixed(2)),
        poolSize: parseFloat(poolSize.toFixed(2)),
        volume24h: parseFloat(dayData.volume.toFixed(2)),
      });
    }

    // If we have no actual fee data, use current market data to estimate
    if (history.every(h => h.apy === 0)) {
      // Get recent transaction volume
      const recentVolume = await db.transaction.aggregate({
        where: {
          marketId,
          type: 'position_open',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          amount: true,
        },
      });

      const volume7d = recentVolume._sum.amount || 0;
      const avgDailyVolume = volume7d / 7;
      const estimatedDailyFees = avgDailyVolume * 0.01 * 0.7; // 1% fee, 70% to LPs
      const poolSize = market.totalLPPool || 1;
      const estimatedAPY = (estimatedDailyFees / poolSize) * 365 * 100;

      // Fill history with estimated APY
      history.forEach(h => {
        h.apy = parseFloat(estimatedAPY.toFixed(2));
        h.volume24h = avgDailyVolume;
      });
    }

    // Calculate summary statistics
    const apyValues = history.map(h => h.apy);
    const currentAPY = apyValues[apyValues.length - 1] || 0;
    const startAPY = apyValues[0] || 0;
    const avgAPY = apyValues.length > 0
      ? apyValues.reduce((sum, val) => sum + val, 0) / apyValues.length
      : 0;
    const maxAPY = apyValues.length > 0 ? Math.max(...apyValues) : 0;
    const minAPY = apyValues.length > 0 ? Math.min(...apyValues) : 0;
    const apyChange = currentAPY - startAPY;
    const apyChangePct = startAPY > 0 ? (apyChange / startAPY) * 100 : 0;

    return {
      history,
      summary: {
        currentAPY: parseFloat(currentAPY.toFixed(2)),
        startAPY: parseFloat(startAPY.toFixed(2)),
        avgAPY: parseFloat(avgAPY.toFixed(2)),
        maxAPY: parseFloat(maxAPY.toFixed(2)),
        minAPY: parseFloat(minAPY.toFixed(2)),
        apyChange: parseFloat(apyChange.toFixed(2)),
        apyChangePct: parseFloat(apyChangePct.toFixed(2)),
      },
    };
  });
