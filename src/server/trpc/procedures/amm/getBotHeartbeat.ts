import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

const OFFLINE_HEARTBEAT = {
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

export const getBotHeartbeat = baseProcedure
  .input(z.object({}).optional())
  .query(async () => {
    let heartbeat: Awaited<ReturnType<typeof db.botHeartbeat.findUnique>> = null;
    try {
      heartbeat = await db.botHeartbeat.findUnique({
        where: { id: 'singleton' },
      });
    } catch (err) {
      // DB unreachable in dev → surface a stable offline state instead of
      // throwing, which would cause the client to retry on a refetchInterval.
      console.warn('[getBotHeartbeat] DB unavailable, returning offline state:', err instanceof Error ? err.message : err);
      return OFFLINE_HEARTBEAT;
    }

    if (!heartbeat) {
      return OFFLINE_HEARTBEAT;
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
