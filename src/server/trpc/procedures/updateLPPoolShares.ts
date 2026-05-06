import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const updateLPPoolShares = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { marketId } = input;

    // Get all active LP positions for this market
    const activePositions = await db.liquidityPosition.findMany({
      where: {
        marketId,
        status: 'active',
      },
    });

    if (activePositions.length === 0) {
      return {
        updated: 0,
        totalPoolSize: 0,
      };
    }

    // Calculate total pool size
    const totalPoolSize = activePositions.reduce((sum, pos) => sum + pos.depositedAmount, 0);

    // Update each position's pool share
    let updated = 0;
    for (const position of activePositions) {
      const newPoolShare = totalPoolSize > 0 ? position.depositedAmount / totalPoolSize : 0;
      
      await db.liquidityPosition.update({
        where: { id: position.id },
        data: {
          poolShare: newPoolShare,
        },
      });
      
      updated++;
    }

    // Update market's total LP pool
    await db.market.update({
      where: { id: marketId },
      data: {
        totalLPPool: totalPoolSize,
      },
    });

    console.log(`[LP Pool Shares] Updated ${updated} positions in market ${marketId}, total pool: $${totalPoolSize.toFixed(2)}`);

    return {
      updated,
      totalPoolSize,
    };
  });
