import type { PrismaClient } from "@prisma/client";
import {
  calculateDailyEarningRate,
  calculateHoldingReward,
  getHoldingRewardRate,
} from "../lib/holdingRewards";

export async function runGetPortfolioSummaryWeb(
  prisma: PrismaClient,
  walletAddress: string,
) {
  const wallet = walletAddress.trim().toLowerCase();

  const allOrders = await prisma.order.findMany({ where: { wallet } });
  const openPositions = allOrders.filter((o) => o.status === "open");
  const resolvedPositions = allOrders.filter((o) => o.status === "resolved");
  const totalInvested = openPositions.reduce((sum, order) => sum + order.amount, 0);
  const resolvedPnL = resolvedPositions.reduce((sum, order) => sum + (order.pnl || 0), 0);
  const wonPositions = resolvedPositions.filter((o) => (o.pnl || 0) > 0);
  const lostPositions = resolvedPositions.filter((o) => (o.pnl || 0) < 0);
  const winRate =
    resolvedPositions.length > 0
      ? (wonPositions.length / resolvedPositions.length) * 100
      : 0;

  const ordersWithMarkets = await prisma.order.findMany({
    where: { wallet },
    include: { market: { select: { sport: true, marketType: true } } },
  });

  const sportStats = new Map<
    string,
    {
      volume: number;
      pnl: number;
      totalPositions: number;
      resolvedPositions: number;
      wonPositions: number;
    }
  >();

  for (const order of ordersWithMarkets) {
    const sport = order.market.sport;
    if (!sportStats.has(sport)) {
      sportStats.set(sport, {
        volume: 0,
        pnl: 0,
        totalPositions: 0,
        resolvedPositions: 0,
        wonPositions: 0,
      });
    }
    const stats = sportStats.get(sport)!;
    stats.totalPositions++;
    stats.volume += order.amount;
    if (order.status === "resolved") {
      stats.resolvedPositions++;
      stats.pnl += order.pnl || 0;
      if ((order.pnl || 0) > 0) stats.wonPositions++;
    }
  }

  const sportBreakdown = Array.from(sportStats.entries())
    .map(([sport, stats]) => ({
      sport,
      volume: stats.volume,
      pnl: stats.pnl,
      roi: stats.volume > 0 ? (stats.pnl / stats.volume) * 100 : 0,
      winRate:
        stats.resolvedPositions > 0
          ? (stats.wonPositions / stats.resolvedPositions) * 100
          : 0,
      totalPositions: stats.totalPositions,
      resolvedPositions: stats.resolvedPositions,
    }))
    .sort((a, b) => b.roi - a.roi);

  const deposits = await prisma.transaction.findMany({
    where: { wallet, type: "wallet_deposit", status: "completed" },
  });
  const withdrawals = await prisma.transaction.findMany({
    where: { wallet, type: "wallet_withdrawal", status: "completed" },
  });
  const totalDeposited = deposits.reduce((sum, tx) => sum + tx.amount, 0);
  const totalWithdrawn = withdrawals.reduce((sum, tx) => sum + tx.amount, 0);

  const openOrders = await prisma.order.findMany({
    where: { wallet, status: "open" },
  });

  let totalPendingRewards = 0;
  let longestHoldDays = 0;
  let bestHoldingRate = 0;
  const activeEarningPositions = openOrders.filter((order) => {
    if (!order.heldSince) return false;
    const hoursHeld = (Date.now() - order.heldSince.getTime()) / (1000 * 60 * 60);
    return hoursHeld >= 48;
  });

  const earningPositions = openOrders
    .map((order) => {
      if (!order.heldSince) return null;
      const hoursHeld = (Date.now() - order.heldSince.getTime()) / (1000 * 60 * 60);
      const daysHeld = hoursHeld / 24;
      const positionValue = (order.shares || 0) * (order.avgPrice || 0);
      const reward = calculateHoldingReward(positionValue, hoursHeld);
      const rewardRate = getHoldingRewardRate(hoursHeld);
      totalPendingRewards += reward;
      longestHoldDays = Math.max(longestHoldDays, daysHeld);
      if (rewardRate) bestHoldingRate = Math.max(bestHoldingRate, rewardRate.rate);
      return { value: positionValue, hoursHeld };
    })
    .filter(Boolean) as Array<{ value: number; hoursHeld: number }>;

  const dailyEarningRate = calculateDailyEarningRate(earningPositions);
  const user = await prisma.user.findUnique({
    where: { wallet },
    select: { claimedHoldingRewards: true },
  });
  const claimedRewards = user?.claimedHoldingRewards || 0;

  return {
    totalPositions: allOrders.length,
    openPositionsCount: openPositions.length,
    resolvedPositionsCount: resolvedPositions.length,
    totalInvested,
    resolvedPnL,
    wonPositions: wonPositions.length,
    lostPositions: lostPositions.length,
    winRate,
    totalDeposited,
    totalWithdrawn,
    sportBreakdown,
    marketTypeBreakdown: [],
    holdingRewards: {
      totalEarned: claimedRewards + totalPendingRewards,
      claimed: claimedRewards,
      pending: totalPendingRewards,
      longestHoldDays: Math.floor(longestHoldDays),
      bestHoldingRate,
      activeEarningPositions: activeEarningPositions.length,
      dailyEarningRate,
    },
    runtime: "express-vps" as const,
  };
}
