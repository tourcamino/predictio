import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const updateVaultAlertThresholds = baseProcedure
  .input(
    z.object({
      minTvlThreshold: z.number().min(0).optional(),
      maxUtilizationRate: z.number().min(0).max(1).optional(), // 0-1 range (0-100%)
      minDailyFeesThreshold: z.number().min(0).optional(),
      alertsEnabled: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const updateData: any = {};

    if (input.minTvlThreshold !== undefined) {
      updateData.minTvlThreshold = input.minTvlThreshold;
    }

    if (input.maxUtilizationRate !== undefined) {
      updateData.maxUtilizationRate = input.maxUtilizationRate;
    }

    if (input.minDailyFeesThreshold !== undefined) {
      updateData.minDailyFeesThreshold = input.minDailyFeesThreshold;
    }

    if (input.alertsEnabled !== undefined) {
      updateData.alertsEnabled = input.alertsEnabled;
    }

    // Update config
    const config = await db.vaultAlertThresholds.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        minTvlThreshold: input.minTvlThreshold ?? 400,
        maxUtilizationRate: input.maxUtilizationRate ?? 0.85,
        minDailyFeesThreshold: input.minDailyFeesThreshold ?? 5,
        alertsEnabled: input.alertsEnabled ?? true,
      },
      update: updateData,
    });

    return {
      success: true,
      message: 'Alert thresholds updated successfully',
      config: {
        minTvlThreshold: config.minTvlThreshold,
        maxUtilizationRate: config.maxUtilizationRate,
        minDailyFeesThreshold: config.minDailyFeesThreshold,
        alertsEnabled: config.alertsEnabled,
      },
    };
  });
