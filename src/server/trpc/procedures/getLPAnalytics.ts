import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { calculateConcentrationRisk } from "~/utils/lpUtils";

export const getLPAnalytics = baseProcedure
  .input(
    z.object({
      timeRange: z.enum(['day', 'week', 'month', 'all']).default('month'),
    })
  )
  .query(async ({ input }) => {
    const { timeRange } = input;

    // Calculate time threshold
    const now = new Date();
    const timeThresholds = {
      day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      all: new Date(0),
    };
    const threshold = timeThresholds[timeRange];

    // Get active LP positions
    const activePositions = await db.liquidityPosition.findMany({
      where: {
        status: 'active',
      },
    });

    const activeLPs = new Set(activePositions.map(p => p.userWallet)).size;
    const totalDeposited = activePositions.reduce((sum, p) => sum + p.depositedAmount, 0);

    // Get fees distributed in the time range
    const feesDistributed = await db.lPFeeEarning.aggregate({
      where: {
        createdAt: {
          gte: threshold,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const feesDistributedAmount = feesDistributed._sum.amount || 0;

    // Calculate average APY across all positions
    let avgAPY = 0;
    if (activePositions.length > 0) {
      const apys = activePositions.map(position => {
        const daysHeld = Math.max(1, (Date.now() - position.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const dailyReturn = position.feesEarned / position.depositedAmount / daysHeld;
        return dailyReturn * 365 * 100;
      });
      avgAPY = apys.reduce((sum, apy) => sum + apy, 0) / apys.length;
    }

    // Find largest LP
    const largestLP = activePositions.length > 0
      ? Math.max(...activePositions.map(p => p.depositedAmount))
      : 0;

    const largestLPPct = totalDeposited > 0 ? (largestLP / totalDeposited) * 100 : 0;

    // Calculate concentration risk
    const concentrationRisk = calculateConcentrationRisk(largestLP, totalDeposited);

    // Additional metrics
    const avgDepositSize = activeLPs > 0 ? totalDeposited / activeLPs : 0;

    // Get top 3 LPs
    const sortedPositions = [...activePositions].sort((a, b) => b.depositedAmount - a.depositedAmount);
    const topLPsTotal = sortedPositions.slice(0, 3).reduce((sum, p) => sum + p.depositedAmount, 0);
    const topLPsPct = totalDeposited > 0 ? (topLPsTotal / totalDeposited) * 100 : 0;

    // Calculate median deposit size
    let medianDepositSize = 0;
    if (activePositions.length > 0) {
      const sorted = [...activePositions].sort((a, b) => a.depositedAmount - b.depositedAmount);
      const mid = Math.floor(sorted.length / 2);
      medianDepositSize =
        sorted.length % 2 === 0
          ? ((sorted[mid - 1]?.depositedAmount ?? 0) +
              (sorted[mid]?.depositedAmount ?? 0)) /
            2
          : (sorted[mid]?.depositedAmount ?? 0);
    }

    return {
      activeLPs,
      totalDeposited,
      feesDistributed30d: timeRange === 'month' ? feesDistributedAmount : 0,
      avgAPY,
      largestLP,
      largestLPPct,
      concentrationRisk,
      avgDepositSize,
      medianDepositSize,
      topLPsTotal,
      topLPsPct,
    };
  });
