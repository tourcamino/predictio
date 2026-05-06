import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getAnalystLeaderboard = baseProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      sortBy: z.enum(['roi', 'winRate', 'followers', 'earned']).default('earned'),
      currentUserWallet: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const { limit, sortBy, currentUserWallet } = input;
    
    // Determine sort field
    let orderBy: any = {};
    switch (sortBy) {
      case 'roi':
        orderBy = { roi: 'desc' };
        break;
      case 'winRate':
        orderBy = { winRate: 'desc' };
        break;
      case 'followers':
        orderBy = { followersCount: 'desc' };
        break;
      case 'earned':
      default:
        orderBy = { totalEarned: 'desc' };
        break;
    }
    
    // Get analysts with minimum thresholds to ensure quality
    const analysts = await db.analyst.findMany({
      where: {
        totalPredictions: { gte: 5 }, // At least 5 predictions
      },
      orderBy,
      take: limit,
    });
    
    // Add rank and check if current user
    const rankedLeaderboard = analysts.map((analyst, index) => ({
      ...analyst,
      rank: index + 1,
      isCurrentUser: currentUserWallet 
        ? analyst.wallet.toLowerCase() === currentUserWallet.toLowerCase() 
        : false,
    }));
    
    return {
      leaderboard: rankedLeaderboard,
      updatedAt: new Date(),
    };
  });
