/**
 * Retire stale/orphan markets from active catalog (PR16).
 * Does NOT force settlement — closes untradable rows so UI reflects reality.
 */
import type { PrismaClient } from "@prisma/client";

const PAST_KICKOFF_CLOSE_MS = 6 * 60 * 60 * 1000;
const STALE_OPEN_CURATED_MS = 24 * 60 * 60 * 1000;
const FAR_FUTURE_MS = 30 * 24 * 60 * 60 * 1000;

export type StaleRetirementResult = {
  marketsClosed: number;
  curatedLocked: number;
  curatedDeactivated: number;
  marketIds: string[];
};

export async function retireStaleMarketsAndCatalog(
  prisma: PrismaClient,
  now = new Date(),
): Promise<StaleRetirementResult> {
  const nowMs = now.getTime();
  const marketIds: string[] = [];

  const staleMarketCutoff = new Date(nowMs - PAST_KICKOFF_CLOSE_MS);
  const closedMarkets = await prisma.market.updateMany({
    where: {
      status: "open",
      closesAt: { lt: staleMarketCutoff },
    },
    data: { status: "closed" },
  });

  if (closedMarkets.count > 0) {
    const rows = await prisma.market.findMany({
      where: {
        status: "closed",
        closesAt: { lt: staleMarketCutoff },
      },
      select: { id: true },
      take: 50,
      orderBy: { closesAt: "desc" },
    });
    marketIds.push(...rows.map((r) => r.id));
  }

  const staleCuratedCutoff = new Date(nowMs - STALE_OPEN_CURATED_MS);
  const toLock = await prisma.curatedEvent.updateMany({
    where: {
      status: "OPEN",
      lockedAt: { lt: staleCuratedCutoff },
    },
    data: { status: "LOCKED", isActive: false },
  });

  const farFutureCutoff = new Date(nowMs + FAR_FUTURE_MS);
  const deactivatedFar = await prisma.curatedEvent.updateMany({
    where: {
      isActive: true,
      status: "OPEN",
      startsAt: { gt: farFutureCutoff },
    },
    data: { isActive: false },
  });

  return {
    marketsClosed: closedMarkets.count,
    curatedLocked: toLock.count,
    curatedDeactivated: deactivatedFar.count,
    marketIds,
  };
}
