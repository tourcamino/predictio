import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getProtocolVaultStats = baseProcedure
  .input(z.object({}).optional())
  .query(async ({ input }) => {
    // Get all active LP positions across all markets
    const activePositions = await db.liquidityPosition.findMany({
      where: {
        status: 'active',
      },
    });

    const externalLPs = new Set(activePositions.map(p => p.userWallet)).size;
    const externalLPTotal = activePositions.reduce((sum, p) => sum + p.depositedAmount, 0);

    // Phase 0 seed capital (fixed)
    const seedCapital = 500;
    
    // Total liquidity = seed capital + external LPs
    const totalLiquidity = seedCapital + externalLPTotal;
    
    // Count active markets
    const activeMarkets = await db.market.findMany({
      where: {
        status: 'open',
      },
      select: {
        id: true,
        event: true,
        sport: true,
        league: true,
        volume: true,
        totalLPPool: true,
      },
    });

    const marketsActive = activeMarkets.length;
    
    // Calculate vault APY based on actual fees earned
    let vaultAPY: number | null = null;
    
    if (totalLiquidity > 0) {
      // Get fees earned in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const fees30d = await db.lPFeeEarning.aggregate({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const totalFees30d = fees30d._sum.amount || 0;
      
      if (totalFees30d > 0) {
        // APY = (fees30d / totalLiquidity) * 12 * 100
        const monthlyReturn = totalFees30d / totalLiquidity;
        vaultAPY = parseFloat((monthlyReturn * 12 * 100).toFixed(2));
      }
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

    // Calculate total volume across all active markets
    const totalVolume = activeMarkets.reduce((sum, m) => sum + m.volume, 0);
    
    // Calculate allocation per market based on volume
    const marketAllocations = activeMarkets
      .map(market => {
        const weight = totalVolume > 0 ? market.volume / totalVolume : 1 / activeMarkets.length;
        const allocation = totalLiquidity * weight;
        const percentage = weight * 100;
        
        return {
          marketId: market.id,
          marketName: market.event,
          league: market.league,
          sport: market.sport,
          sportEmoji: getSportEmoji(market.sport),
          allocation: Math.round(allocation * 100) / 100,
          percentage: Math.round(percentage * 100) / 100,
          volume: market.volume,
        };
      })
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, 10); // Top 10 markets
    
    return {
      totalLiquidity,
      seedCapital,
      externalLPs,
      externalLPTotal,
      marketsActive,
      vaultAPY,
      marketAllocations,
    };
  });
