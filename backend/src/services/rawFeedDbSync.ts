import type { PrismaClient } from "@prisma/client";
import type { CurationGamePayload } from "./eventCurationPipeline";
import { isRawFeedMode, rawFeedDbSyncCap } from "./emergencyRelaxMode";
import { cacheDel } from "./redisCache";
import { notifyCatalogLiquidityChanged } from "./catalogLiquidityRebalance";

const BOOT_CURATION_CACHE_KEY = "admin:azuro:football:14d:v2";

/**
 * Writes raw-feed catalog slice into `curated_events` so vault / liquidity / TRPC DB paths see the same book.
 * Deactivates active rows whose `gameId` is not in the new snapshot (stale curated / old picks).
 */
export async function syncRawFeedGamesToPrisma(
  prisma: PrismaClient,
  games: CurationGamePayload[],
): Promise<{
  written: number;
  deactivated: number;
  cap: number;
}> {
  if (!isRawFeedMode()) {
    return { written: 0, deactivated: 0, cap: 0 };
  }

  const cap = rawFeedDbSyncCap();
  const slice = games.slice(0, cap);
  const ids = slice.map((g) => g.gameId).filter(Boolean);
  if (ids.length === 0) {
    console.log(JSON.stringify({ tag: "RAW_FEED_DB_SYNC", DB_WRITTEN_COUNT: 0, reason: "empty_payload" }));
    return { written: 0, deactivated: 0, cap };
  }

  const deactivated = await prisma.curatedEvent.updateMany({
    where: {
      isActive: true,
      status: "OPEN",
      gameId: { notIn: ids.length > 0 ? ids : ["__none__"] },
    },
    data: { isActive: false },
  });

  let written = 0;
  for (const event of slice) {
    const gameId = String(event.gameId || "").trim();
    if (!gameId) continue;

    const startsAt = new Date(event.startsAt);
    const lockedAt = new Date(startsAt.getTime() - 5 * 60 * 1000);

    await prisma.curatedEvent.upsert({
      where: { gameId },
      create: {
        gameId,
        title: event.title,
        leagueName: event.leagueName,
        country: event.country,
        startsAt,
        lockedAt,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        homeImage: event.homeImage ?? undefined,
        awayImage: event.awayImage ?? undefined,
        status: "OPEN",
        isActive: true,
        selectedBy: "RAW_FEED_MODE",
        importanceScore: event.importanceScore ?? 0,
        autoPublish: event.autoPublish ?? true,
        homeOdds: event.homeOdds ?? null,
        drawOdds: event.drawOdds ?? null,
        awayOdds: event.awayOdds ?? null,
        sport: event.sportSlug ?? event.sport ?? "football",
        sportSlug: event.sportSlug ?? event.sport ?? "football",
      },
      update: {
        title: event.title,
        leagueName: event.leagueName,
        country: event.country,
        startsAt,
        lockedAt,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        homeImage: event.homeImage ?? undefined,
        awayImage: event.awayImage ?? undefined,
        status: "OPEN",
        resolvedAt: null,
        result: null,
        isActive: true,
        selectedBy: "RAW_FEED_MODE",
        importanceScore: event.importanceScore ?? 0,
        autoPublish: event.autoPublish ?? true,
        homeOdds: event.homeOdds ?? null,
        drawOdds: event.drawOdds ?? null,
        awayOdds: event.awayOdds ?? null,
        sport: event.sportSlug ?? event.sport ?? "football",
        sportSlug: event.sportSlug ?? event.sport ?? "football",
      },
    });
    written += 1;
  }

  await cacheDel(BOOT_CURATION_CACHE_KEY);
  await notifyCatalogLiquidityChanged(prisma, "raw_feed_db_sync");

  console.log(
    JSON.stringify({
      tag: "RAW_FEED_DB_SYNC",
      DB_WRITTEN_COUNT: written,
      DEACTIVATED_COUNT: deactivated.count,
      CAP: cap,
      PAYLOAD_GAMES: games.length,
    }),
  );

  return { written, deactivated: deactivated.count, cap };
}
