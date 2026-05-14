import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getUserLPPositions = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      status: z.enum(['all', 'active', 'withdrawn']).default('active'),
      /** Client cache scope only — ignored for Prisma reads. */
      clientChainId: z.number().int(),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, status } = input;

    // Query LiquidityPosition table with relations
    const whereClause: any = {
      userWallet: walletAddress.toLowerCase(),
    };

    if (status !== 'all') {
      whereClause.status = status;
    }

    const positions = await db.liquidityPosition.findMany({
      where: whereClause,
      include: {
        feeEarnings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 30, // Last 30 fee earnings for history
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get market details for each position
    const marketsData = await db.market.findMany({
      where: {
        id: {
          in: positions.map(p => p.marketId),
        },
      },
      select: {
        id: true,
        event: true,
        sport: true,
        league: true,
      },
    });

    const marketsMap = new Map(marketsData.map(m => [m.id, m]));

    // Helper to get sport emoji
    const getSportEmoji = (sport: string): string => {
      const emojiMap: Record<string, string> = {
        football: '⚽',
        basketball: '🏀',
        baseball: '⚾',
        tennis: '🎾',
        mma: '🥊',
        f1: '🏎️',
        cricket: '🏏',
      };
      return emojiMap[sport.toLowerCase()] || '🏆';
    };

    // Calculate APY for each position
    const calculatePositionAPY = (position: any): number => {
      const daysHeld = Math.max(1, (Date.now() - position.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const dailyReturn = position.feesEarned / position.depositedAmount / daysHeld;
      return dailyReturn * 365 * 100; // Annualized
    };

    // Format positions
    const formattedPositions = positions.map(position => {
      const market = marketsMap.get(position.marketId);
      const sportEmoji = market ? getSportEmoji(market.sport) : '🏆';

      // Build fee history from last 7 days of earnings
      const feeHistory = position.feeEarnings
        .slice(0, 7)
        .map((earning, index) => {
          const cumulative = position.feeEarnings
            .slice(0, index + 1)
            .reduce((sum, e) => sum + e.amount, 0);
          
          return {
            date: earning.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            amount: earning.amount,
            cumulative,
          };
        })
        .reverse();

      return {
        id: position.id,
        marketId: position.marketId,
        marketName: market?.event || 'Unknown Market',
        sport: market?.sport || 'unknown',
        sportEmoji,
        league: market?.league || 'Unknown League',
        deposited: position.depositedAmount,
        currentValue: position.currentValue,
        poolShare: position.poolShare,
        feesEarned: position.feesEarned,
        feesPending: position.feesPending,
        apy: calculatePositionAPY(position),
        openSince: position.createdAt,
        status: position.status,
        feeHistory,
      };
    });

    // Calculate totals
    const totalValue = formattedPositions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalDeposited = formattedPositions.reduce((sum, p) => sum + p.deposited, 0);
    const totalFeesEarned = formattedPositions.reduce((sum, p) => sum + p.feesEarned, 0);
    const totalFeesPending = formattedPositions.reduce((sum, p) => sum + p.feesPending, 0);
    const avgAPY = formattedPositions.length > 0 
      ? formattedPositions.reduce((sum, p) => sum + p.apy, 0) / formattedPositions.length 
      : 0;

    return {
      positions: formattedPositions,
      summary: {
        totalValue,
        totalDeposited,
        totalPnL: totalValue - totalDeposited,
        totalPnLPct: totalDeposited > 0 ? ((totalValue - totalDeposited) / totalDeposited) * 100 : 0,
        totalFeesEarned,
        totalFeesPending,
        avgAPY,
        activePositions: formattedPositions.filter(p => p.status === 'active').length,
      },
    };
  });
