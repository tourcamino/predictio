import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getPointsLeaderboard = baseProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      currentUserWallet: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const { limit, currentUserWallet } = input;

    // Get top users by points
    const topUsers = await db.pointsTotal.findMany({
      where: {
        totalPoints: {
          gt: 0,
        },
      },
      orderBy: {
        totalPoints: "desc",
      },
      take: limit,
    });

    // Get user stats for each
    const leaderboard = await Promise.all(
      topUsers.map(async (pointsTotal, index) => {
        const user = await db.user.findUnique({
          where: { wallet: pointsTotal.walletAddress },
        });

        return {
          rank: index + 1,
          wallet: pointsTotal.walletAddress,
          tier: pointsTotal.tier,
          totalPoints: pointsTotal.totalPoints,
          tradesCount: user?.tradesCount || 0,
          isCurrentUser:
            currentUserWallet?.toLowerCase() === pointsTotal.walletAddress,
        };
      })
    );

    return {
      leaderboard,
      updatedAt: new Date().toISOString(),
    };
  });
