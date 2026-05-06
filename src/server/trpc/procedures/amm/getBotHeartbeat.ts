import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getBotHeartbeat = baseProcedure
  .input(z.object({}).optional())
  .query(async ({ input }) => {
    const heartbeat = await db.botHeartbeat.findUnique({
      where: { id: 'singleton' },
    });

    if (!heartbeat) {
      // Return default offline state if no heartbeat exists
      return {
        status: 'OFFLINE' as const,
        lastRun: null,
        nextRun: null,
        marketsProcessed: 0,
        ordersPlaced: 0,
        rebalancesDone: 0,
        errorMessage: null,
        isStale: true,
        secondsSinceLastRun: null,
      };
    }

    // Calculate if heartbeat is stale (>2 minutes since last run)
    const now = new Date();
    const secondsSinceLastRun = Math.floor(
      (now.getTime() - heartbeat.lastRun.getTime()) / 1000
    );
    const isStale = secondsSinceLastRun > 120; // 2 minutes

    return {
      status: isStale ? 'OFFLINE' as const : heartbeat.status,
      lastRun: heartbeat.lastRun,
      nextRun: heartbeat.nextRun,
      marketsProcessed: heartbeat.marketsProcessed,
      ordersPlaced: heartbeat.ordersPlaced,
      rebalancesDone: heartbeat.rebalancesDone,
      errorMessage: heartbeat.errorMessage,
      isStale,
      secondsSinceLastRun,
    };
  });
