/**
 * Canonical protocol market registry — persists ALL minimally-valid Azuro events to `curated_events`.
 * Ranking / homepage / editorial slots are VIEW layers only (never pre-persistence caps).
 */
import type { PrismaClient } from "@prisma/client";
import type { CurationGamePayload } from "./eventCurationPipeline";
import {
  protocolRegistryDbSyncCap,
  isProtocolRegistryMode,
} from "./emergencyRelaxMode";
import { cacheDel } from "./redisCache";
import { notifyCatalogLiquidityChanged } from "./catalogLiquidityRebalance";
import {
  inferUpsertAction,
  logBulkDisableForensic,
  logUpsertEvent,
  readCuratedSnapshot,
  runCuratedLifecycleJob,
} from "./curatedEventLifecycleForensic";
import { recordRegistryHealthMetrics } from "./registryHealthSnapshot";
import { runRegistryHealthCheck } from "./registryHealthCheck";

const BOOT_CURATION_CACHE_KEY = "admin:azuro:football:14d:v2";
const REGISTRY_SELECTED_BY = "PROTOCOL_REGISTRY";

export type ProtocolRegistrySyncResult = {
  written: number;
  deactivated: number;
  cap: number;
  payloadGames: number;
  openActiveAfter: number;
};

export type ProtocolRegistryDiagnosticsInput = {
  rawFeedCount?: number;
  normalizedCount?: number;
  validCount?: number;
  topRejectionReasons?: Array<[string, number]>;
};

function sportDistribution(
  games: readonly CurationGamePayload[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of games) {
    const k = String(g.sportSlug ?? g.sport ?? "unknown").toLowerCase();
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export async function logProtocolRegistryDiagnostics(
  prisma: PrismaClient,
  opts: {
    rawFeedCount: number;
    normalizedCount: number;
    persistedCount: number;
    payloadGames: number;
    topRejectionReasons?: Array<[string, number]>;
  },
): Promise<void> {
  const [registryTotal, openCount] = await Promise.all([
    prisma.curatedEvent.count(),
    prisma.curatedEvent.count({ where: { isActive: true, status: "OPEN" } }),
  ]);

  const openRows = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    select: { sportSlug: true, sport: true },
    take: 5000,
  });
  const dist: Record<string, number> = {};
  for (const r of openRows) {
    const k = String(r.sportSlug ?? r.sport ?? "unknown").toLowerCase();
    dist[k] = (dist[k] ?? 0) + 1;
  }

  console.log(
    JSON.stringify({
      tag: "PROTOCOL_REGISTRY_DIAGNOSTICS",
      RAW_FEED_COUNT: opts.rawFeedCount,
      NORMALIZED_COUNT: opts.normalizedCount,
      PERSISTED_COUNT: opts.persistedCount,
      OPEN_REGISTRY_COUNT: openCount,
      CANONICAL_REGISTRY_COUNT: registryTotal,
      CANONICAL_OPEN_COUNT: openCount,
      CANONICAL_SPORT_DISTRIBUTION: dist,
      PAYLOAD_GAMES: opts.payloadGames,
      TOP_REJECTION_REASONS: opts.topRejectionReasons ?? [],
    }),
  );
}

/**
 * Upsert full registry snapshot; deactivate OPEN rows missing from snapshot (stale book).
 */
