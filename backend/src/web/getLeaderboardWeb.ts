import type { PrismaClient } from "@prisma/client";

export async function runGetLeaderboardWeb(
  prisma: PrismaClient,
  input: { limit?: number; currentUserWallet?: string },
) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const currentUserWallet = input.currentUserWallet?.toLowerCase();

  const users = await prisma.user.findMany({
    select: {
      wallet: true,
      virtualBalance: true,
      totalPnl: true,
      tradesCount: true,
      wins: true,
      losses: true,
      totalVolume: true,
    },
    orderBy: { totalPnl: "desc" },
    take: limit,
  });

  const leaderboardWithPnL = await Promise.all(
    users.map(async (user) => {
      const openOrders = await prisma.order.findMany({
        where: { wallet: user.wallet, status: "open" },
        include: { market: { select: { outcomes: true } } },
      });

      let unrealizedPnL = 0;
      openOrders.forEach((order) => {
        const shares = order.shares || 0;
        const avgPrice = order.avgPrice || 0;
        const costBasis = shares * avgPrice;
        let currentPrice = avgPrice;
        if (order.market.outcomes && typeof order.market.outcomes === "object") {
          const outcomes = order.market.outcomes as Record<string, number>;
          if (order.outcome === "YES" && outcomes.yesPrice) {
            currentPrice = outcomes.yesPrice;
          } else if (order.outcome === "NO" && outcomes.noPrice) {
            currentPrice = outcomes.noPrice;
          }
        }
        unrealizedPnL += shares * currentPrice - costBasis;
      });

      const resolvedOrders = await prisma.order.findMany({
        where: { wallet: user.wallet, status: "resolved" },
        select: { pnl: true },
      });
      const realizedPnL = resolvedOrders.reduce((sum, order) => sum + (order.pnl || 0), 0);
      const totalPnL = realizedPnL + unrealizedPnL;
      const totalTrades = user.wins + user.losses;
      const winRate = totalTrades > 0 ? (user.wins / totalTrades) * 100 : 0;

      return {
        wallet: user.wallet,
        virtualBalance: user.virtualBalance,
        totalPnl: totalPnL,
        realizedPnl: realizedPnL,
        unrealizedPnl: unrealizedPnL,
        tradesCount: user.tradesCount,
        wins: user.wins,
        losses: user.losses,
        winRate,
        totalVolume: user.totalVolume,
      };
    }),
  );

  leaderboardWithPnL.sort((a, b) => b.totalPnl - a.totalPnl);

  const rankedLeaderboard = leaderboardWithPnL.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isCurrentUser: currentUserWallet
      ? entry.wallet.toLowerCase() === currentUserWallet
      : false,
  }));

  return {
    leaderboard: rankedLeaderboard,
    updatedAt: new Date().toISOString(),
    runtime: "express-vps" as const,
  };
}
