import { PrismaClient } from "@prisma/client";
import {
  buildEuropeanCurationGamesPayload,
  type CurationGamePayload,
} from "../services/eventCurationPipeline";
import { notifyCatalogLiquidityChanged } from "../services/catalogLiquidityRebalance";
import {
  homepageMinMarkets,
  isEditorialCatalogOnly,
  isProtocolRegistryMode,
} from "../services/emergencyRelaxMode";
import { syncProtocolRegistryToPrisma } from "../services/protocolRegistrySync";
import { runRegistryHealthCheck } from "../services/registryHealthCheck";
import { retireStaleMarketsAndCatalog } from "../services/staleMarketRetirement";
import { computeMarketPriorityScore } from "../services/marketPriorityEngine";
import {
  inferUpsertAction,
  logBulkDisableForensic,
  logDisabledEvent,
  logUpsertEvent,
  readCuratedSnapshot,
  runCuratedLifecycleJob,
} from "../services/curatedEventLifecycleForensic";

const prisma = new PrismaClient();

const MAX_ACTIVE_CURATED = 9;

async function checkAzuroResolution(gameId: string) {
  try {
    const url = process.env.AZURO_DATA_FEED_URL;
    if (!url) return null;

    const query = `{
      game(id: "${gameId}") {
        id
        state
      }
    }`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const json = (await response.json()) as { data?: { game?: { id?: string; state?: string } } };
    const game = json.data?.game;

    if (!game) return null;
    if (game.state === "Finished" || game.state === "Resolved") {
      return { result: game.state };
    }
    return null;
  } catch (e) {
    console.error("[MarketUpdater] Azuro check failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

function buildRowDataFromPipeline(event: CurationGamePayload, startsAt: Date, lockedAt: Date) {
  return {
    title: event.title,
    leagueName: event.leagueName,
    country: event.country,
    startsAt,
    lockedAt,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    homeImage: event.homeImage ?? undefined,
    awayImage: event.awayImage ?? undefined,
    status: "OPEN" as const,
    resolvedAt: null,
    result: null,
    isActive: true,
    selectedBy: "AUTO",
    importanceScore: event.importanceScore,
    autoPublish: event.autoPublish,
    homeOdds: event.homeOdds ?? undefined,
    drawOdds: event.drawOdds ?? undefined,
    awayOdds: event.awayOdds ?? undefined,
    sport: event.sportSlug ?? event.sport ?? "football",
    sportSlug: event.sportSlug ?? event.sport ?? "football",
  };
}

/** Upcoming trade window only — never reopen kickoff-past fixtures. */
function isUpcomingTradeable(startsAt: Date, lockedAt: Date, now: Date): boolean {
  return startsAt.getTime() > now.getTime() && lockedAt.getTime() > now.getTime();
}

/**
 * Refill curated catalog to MAX_ACTIVE_CURATED OPEN rows.
 * Uses pipeline payload + upsert (same strategy as boot seed), never skips existing gameId.
 */
async function runCuratedCatalogRefill(now: Date): Promise<number> {
  if (isProtocolRegistryMode()) {
    try {
      const openCount = await prisma.curatedEvent.count({
        where: { isActive: true, status: "OPEN" },
      });
      const min = homepageMinMarkets();
      if (openCount >= min) {
        return 0;
      }
      const { games, diagnostics } = await buildEuropeanCurationGamesPayload(new Set());
      const inv = diagnostics.emergencyInventory as Record<string, unknown> | undefined;
      const sync = await syncProtocolRegistryToPrisma(prisma, games, {
        rawFeedCount: diagnostics.totalFromAzuro,
        normalizedCount: Number(inv?.NORMALIZED_COUNT ?? games.length),
        validCount: Number(inv?.VALID_COUNT ?? games.length),
      });
      return sync.written;
    } catch (e) {
      console.error(
        "[MarketUpdater] Protocol registry refill failed:",
        e instanceof Error ? e.message : e,
      );
      return 0;
    }
  }

  if (!isEditorialCatalogOnly()) {
    return 0;
  }

  let refilled = 0;

  try {
    const openActiveRows = await prisma.curatedEvent.findMany({
      where: { isActive: true, status: "OPEN" },
      select: { gameId: true },
    });
    const openActiveSet = new Set(openActiveRows.map((r) => r.gameId));
    let openCount = openActiveSet.size;

    if (openCount >= MAX_ACTIVE_CURATED) {
      return 0;
    }

    const { games } = await buildEuropeanCurationGamesPayload(openActiveSet, {
      openActiveCount: openCount,
    });

    const candidates = [...games].sort((a, b) => {
      const scoreA = computeMarketPriorityScore({
        marketId: String(a.gameId),
        kickoffMs: a.startsAtUnix * 1000,
        leagueName: a.leagueName,
        volume24h: 0,
      });
      const scoreB = computeMarketPriorityScore({
        marketId: String(b.gameId),
        kickoffMs: b.startsAtUnix * 1000,
        leagueName: b.leagueName,
        volume24h: 0,
      });
      return scoreB - scoreA;
    });

    for (const event of candidates) {
      if (openCount >= MAX_ACTIVE_CURATED) break;

      const gameId = String(event.gameId || "").trim();
      if (!gameId || openActiveSet.has(gameId)) continue;

      const startsAt = new Date(event.startsAt);
      const lockedAt = new Date(startsAt.getTime() - 5 * 60 * 1000);
      if (!isUpcomingTradeable(startsAt, lockedAt, now)) continue;

      const existing = await prisma.curatedEvent.findUnique({
        where: { gameId },
        select: { status: true },
      });

      if (existing?.status === "RESOLVED") continue;

      const rowData = buildRowDataFromPipeline(event, startsAt, lockedAt);
      const before = await readCuratedSnapshot(prisma, gameId);

      await prisma.curatedEvent.upsert({
        where: { gameId },
        create: { gameId, ...rowData },
        update: rowData,
      });

      const upsertAction = inferUpsertAction(before, "OPEN", true);
      logUpsertEvent({
        externalId: gameId,
        title: event.title,
        beforeStatus: before?.status ?? null,
        afterStatus: "OPEN",
        beforeIsActive: before?.isActive ?? null,
        afterIsActive: true,
        action: upsertAction,
        source: "market_status_updater_refill",
      });

      openCount += 1;
      refilled += 1;
      openActiveSet.add(gameId);

      console.log(
        JSON.stringify({
          tag: "curated_catalog_refill",
          gameId,
          action: upsertAction,
          title: event.title,
          startsAt: startsAt.toISOString(),
          openActiveAfter: openCount,
        }),
      );
    }
  } catch (e) {
    console.error(
      "[MarketUpdater] Curated catalog refill failed:",
      e instanceof Error ? e.message : e,
    );
  }

  return refilled;
}

export async function updateMarketStatuses() {
  return runCuratedLifecycleJob("market_status_updater", async () => {
  try {
    const now = new Date();

    const lockWhere = {
      status: "OPEN" as const,
      lockedAt: { lte: now },
      // Keep in-play rows visible for catalog (PR19) — lock only after live window expires
      startsAt: { lt: new Date(now.getTime() - 4 * 3_600_000) },
    };

    await logBulkDisableForensic(
      prisma,
      lockWhere,
      "kickoff_lock_window_lockedAt_lte_now",
      "market_status_updater_lock",
    );

    // OPEN → LOCKED: lockedAt passed (5 min before kickoff)
    const toLock = await prisma.curatedEvent.updateMany({
      where: lockWhere,
      data: { status: "LOCKED", isActive: false },
    });

    if (toLock.count > 0) {
      console.log(`[MarketUpdater] Locked ${toLock.count} markets`);
    }

    // LOCKED → RESOLVED (checks Azuro state)
    const lockedMarkets = await prisma.curatedEvent.findMany({
      where: { status: "LOCKED" },
      take: 50,
      orderBy: { startsAt: "asc" },
    });

    let resolvedCount = 0;
    for (const market of lockedMarkets) {
      const resolved = await checkAzuroResolution(market.gameId);
      if (!resolved) continue;

      resolvedCount += 1;
      await prisma.curatedEvent.update({
        where: { id: market.id },
        data: {
          status: "RESOLVED",
          resolvedAt: now,
          result: resolved.result,
          isActive: false,
        },
      });

      logDisabledEvent({
        externalId: market.gameId,
        title: market.title,
        reason: `azuro_resolved:${resolved.result}`,
        beforeStatus: "LOCKED",
        beforeIsActive: market.isActive,
        source: "market_status_updater_resolve",
      });

      console.log(`[MarketUpdater] Resolved market: ${market.title} → ${resolved.result}`);
    }

    const refilled = await runCuratedCatalogRefill(now);

    const retirement = await retireStaleMarketsAndCatalog(prisma, now);
    if (
      retirement.marketsClosed > 0 ||
      retirement.curatedLocked > 0 ||
      retirement.curatedDeactivated > 0
    ) {
      console.log(JSON.stringify({ tag: "stale_market_retirement", ...retirement }));
    }

    const [openActive, locked, inactive] = await Promise.all([
      prisma.curatedEvent.count({ where: { isActive: true, status: "OPEN" } }),
      prisma.curatedEvent.count({ where: { status: "LOCKED" } }),
      prisma.curatedEvent.count({ where: { isActive: false } }),
    ]);

    console.log(
      JSON.stringify({
        tag: "curated_catalog_health",
        openActive,
        locked,
        inactive,
        refilled,
        cap: MAX_ACTIVE_CURATED,
      }),
    );

    await runRegistryHealthCheck(prisma, "market_status_updater");

    if (toLock.count > 0 || refilled > 0 || resolvedCount > 0) {
      await notifyCatalogLiquidityChanged(
        prisma,
        toLock.count > 0
          ? "lifecycle_lock"
          : refilled > 0
            ? "lifecycle_refill"
            : "lifecycle_resolve",
      );
    }

    return {
      eventsRead: lockedMarkets.length,
      eventsWritten: refilled,
      eventsDisabled: toLock.count + resolvedCount,
      eventsLocked: toLock.count,
      eventsResolved: resolvedCount,
      openActiveAfter: openActive,
      extra: { locked, inactive, refilled },
    };
  } catch (e) {
    console.warn(
      "[MarketUpdater] cycle skipped (DB offline or transient Prisma error):",
      e instanceof Error ? e.message : e,
    );
    return {
      eventsRead: 0,
      eventsWritten: 0,
      eventsDisabled: 0,
      extra: { skipped: true, error: e instanceof Error ? e.message : String(e) },
    };
  }
  });
}

const g = globalThis as typeof globalThis & { __predictioMarketStatusScheduler?: boolean };

if (!g.__predictioMarketStatusScheduler) {
  g.__predictioMarketStatusScheduler = true;

  /**
   * Curated OPEN→LOCKED→RESOLVED + refill to 9 OPEN active via upsert.
   * One interval per Node process; Docker `--force-recreate` replaces the process.
   */
  setInterval(() => {
    void updateMarketStatuses().catch((e) => {
      console.error("[MarketUpdater] updateMarketStatuses failed:", e instanceof Error ? e.message : e);
    });
  }, 60 * 1000);

  void updateMarketStatuses().catch((e) => {
    console.warn(
      "[MarketUpdater] initial run failed (DB offline?)",
      e instanceof Error ? e.message : e,
    );
  });
} else {
  console.warn(
    "[MarketUpdater] scheduler already registered — duplicate import of this module; skipping second setInterval",
  );
}
