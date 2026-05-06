import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getVaultAlertThresholds = baseProcedure
  .input(z.object({}).optional())
  .query(async ({ input }) => {
    // Get or create alert thresholds config
    const config = await db.vaultAlertThresholds.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        minTvlThreshold: 400, // Alert if TVL falls below $400
        maxUtilizationRate: 0.85, // Alert if utilization exceeds 85%
        minDailyFeesThreshold: 5, // Alert if daily fees fall below $5
        alertsEnabled: true,
      },
      update: {},
    });

    return {
      minTvlThreshold: config.minTvlThreshold,
      maxUtilizationRate: config.maxUtilizationRate,
      minDailyFeesThreshold: config.minDailyFeesThreshold,
      alertsEnabled: config.alertsEnabled,
      lastAlertSent: config.lastAlertSent,
    };
  });
