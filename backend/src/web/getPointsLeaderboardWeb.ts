import type { PrismaClient } from "@prisma/client";

export async function runGetPointsLeaderboardWeb(
  prisma: PrismaClient,
  input: { limit?: number; currentUserWallet?: string },
) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const currentUserWallet = input.currentUserWallet?.toLowerCase();

  const topUsers = await prisma.pointsTotal.findMany({
    where: { totalPoints: { gt: 0 } },
    orderBy: { totalPoints: "desc" },
    take: limit,
  });

  const leaderboard = await Promise.all(
    topUsers.map(async (pointsTotal, index) => {
      const user = await prisma.user.findUnique({
        where: { wallet: pointsTotal.walletAddress },
      });
      return {
        rank: index + 1,
        wallet: pointsTotal.walletAddress,
        tier: pointsTotal.tier,
        totalPoints: pointsTotal.totalPoints,
        tradesCount: user?.tradesCount || 0,
        isCurrentUser: currentUserWallet === pointsTotal.walletAddress,
      };
    }),
  );

  return {
    leaderboard,
    updatedAt: new Date().toISOString(),
    runtime: "express-vps" as const,
  };
}