export async function syncProtocolRegistryToPrisma(
  prisma: PrismaClient,
  games: CurationGamePayload[],
  diagnostics?: ProtocolRegistryDiagnosticsInput,
): Promise<ProtocolRegistrySyncResult> {
  if (!isProtocolRegistryMode()) {
    return { written: 0, deactivated: 0, cap: 0, payloadGames: games.length, openActiveAfter: 0 };
  }

  return runCuratedLifecycleJob("protocol_registry_sync", async () => {
    const cap = protocolRegistryDbSyncCap();
    const slice = games.slice(0, cap);
    const ids = slice.map((g) => String(g.gameId || "").trim()).filter(Boolean);

    if (ids.length === 0) {
      console.log(
        JSON.stringify({
          tag: "PROTOCOL_REGISTRY_SYNC",
          PERSISTED_COUNT: 0,
          reason: "empty_payload",
        }),
      );
      return {
        written: 0,
        deactivated: 0,
        cap,
        payloadGames: games.length,
        openActiveAfter: 0,
        eventsRead: games.length,
        eventsWritten: 0,
        eventsDisabled: 0,
      };
    }

    const deactivateWhere = {
      isActive: true,
      status: "OPEN" as const,
      gameId: { notIn: ids },
    };

    await logBulkDisableForensic(
      prisma,
      deactivateWhere,
      "registry_snapshot_not_in_valid_set",
      "protocol_registry_sync",
    );

    const deactivated = await prisma.curatedEvent.updateMany({
      where: deactivateWhere,
      data: { isActive: false },
    });

    let written = 0;
    for (const event of slice) {
      const gameId = String(event.gameId || "").trim();
      if (!gameId) continue;

      const startsAt = new Date(event.startsAt);
      const lockedAt = new Date(startsAt.getTime() - 5 * 60 * 1000);
      const before = await readCuratedSnapshot(prisma, gameId);
      const afterStatus = "OPEN" as const;
      const afterIsActive = true;
      const selectedBy =
        String(event.status ?? "").toUpperCase() === "LIVE"
          ? "LIVE_AZURO"
          : REGISTRY_SELECTED_BY;

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
          status: afterStatus,
          isActive: true,
          selectedBy,
          importanceScore: event.importanceScore ?? 0,
          autoPublish: event.autoPublish ?? true,
          homeOdds: event.homeOdds ?? null,
          drawOdds: event.drawOdds ?? null,
          awayOdds: event.awayOdds ?? null,
          sport: event.sportSlug ?? event.sport ?? "unknown",
          sportSlug: event.sportSlug ?? event.sport ?? "unknown",
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
          selectedBy,
          importanceScore: event.importanceScore ?? 0,
          autoPublish: event.autoPublish ?? true,
          homeOdds: event.homeOdds ?? null,
          drawOdds: event.drawOdds ?? null,
          awayOdds: event.awayOdds ?? null,
          sport: event.sportSlug ?? event.sport ?? "unknown",
          sportSlug: event.sportSlug ?? event.sport ?? "unknown",
        },
      });

      logUpsertEvent({
        externalId: gameId,
        title: event.title,
        beforeStatus: before?.status ?? null,
        afterStatus,
        beforeIsActive: before?.isActive ?? null,
        afterIsActive,
        action: inferUpsertAction(before, afterStatus, afterIsActive),
        source: "protocol_registry_sync",
      });
      written += 1;
    }

    await cacheDel(BOOT_CURATION_CACHE_KEY);
    await notifyCatalogLiquidityChanged(prisma, "protocol_registry_sync");

    const openActiveAfter = await prisma.curatedEvent.count({
      where: { isActive: true, status: "OPEN" },
    });

    const rawFeedCount = diagnostics?.rawFeedCount ?? games.length;
    const normalizedCount = diagnostics?.normalizedCount ?? games.length;

    await logProtocolRegistryDiagnostics(prisma, {
      rawFeedCount,
      normalizedCount,
      persistedCount: written,
      payloadGames: games.length,
      topRejectionReasons: diagnostics?.topRejectionReasons,
    });

    console.log(
      JSON.stringify({
        tag: "PROTOCOL_REGISTRY_SYNC",
        PERSISTED_COUNT: written,
        DEACTIVATED_COUNT: deactivated.count,
        CAP: cap,
        PAYLOAD_GAMES: games.length,
        CANONICAL_OPEN_COUNT: openActiveAfter,
        CANONICAL_SPORT_DISTRIBUTION_PAYLOAD: sportDistribution(slice),
      }),
    );

    recordRegistryHealthMetrics({
      source: "protocol_registry_sync",
      rawFeedCount: diagnostics?.rawFeedCount ?? games.length,
      normalizedCount: diagnostics?.normalizedCount ?? games.length,
      persistedCount: written,
      openRegistryCount: openActiveAfter,
      apiResponseCount: null,
    });
    await runRegistryHealthCheck(prisma, "protocol_registry_sync");

    return {
      written,
      deactivated: deactivated.count,
      cap,
      payloadGames: games.length,
      openActiveAfter,
      eventsRead: games.length,
      eventsWritten: written,
      eventsDisabled: deactivated.count,
    };
  });
}
