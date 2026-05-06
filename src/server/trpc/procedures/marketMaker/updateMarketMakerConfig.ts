import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const updateMarketMakerConfig = baseProcedure
  .input(
    z.object({
      targetSpread: z.number().min(0.001).max(0.1).optional(), // 0.1% to 10%
      maxExposurePerMarket: z.number().min(100).max(50000).optional(), // $100 to $50k
      rebalanceIntervalMinutes: z.number().int().min(5).max(1440).optional(), // 5 min to 24 hours
      minLiquidity: z.number().min(100).max(10000).optional(),
      enabledMarkets: z.array(z.string()).optional(), // Array of market IDs
    })
  )
  .mutation(async ({ input }) => {
    const updateData: any = {};

    if (input.targetSpread !== undefined) {
      updateData.targetSpread = input.targetSpread;
    }

    if (input.maxExposurePerMarket !== undefined) {
      updateData.maxExposurePerMarket = input.maxExposurePerMarket;
    }

    if (input.rebalanceIntervalMinutes !== undefined) {
      updateData.rebalanceIntervalMs = input.rebalanceIntervalMinutes * 60000;
    }

    if (input.minLiquidity !== undefined) {
      updateData.minLiquidity = input.minLiquidity;
    }

    if (input.enabledMarkets !== undefined) {
      updateData.enabledMarkets = input.enabledMarkets;
    }

    // Update config
    const config = await db.marketMakerConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        targetSpread: input.targetSpread || 0.02,
        maxExposurePerMarket: input.maxExposurePerMarket || 5000,
        rebalanceIntervalMs: (input.rebalanceIntervalMinutes || 30) * 60000,
        minLiquidity: input.minLiquidity || 500,
        enabledMarkets: input.enabledMarkets || [],
      },
      update: updateData,
    });

    return {
      success: true,
      message: 'Market maker configuration updated successfully',
      config: {
        targetSpread: config.targetSpread,
        maxExposurePerMarket: config.maxExposurePerMarket,
        rebalanceIntervalMinutes: Math.round(config.rebalanceIntervalMs / 60000),
        minLiquidity: config.minLiquidity,
        enabledMarkets: Array.isArray(config.enabledMarkets) ? config.enabledMarkets as string[] : [],
      },
    };
  });
