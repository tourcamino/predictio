import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getLPMarkets = baseProcedure
  .input(
    z.object({
      walletAddress: z.string().optional(),
      status: z.enum(['all', 'open', 'closed']).default('open'),
    })
  )
  .query(async ({ input }) => {
    const { walletAddress, status } = input;

    // Query markets with LP pools
    const whereClause: any = {};

    if (status === 'open') {
      whereClause.status = 'open';
      whereClause.closesAt = { gt: new Date() };
    } else if (status === 'closed') {
      whereClause.status = { in: ['closed', 'resolved'] };
    }

    const markets = await db.market.findMany({
      where: whereClause,
      select: {
        id: true,
        event: true,
        sport: true,
        league: true,
        volume: true,
        totalLPPool: true,
        closesAt: true,
        status: true,
        tags: true,
      },
      orderBy: {
        totalLPPool: 'desc',
      },
    });

    // Get user's LP positions if wallet is provided
    let userPositions: Map<string, any> = new Map();
    if (walletAddress) {
      const positions = await db.liquidityPosition.findMany({
        where: {
          userWallet: walletAddress.toLowerCase(),
          status: 'active',
        },
      });
      userPositions = new Map(positions.map(p => [p.marketId, p]));
    }

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

    // Calculate risk level
    const calculateRisk = (poolSize: number, volume24h: number): 'low' | 'medium' | 'high' => {
      if (poolSize > 50000 && volume24h > 5000) return 'low';
      if (poolSize > 10000) return 'medium';
      return 'high';
    };

    // Calculate APY for a market
    const calculateMarketAPY = async (marketId: string, poolSize: number): Promise<number> => {
      if (poolSize === 0) return 0;

      // Get fees earned in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const fees = await db.lPFeeEarning.aggregate({
        where: {
          position: {
            marketId,
          },
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const fees30d = fees._sum.amount || 0;
      
      // APY = (fees30d / poolSize) * 12 * 100
      // Note: LPs already get 70% of fees, so no need to multiply by 0.7 again
      const monthlyReturn = fees30d / poolSize;
      return monthlyReturn * 12 * 100;
    };

    // Get 24h volume for each market
    const get24hVolume = async (marketId: string): Promise<number> => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const volume = await db.transaction.aggregate({
        where: {
          marketId,
          type: 'position_open',
          createdAt: {
            gte: oneDayAgo,
          },
        },
        _sum: {
          amount: true,
        },
      });

      return volume._sum.amount || 0;
    };

    // Format markets
    const formattedMarkets = await Promise.all(
      markets.map(async (market) => {
        const poolSize = market.totalLPPool || 0;
        const volume24h = await get24hVolume(market.id);
        const apy = await calculateMarketAPY(market.id, poolSize);
        const risk = calculateRisk(poolSize, volume24h);
        const sportEmoji = getSportEmoji(market.sport);

        const userPosition = userPositions.get(market.id);

        return {
          id: market.id,
          name: market.event,
          sport: market.sport,
          sportEmoji,
          league: market.league,
          poolSize,
          apy,
          volume24h,
          risk,
          myShare: userPosition ? userPosition.poolShare : null,
          myDeposit: userPosition ? userPosition.depositedAmount : null,
          myValue: userPosition ? userPosition.currentValue : null,
          feesEarned: userPosition ? userPosition.feesEarned : null,
          feesPending: userPosition ? userPosition.feesPending : null,
          closesAt: market.closesAt,
          status: market.status,
        };
      })
    );

    return {
      markets: formattedMarkets,
      totalMarkets: formattedMarkets.length,
    };
  });
