import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getMarketMakerConfig = baseProcedure
  .input(z.object({}).optional())
  .query(async ({ input }) => {
    // Get or create config
    const config = await db.marketMakerConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        targetSpread: 0.02,
        maxExposurePerMarket: 5000,
        rebalanceIntervalMs: 1800000,
        minLiquidity: 500,
        enabledMarkets: [],
      },
      update: {},
    });

    // Parse enabled markets
    const enabledMarkets = Array.isArray(config.enabledMarkets) 
      ? config.enabledMarkets as string[]
      : [];

    return {
      targetSpread: config.targetSpread,
      maxExposurePerMarket: config.maxExposurePerMarket,
      rebalanceIntervalMs: config.rebalanceIntervalMs,
      minLiquidity: config.minLiquidity,
      enabledMarkets,
      rebalanceIntervalMinutes: Math.round(config.rebalanceIntervalMs / 60000),
    };
  });
