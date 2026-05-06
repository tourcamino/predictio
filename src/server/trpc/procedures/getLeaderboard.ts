import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getLeaderboard = baseProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      currentUserWallet: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const { limit, currentUserWallet } = input;
    
    // Get all users with their order statistics
    const users = await db.user.findMany({
      select: {
        wallet: true,
        virtualBalance: true,
        totalPnl: true,
        tradesCount: true,
        wins: true,
        losses: true,
        totalVolume: true,
      },
      orderBy: {
        totalPnl: 'desc',
      },
      take: limit,
    });
    
    // Calculate unrealized P&L for each user
    const leaderboardWithPnL = await Promise.all(
      users.map(async (user) => {
        // Get open positions
        const openOrders = await db.order.findMany({
          where: {
            wallet: user.wallet,
            status: 'open',
          },
          include: {
            market: {
              select: {
                outcomes: true,
              },
            },
          },
        });
        
        // Calculate unrealized P&L from open positions
        let unrealizedPnL = 0;
        openOrders.forEach(order => {
          const shares = order.shares || 0;
          const avgPrice = order.avgPrice || 0;
          const costBasis = shares * avgPrice;
          
          // Get current price from market outcomes
          let currentPrice = avgPrice;
          if (order.market.outcomes && typeof order.market.outcomes === 'object') {
            const outcomes = order.market.outcomes as any;
            if (order.outcome === 'YES' && outcomes.yesPrice) {
              currentPrice = outcomes.yesPrice;
            } else if (order.outcome === 'NO' && outcomes.noPrice) {
              currentPrice = outcomes.noPrice;
            }
          }
          
          const currentValue = shares * currentPrice;
          unrealizedPnL += (currentValue - costBasis);
        });
        
        // Get resolved P&L
        const resolvedOrders = await db.order.findMany({
          where: {
            wallet: user.wallet,
            status: 'resolved',
          },
          select: {
            pnl: true,
          },
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
      })
    );
    
    // Sort by total P&L
    leaderboardWithPnL.sort((a, b) => b.totalPnl - a.totalPnl);
    
    // Add rank
    const rankedLeaderboard = leaderboardWithPnL.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isCurrentUser: currentUserWallet ? entry.wallet.toLowerCase() === currentUserWallet.toLowerCase() : false,
    }));
    
    return {
      leaderboard: rankedLeaderboard,
      updatedAt: new Date(),
    };
  });
