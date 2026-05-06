import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const updateBotHeartbeat = baseProcedure
  .input(
    z.object({
      status: z.enum(['ONLINE', 'OFFLINE', 'ERROR']),
      marketsProcessed: z.number().int().nonnegative(),
      ordersPlaced: z.number().int().nonnegative(),
      rebalancesDone: z.number().int().nonnegative(),
      errorMessage: z.string().optional(),
      nextRunIn: z.number().int().optional(), // seconds until next run
    })
  )
  .mutation(async ({ input }) => {
    const now = new Date();
    const nextRun = input.nextRunIn 
      ? new Date(now.getTime() + input.nextRunIn * 1000)
      : null;

    // Upsert bot heartbeat
    const heartbeat = await db.botHeartbeat.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        status: input.status,
        lastRun: now,
        nextRun,
        marketsProcessed: input.marketsProcessed,
        ordersPlaced: input.ordersPlaced,
        rebalancesDone: input.rebalancesDone,
        errorMessage: input.errorMessage,
      },
      update: {
        status: input.status,
        lastRun: now,
        nextRun,
        marketsProcessed: input.marketsProcessed,
        ordersPlaced: input.ordersPlaced,
        rebalancesDone: input.rebalancesDone,
        errorMessage: input.errorMessage,
      },
    });

    return {
      success: true,
      status: heartbeat.status,
      lastRun: heartbeat.lastRun,
    };
  });
