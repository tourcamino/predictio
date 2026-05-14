import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  copySeedRecentTradesByWallet,
  mockAnalysts,
} from "~/data/mockAffiliates";

type ResolvedLike = {
  status: string;
  resolvedAt: Date | null;
  shares: number | null;
  avgPrice: number | null;
  pnl: number | null;
};

function aggregatePerformanceFromResolved(resolvedOrders: ResolvedLike[]) {
  const dailyData = new Map<
    string,
    {
      date: Date;
      trades: number;
      wins: number;
      volume: number;
      pnl: number;
      cumulativePnl: number;
    }
  >();

  let cumulativePnl = 0;
  let totalVolume = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;
  let largestWin = 0;
  let largestLoss = 0;

  resolvedOrders.forEach((order) => {
    const dateKey = order.resolvedAt!.toISOString().slice(0, 10);
    const costBasis = (order.shares || 0) * (order.avgPrice || 0);
    const pnl = order.pnl || 0;
    const isWin = pnl > 0;

    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        date: new Date(dateKey),
        trades: 0,
        wins: 0,
        volume: 0,
        pnl: 0,
        cumulativePnl: 0,
      });
    }

    const dayData = dailyData.get(dateKey)!;
    dayData.trades++;
    if (isWin) dayData.wins++;
    dayData.volume += costBasis;
    dayData.pnl += pnl;

    cumulativePnl += pnl;
    totalVolume += costBasis;

    if (isWin) {
      winningTrades++;
      totalWinAmount += pnl;
      largestWin = Math.max(largestWin, pnl);
    } else {
      losingTrades++;
      totalLossAmount += Math.abs(pnl);
      largestLoss = Math.min(largestLoss, pnl);
    }

    dayData.cumulativePnl = cumulativePnl;
  });

  const sortedDates = Array.from(dailyData.keys()).sort();
  const pnlHistory: Array<{ date: Date; pnl: number; cumulativePnl: number }> =
    [];
  const winRateHistory: Array<{
    date: Date;
    winRate: number;
    trades: number;
  }> = [];
  const roiHistory: Array<{ date: Date; roi: number }> = [];
  const volumeHistory: Array<{ date: Date; volume: number }> = [];

  let runningCumulativePnl = 0;
  let runningTotalInvested = 0;

  sortedDates.forEach((dateKey) => {
    const data = dailyData.get(dateKey)!;
    runningCumulativePnl = data.cumulativePnl;
    runningTotalInvested += data.volume;

    pnlHistory.push({
      date: data.date,
      pnl: data.pnl,
      cumulativePnl: data.cumulativePnl,
    });

    winRateHistory.push({
      date: data.date,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      trades: data.trades,
    });

    roiHistory.push({
      date: data.date,
      roi:
        runningTotalInvested > 0
          ? (runningCumulativePnl / runningTotalInvested) * 100
          : 0,
    });

    volumeHistory.push({
      date: data.date,
      volume: data.volume,
    });
  });

  const avgWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0;

  return {
    pnlHistory,
    winRateHistory,
    roiHistory,
    volumeHistory,
    profitDistribution: {
      wins: winningTrades,
      losses: losingTrades,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
    },
    summary: {
      totalTrades: resolvedOrders.length,
      winningTrades,
      losingTrades,
      totalVolume,
      totalPnL: cumulativePnl,
      avgRoi: totalVolume > 0 ? (cumulativePnl / totalVolume) * 100 : 0,
      avgWinRate:
        resolvedOrders.length > 0
          ? (winningTrades / resolvedOrders.length) * 100
          : 0,
    },
  };
}

const emptyPayload = {
  pnlHistory: [] as Array<{ date: Date; pnl: number; cumulativePnl: number }>,
  winRateHistory: [] as Array<{
    date: Date;
    winRate: number;
    trades: number;
  }>,
  roiHistory: [] as Array<{ date: Date; roi: number }>,
  volumeHistory: [] as Array<{ date: Date; volume: number }>,
  profitDistribution: {
    wins: 0,
    losses: 0,
    avgWin: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
  },
  summary: {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalVolume: 0,
    totalPnL: 0,
    avgRoi: 0,
    avgWinRate: 0,
  },
};

export const getTraderPerformanceHistory = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      timeRange: z.enum(["7d", "30d", "90d", "1y", "all"]).default("90d"),
    }),
  )
  .query(async ({ input }) => {
    const { walletAddress, timeRange } = input;

    const now = new Date();
    let startDate: Date | undefined;

    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        startDate = undefined;
    }

    const maxDaysAgo =
      timeRange === "7d"
        ? 7
        : timeRange === "30d"
          ? 30
          : timeRange === "90d"
            ? 90
            : timeRange === "1y"
              ? 365
              : 99999;

    const walletLower = walletAddress.toLowerCase();
    const profile = mockAnalysts.find(
      (m) => m.wallet.toLowerCase() === walletLower,
    );
    const sportAllow = profile?.sport.map((s) => s.toLowerCase());

    const allOrders = await db.order.findMany({
      where: {
        wallet: walletLower,
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      include: {
        market: {
          select: {
            id: true,
            event: true,
            sport: true,
            league: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    let ordersForMetrics = allOrders;
    if (sportAllow?.length) {
      ordersForMetrics = allOrders.filter((o) =>
        sportAllow.includes(o.market.sport.toLowerCase()),
      );
    }

    let resolvedOrders: ResolvedLike[] = ordersForMetrics.filter(
      (o) => o.status === "resolved" && o.resolvedAt,
    ) as ResolvedLike[];

    if (resolvedOrders.length === 0 && profile) {
      const raw = copySeedRecentTradesByWallet[walletLower] ?? [];
      const filtered = raw
        .filter((r) => r.daysAgo <= maxDaysAgo)
        .filter((r) => {
          const sp = (r.sport ?? "Football").toLowerCase();
          return !sportAllow?.length || sportAllow.includes(sp);
        })
        .sort((a, b) => b.daysAgo - a.daysAgo);

      const t0 = Date.now();
      resolvedOrders = filtered.map((r, i) => ({
        status: "resolved",
        resolvedAt: new Date(t0 - r.daysAgo * 86400000 + i * 1000),
        shares: 1,
        avgPrice: r.stakeUsd,
        pnl: r.profitUsd,
      }));
    }

    if (resolvedOrders.length === 0) {
      return emptyPayload;
    }

    return aggregatePerformanceFromResolved(resolvedOrders);
  });
