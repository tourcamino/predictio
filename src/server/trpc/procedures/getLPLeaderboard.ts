import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getLPLeaderboard = baseProcedure
  .input(
    z.object({
      limit: z.number().default(50),
      sortBy: z.enum(['deposits', 'fees']).default('fees'),
      currentUserWallet: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const { limit, sortBy, currentUserWallet } = input;

    // Get all active LP positions
    const positions = await db.liquidityPosition.findMany({
      where: {
        status: 'active',
      },
      include: {
        feeEarnings: true,
      },
    });

    // Aggregate by wallet
    const walletStats = new Map<string, {
      wallet: string;
      totalDeposits: number;
      totalValue: number;
      totalFeesEarned: number;
      positionsCount: number;
      avgAPY: number;
    }>();

    for (const position of positions) {
      const wallet = position.userWallet.toLowerCase();
      const existing = walletStats.get(wallet) || {
        wallet,
        totalDeposits: 0,
        totalValue: 0,
        totalFeesEarned: 0,
        positionsCount: 0,
        avgAPY: 0,
      };

      // Calculate APY for this position
      const daysHeld = Math.max(1, (Date.now() - position.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const dailyReturn = position.feesEarned / position.depositedAmount / daysHeld;
      const apy = dailyReturn * 365 * 100;

      existing.totalDeposits += position.depositedAmount;
      existing.totalValue += position.currentValue;
      existing.totalFeesEarned += position.feesEarned;
      existing.positionsCount += 1;
      existing.avgAPY = ((existing.avgAPY * (existing.positionsCount - 1)) + apy) / existing.positionsCount;

      walletStats.set(wallet, existing);
    }

    // Convert to array and sort
    const leaderboard = Array.from(walletStats.values());

    if (sortBy === 'deposits') {
      leaderboard.sort((a, b) => b.totalDeposits - a.totalDeposits);
    } else {
      leaderboard.sort((a, b) => b.totalFeesEarned - a.totalFeesEarned);
    }

    // Add rankings
    const rankedLeaderboard = leaderboard.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      wallet: entry.wallet,
      totalDeposits: entry.totalDeposits,
      totalValue: entry.totalValue,
      totalFeesEarned: entry.totalFeesEarned,
      totalPnL: entry.totalValue - entry.totalDeposits,
      totalPnLPct: entry.totalDeposits > 0 ? ((entry.totalValue - entry.totalDeposits) / entry.totalDeposits) * 100 : 0,
      positionsCount: entry.positionsCount,
      avgAPY: entry.avgAPY,
      isCurrentUser: currentUserWallet ? entry.wallet === currentUserWallet.toLowerCase() : false,
    }));

    // Find current user's rank if not in top limit
    let currentUserRank = null;
    if (currentUserWallet) {
      const normalizedWallet = currentUserWallet.toLowerCase();
      const userIndex = leaderboard.findIndex(entry => entry.wallet === normalizedWallet);
      if (userIndex >= 0 && userIndex >= limit) {
        const userEntry = leaderboard[userIndex];
        if (userEntry) {
          currentUserRank = {
            rank: userIndex + 1,
            wallet: userEntry.wallet,
            totalDeposits: userEntry.totalDeposits,
            totalValue: userEntry.totalValue,
            totalFeesEarned: userEntry.totalFeesEarned,
            totalPnL: userEntry.totalValue - userEntry.totalDeposits,
            totalPnLPct:
              userEntry.totalDeposits > 0
                ? ((userEntry.totalValue - userEntry.totalDeposits) /
                    userEntry.totalDeposits) *
                  100
                : 0,
            positionsCount: userEntry.positionsCount,
            avgAPY: userEntry.avgAPY,
            isCurrentUser: true,
          };
        }
      }
    }

    return {
      leaderboard: rankedLeaderboard,
      currentUserRank,
      totalLPs: walletStats.size,
      updatedAt: new Date().toISOString(),
    };
  });
