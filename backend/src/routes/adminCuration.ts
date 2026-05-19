import type { Express, RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { requireXAdminKey } from "../middleware/auth";
import { cacheDel } from "../services/redisCache";
import {
  fetchAzuro1x2DecimalOddsByGameId,
  fetchGameByGameId,
  normalizeAzuroGraphqlUrl,
  type RawAzuroGame,
} from "../services/azuroCuratorGraphql";
import {
  buildEuropeanCurationGamesPayload,
  getImportanceScoreFromNormalized,
  getTemporalBandForUnix,
  isAutoPublish,
} from "../services/eventCurationPipeline";
import {
  buildCanonicalDiscoveryInventory,
  logDiscoveryInventoryMetrics,
} from "../services/canonicalDiscoveryInventory";
import { getInventoryPipelinePayload } from "../services/inventoryPipelineCache";
import { isFootballSportSlug } from "../services/canonicalSportTaxonomy";
import { collectCatalogDepthDiagnostics } from "../services/catalogDepthDiagnostics";
import { resolveCanonicalLiquidityState } from "../services/canonicalLiquidityState";
import { notifyCatalogLiquidityChanged } from "../services/catalogLiquidityRebalance";
import {
  compareEditorialCatalogOrder,
  inferEditorialSlotForFixture,
} from "../services/editorialCatalogOrchestrator";
import {
  filterCuratedRowsForProductPhase,
  isProductCatalogSportAllowed,
} from "../services/productCatalogFilter";
import {
  homepageMinMarkets,
  isEditorialCatalogOnly,
  isProtocolRegistryMode,
  isRawFeedCatalogActive,
  protocolRegistryApiCap,
} from "../services/emergencyRelaxMode";
import {
  mapCurationGamesToPublicMarkets,
  sortPipelineGamesByVitality,
} from "../services/rawFeedCatalogApi";
import {
  computeInventoryBucketCounts,
  logInventoryBucketCounts,
} from "../services/inventoryBuckets";
import { syncProtocolRegistryToPrisma } from "../services/protocolRegistrySync";
import { recordRegistryHealthMetrics } from "../services/registryHealthSnapshot";
import {
  isHomePipelineForensicEnabled,
  logHomeApiForensic,
  logHomeDbForensic,
} from "../services/homePipelineForensicTrace";
import {
  inferUpsertAction,
  logDisabledEvent,
  logUpsertEvent,
  readCuratedSnapshot,
} from "../services/curatedEventLifecycleForensic";
import {
  isLiveInPlayRow,
  maybeRunStaleRetirement,
  sortCuratedByVitality,
} from "../services/catalogVitality";

const CACHE_KEY = "admin:azuro:football:14d:v2";
/** Legacy editorial manual-select cap (admin UI only — not registry persistence). */
const MAX_ACTIVE = 9;

/** Throttle registry sync on GET /api/markets. */
let registryLastDbSyncMs = 0;
function registrySyncMinIntervalMs(): number {
  const n = Number(
    process.env.PREDICTIO_REGISTRY_SYNC_MIN_INTERVAL_MS ??
      process.env.PREDICTIO_RAW_FEED_SYNC_MIN_INTERVAL_MS ??
      "90000",
  );
  return Number.isFinite(n) && n >= 5000 ? Math.floor(n) : 90000;
}

/** Avoid hanging requests when Postgres is down or TCP stalls (default Prisma can wait a long time). */
const DB_READ_TIMEOUT_MS = 8_000;

function withDbTimeout<T>(operation: string, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`PrismaTimeout:${operation}`));
    }, DB_READ_TIMEOUT_MS);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

export function registerAdminCurationRoutes(
  app: Express,
  prisma: PrismaClient,
  publicLimiter: RequestHandler,
) {
  /** DEV/ops: full catalog depth trace + pagination probe (admin key required). */
  app.get("/api/admin/catalog-debug", requireXAdminKey, async (_req, res, next) => {
    try {
      const payload = await collectCatalogDepthDiagnostics(prisma);
      res.json(payload);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/admin/azuro-raw-test", requireXAdminKey, async (_req, res, next) => {
    try {
      const url = process.env.AZURO_DATA_FEED_URL?.trim();
      if (!url) {
        return res.status(500).json({
          error: "AZURO_DATA_FEED_URL_UNSET",
          message: "Set AZURO_DATA_FEED_URL in backend .env",
        });
      }

      /** Raw test: no temporal filter in GraphQL — filter in JS on consumer if needed (V3 data-feed). */
      const query = `{
  games(
    first: 100
    where: {
      state: Prematch
      activeConditionsCount_gt: 0
    }
    orderBy: startsAt
    orderDirection: asc
  ) {
    id
    gameId
    title
    startsAt
    state
    sport {
      name
      slug
    }
    league {
      name
      country {
        name
      }
    }
    participants {
      name
      image
    }
  }
}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const text = await response.text();
      const json = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { raw: text };
        }
      })();

       
      console.log("AZURO RAW RESPONSE:", JSON.stringify({ url, status: response.status, json }, null, 2));

      return res.status(response.status).json(json);
    } catch (e) {
      return next(e);
    }
  });

  app.get("/api/admin/azuro-test", requireXAdminKey, async (_req, res, next) => {
    try {
      const dataFeed = process.env.AZURO_DATA_FEED_URL?.trim();
      const legacyRaw = process.env.AZURO_GRAPHQL_URL?.trim();
      const AZURO_URL = dataFeed || (legacyRaw ? normalizeAzuroGraphqlUrl(legacyRaw) : "");
      if (!AZURO_URL) {
        return res.status(500).json({
          error: "AZURO_ENDPOINT_UNSET",
          message: "Set AZURO_DATA_FEED_URL (preferred) or AZURO_GRAPHQL_URL in backend .env",
        });
      }

      /** Azuro V3 data-feed — same shape as Event Curation */
      const query = `{
  games(
    first: 50
    where: {
      state: Prematch
      activeConditionsCount_gt: 0
    }
    orderBy: startsAt
    orderDirection: asc
  ) {
    id
    gameId
    title
    startsAt
    state
    sport { name slug }
    league { name country { name } }
    participants { name image sortOrder }
    activeConditionsCount
  }
}`;

      const response = await fetch(AZURO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const text = await response.text();
      const json = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })();

       
      console.log(
        "AZURO RESPONSE:",
        JSON.stringify(
          {
            urlUsed: AZURO_URL,
            source: dataFeed ? "AZURO_DATA_FEED_URL" : "AZURO_GRAPHQL_URL",
            body: { query },
            json: json ?? { raw: text },
          },
          null,
          2,
        ),
      );

      return res.status(response.status).json(json ?? { raw: text });
    } catch (e) {
      return next(e);
    }
  });

  app.get("/api/admin/azuro-events", requireXAdminKey, async (_req, res, next) => {
    try {
      let selectedGameIds = new Set<string>();
      try {
        const selected = await prisma.curatedEvent.findMany({
          where: { isActive: true },
          select: { gameId: true },
        });
        selectedGameIds = new Set(selected.map((s) => s.gameId));
      } catch (dbErr) {
        console.warn(
          "[adminCuration] curated selection lookup skipped (database unavailable):",
          dbErr instanceof Error ? dbErr.message : dbErr,
        );
      }

      const { games, diagnostics } = await buildEuropeanCurationGamesPayload(selectedGameIds);

      const diagnosticsFull = {
        ...diagnostics,
        selectedCount: selectedGameIds.size,
      };

       
      console.log("[adminCuration] azuro-events diagnostics:", JSON.stringify(diagnosticsFull));

      const events = games.map((row) => ({
        gameId: row.gameId,
        title: row.title,
        startsAt: row.startsAt,
        startsAtUnix: row.startsAtUnix,
        leagueName: row.leagueName,
        country: row.country,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        homeImage: row.homeImage,
        awayImage: row.awayImage,
        status: row.status,
        isSelected: row.isSelected,
        importanceScore: row.importanceScore,
        autoPublish: row.autoPublish,
      }));

      res.json({
        games,
        events,
        total: games.length,
        diagnostics: diagnosticsFull,
      });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/admin/events/select", requireXAdminKey, async (req, res, next) => {
    try {
      const body = req.body as { gameId?: string; selected?: boolean; selectedBy?: string };
      const gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
      const selected = Boolean(body.selected);
      const selectedBy =
        typeof body.selectedBy === "string" && body.selectedBy.trim().startsWith("0x")
          ? body.selectedBy.trim()
          : "unknown";

      if (!gameId) {
        return res.status(400).json({ error: "INVALID_BODY", message: "gameId required" });
      }

      if (selected) {
        const activeCount = await prisma.curatedEvent.count({ where: { isActive: true } });
        const existing = await prisma.curatedEvent.findUnique({ where: { gameId } });
        if (activeCount >= MAX_ACTIVE && (!existing || !existing.isActive)) {
          return res.status(400).json({
            error: "MAX_ACTIVE_CURATED",
            message: "Max 12 markets reached",
          });
        }

        const meta = await fetchGameByGameId(gameId);
        if (!meta) {
          return res.status(404).json({
            error: "GAME_NOT_FOUND",
            message: "Game not found on indexer",
          });
        }

        const startsAt = new Date(meta.startsAt);
        const lockedAt = new Date(startsAt.getTime() - 5 * 60 * 1000);

        const rawForAuto: RawAzuroGame = {
          league: { name: meta.leagueName, country: { name: meta.country } },
          title: meta.title,
          participants: [
            { name: meta.homeTeam, sortOrder: 0 },
            { name: meta.awayTeam, sortOrder: 1 },
          ],
        };
        const importanceScore = getImportanceScoreFromNormalized(meta);

        const oddsAz = (await fetchAzuro1x2DecimalOddsByGameId(gameId)) ?? {
          homeOdds: null as number | null,
          drawOdds: null as number | null,
          awayOdds: null as number | null,
        };
        const autoPublishVal = isAutoPublish(rawForAuto, importanceScore, oddsAz);

        const beforeAdmin = await readCuratedSnapshot(prisma, gameId);

        await prisma.curatedEvent.upsert({
          where: { gameId },
          create: {
            gameId,
            title: meta.title,
            leagueName: meta.leagueName,
            country: meta.country,
            startsAt,
            lockedAt,
            homeTeam: meta.homeTeam,
            awayTeam: meta.awayTeam,
            homeImage: meta.homeImage ?? undefined,
            awayImage: meta.awayImage ?? undefined,
            status: "OPEN",
            isActive: true,
            selectedBy,
            importanceScore,
            autoPublish: autoPublishVal,
            homeOdds: oddsAz.homeOdds ?? undefined,
            drawOdds: oddsAz.drawOdds ?? undefined,
            awayOdds: oddsAz.awayOdds ?? undefined,
          },
          update: {
            title: meta.title,
            leagueName: meta.leagueName,
            country: meta.country,
            startsAt,
            lockedAt,
            homeTeam: meta.homeTeam,
            awayTeam: meta.awayTeam,
            homeImage: meta.homeImage ?? undefined,
            awayImage: meta.awayImage ?? undefined,
            status: "OPEN",
            resolvedAt: null,
            result: null,
            isActive: true,
            selectedBy,
            selectedAt: new Date(),
            importanceScore,
            autoPublish: autoPublishVal,
            homeOdds: oddsAz.homeOdds ?? undefined,
            drawOdds: oddsAz.drawOdds ?? undefined,
            awayOdds: oddsAz.awayOdds ?? undefined,
          },
        });

        logUpsertEvent({
          externalId: gameId,
          title: meta.title,
          beforeStatus: beforeAdmin?.status ?? null,
          afterStatus: "OPEN",
          beforeIsActive: beforeAdmin?.isActive ?? null,
          afterIsActive: true,
          action: inferUpsertAction(beforeAdmin, "OPEN", true),
          source: "admin_events_select",
          extra: { selectedBy },
        });
      } else {
        const row = await prisma.curatedEvent.findUnique({
          where: { gameId },
          select: { title: true, status: true, isActive: true },
        });
        if (row) {
          logDisabledEvent({
            externalId: gameId,
            title: row.title,
            reason: "admin_deselect",
            beforeStatus: row.status,
            beforeIsActive: row.isActive,
            source: "admin_events_select",
          });
        }
        await prisma.curatedEvent.updateMany({
          where: { gameId },
          data: { isActive: false },
        });
      }

      await cacheDel(CACHE_KEY);
      await notifyCatalogLiquidityChanged(prisma, "admin_curation_toggle");

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  /** PR24 — Fast canonical discovery inventory (cached pipeline, ~50 quality football fixtures). */
  app.get("/api/markets/discovery", publicLimiter, async (req, res) => {
    try {
      const nowMs = Date.now();
      const mode = String(req.query.mode ?? "discovery").toLowerCase();
      const registryMode = isProtocolRegistryMode();
      const { games, diagnostics, buildMs } = await getInventoryPipelinePayload();

      let selectionGames = games;
      let discoveryMeta: ReturnType<typeof buildCanonicalDiscoveryInventory> | null = null;

      if (mode === "catalog") {
        selectionGames = sortPipelineGamesByVitality(
          games.filter(
            (g) =>
              (isFootballSportSlug(g.sportSlug) || isFootballSportSlug(g.sport)) &&
              g.startsAtUnix * 1000 > nowMs - 3 * 3_600_000,
          ),
        ).slice(0, Math.min(protocolRegistryApiCap(), 250));
      } else {
        discoveryMeta = buildCanonicalDiscoveryInventory(games, nowMs);
        selectionGames = discoveryMeta.games;
        logDiscoveryInventoryMetrics(discoveryMeta, {
          endpoint: "/api/markets/discovery",
          mode: "discovery",
          cacheBuildMs: buildMs,
        });
      }

      let allocationByMarketId: Record<string, { allocation: number; percentage: number }> = {};
      try {
        const liquidity = await resolveCanonicalLiquidityState(prisma);
        for (const row of liquidity.liquidityPerMarket) {
          allocationByMarketId[row.marketId] = {
            allocation: row.allocation,
            percentage: row.percentage,
          };
        }
      } catch {
        /* non-fatal */
      }

      const markets = mapCurationGamesToPublicMarkets(selectionGames, {
        nowMs,
        allocationByMarketId,
      });

      const footballPipeline = games.filter(
        (g) => isFootballSportSlug(g.sportSlug) || isFootballSportSlug(g.sport),
      );
      const inventoryBuckets =
        discoveryMeta?.bucketCounts ??
        computeInventoryBucketCounts(
          markets.map((m) => ({
            kickoffMs: new Date(m.startsAt).getTime(),
            leagueName: m.leagueName,
            status: m.status,
            isLive: m.status === "LIVE",
          })),
          nowMs,
        );

      logInventoryBucketCounts(inventoryBuckets, {
        endpoint: "/api/markets/discovery",
        mode,
        FOOTBALL_COUNT: footballPipeline.length,
        PIPELINE_COUNT: games.length,
        API_COUNT: markets.length,
        RENDERED_COUNT: markets.length,
        cacheBuildMs: buildMs,
      });

      res.json({
        markets,
        total: markets.length,
        catalogTotal: games.length,
        footballCount: footballPipeline.length,
        pipelineGameCount: games.length,
        inventoryBuckets,
        apiSource: "pipeline",
        surface: mode === "catalog" ? "catalog" : "discovery",
        rawFeedMode: registryMode,
        protocolRegistryMode: registryMode,
        filteredOut: discoveryMeta?.filteredOut ?? null,
        RAW_FEED_COUNT: diagnostics.totalFromAzuro,
      });
    } catch (e) {
      console.warn(
        "[adminCuration] GET /api/markets/discovery — error:",
        e instanceof Error ? e.message : e,
      );
      return res.json({ markets: [], total: 0, catalogTotal: 0, source: "error" });
    }
  });

  /** Public catalog: protocol registry (DB) + optional editorial view cap. */
  app.get("/api/markets", publicLimiter, async (_req, res) => {
    try {
      await maybeRunStaleRetirement(prisma);
      const nowMs = Date.now();
      const editorialOnly = isEditorialCatalogOnly();
      const registryMode = isProtocolRegistryMode();

      const { games, diagnostics } = await getInventoryPipelinePayload();
      const inv = diagnostics.emergencyInventory as Record<string, unknown> | undefined;

      let dbWritten = 0;
      let deactivated = 0;
      if (registryMode && nowMs - registryLastDbSyncMs >= registrySyncMinIntervalMs()) {
        try {
          const r = await syncProtocolRegistryToPrisma(prisma, games, {
            rawFeedCount: diagnostics.totalFromAzuro,
            normalizedCount: Number(inv?.NORMALIZED_COUNT ?? games.length),
            validCount: Number(inv?.VALID_COUNT ?? games.length),
            topRejectionReasons: (inv?.TOP_REJECTION_REASONS as Array<[string, number]>) ?? [],
          });
          dbWritten = r.written;
          deactivated = r.deactivated;
          registryLastDbSyncMs = nowMs;
        } catch (syncErr) {
          console.warn(
            "[adminCuration] protocol registry sync failed:",
            syncErr instanceof Error ? syncErr.message : syncErr,
          );
        }
      }

      let rows: Awaited<ReturnType<typeof prisma.curatedEvent.findMany>>;
      try {
        rows = await withDbTimeout(
          "curatedEvent.findMany",
          prisma.curatedEvent.findMany({
            where: { isActive: true, status: "OPEN" },
          }),
        );
      } catch (dbErr) {
        console.warn(
          "[adminCuration] GET /api/markets — database unavailable, returning empty list:",
          dbErr instanceof Error ? dbErr.message : dbErr,
        );
        return res.json({ markets: [], total: 0 });
      }

      const dbWhere = { isActive: true, status: "OPEN" as const };
      const apiCap = editorialOnly ? MAX_ACTIVE : protocolRegistryApiCap();
      logHomeDbForensic({
        queryLabel: "prisma.curatedEvent.findMany",
        whereClause: dbWhere,
        rows,
        maxActiveCap: apiCap,
      });

      const productRows = filterCuratedRowsForProductPhase(rows);

      let allocationByMarketId: Record<string, { allocation: number; percentage: number }> =
        {};
      try {
        const liquidity = await resolveCanonicalLiquidityState(prisma);
        for (const row of liquidity.liquidityPerMarket) {
          allocationByMarketId[row.marketId] = {
            allocation: row.allocation,
            percentage: row.percentage,
          };
        }
      } catch (liqErr) {
        console.warn(
          "[adminCuration] canonical liquidity snapshot failed:",
          liqErr instanceof Error ? liqErr.message : liqErr,
        );
      }

      let markets: ReturnType<typeof mapCurationGamesToPublicMarkets>;
      let apiSource: "pipeline" | "db";

      if (isRawFeedCatalogActive() && games.length > 0) {
        apiSource = "pipeline";
        markets = mapCurationGamesToPublicMarkets(
          sortPipelineGamesByVitality(games).slice(0, apiCap),
          { nowMs, allocationByMarketId },
        );
      } else {
        apiSource = "db";
        const top = sortCuratedByVitality(productRows).slice(0, apiCap);
        const nowSec = Math.floor(nowMs / 1000);
        markets = top.map((r) => {
          const lockedAt = r.lockedAt instanceof Date ? r.lockedAt : r.startsAt;
          const timeToLock = Math.floor((lockedAt.getTime() - nowMs) / 1000);
          const kickSec = Math.floor(r.startsAt.getTime() / 1000);
          const marketId = `azuro-${r.gameId}`;
          const paperLiq = allocationByMarketId[marketId];
          const editorial = inferEditorialSlotForFixture({
            leagueName: r.leagueName,
            country: r.country,
            homeTeam: r.homeTeam,
            awayTeam: r.awayTeam,
            importanceScore: r.importanceScore ?? 0,
            sport: r.sport,
            sportSlug: r.sportSlug,
          });
          return {
            id: marketId,
            gameId: r.gameId,
            title: r.title,
            homeTeam: r.homeTeam,
            awayTeam: r.awayTeam,
            homeImage: r.homeImage ?? null,
            awayImage: r.awayImage ?? null,
            leagueName: r.leagueName,
            country: r.country,
            startsAt: r.startsAt.toISOString(),
            lockedAt: lockedAt.toISOString(),
            status:
              r.selectedBy === "LIVE_AZURO" ||
              isLiveInPlayRow({ startsAt: r.startsAt, status: r.status })
                ? "LIVE"
                : String(r.status || "OPEN"),
            result: r.result ?? null,
            timeToLock,
            importanceScore: r.importanceScore ?? 0,
            autoPublish: r.autoPublish ?? false,
            sport: r.sportSlug ?? r.sport ?? "football",
            sportSlug: r.sportSlug ?? r.sport ?? "football",
            temporalBand: getTemporalBandForUnix(nowSec, kickSec),
            editorialSlot: editorial.slot,
            selectionReason: editorial.selectionReason,
            homeOdds: r.homeOdds ?? null,
            drawOdds: r.drawOdds ?? null,
            awayOdds: r.awayOdds ?? null,
            paperLiquidityAllocation: paperLiq?.allocation ?? null,
            paperLiquiditySharePct: paperLiq?.percentage ?? null,
          };
        });
      }

      const sportBreakdown = productRows.reduce<Record<string, number>>((acc, r) => {
        const key = (r.sportSlug ?? r.sport ?? "unknown").toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      console.log(
        JSON.stringify({
          tag: "protocol_registry_api_markets",
          RAW_FEED_COUNT: diagnostics.totalFromAzuro,
          NORMALIZED_COUNT: inv?.NORMALIZED_COUNT ?? null,
          VALID_COUNT: inv?.VALID_COUNT ?? null,
          PERSISTED_COUNT: dbWritten,
          OPEN_REGISTRY_COUNT: rows.length,
          PRODUCT_CATALOG_OPEN_COUNT: productRows.length,
          API_RESPONSE_COUNT: markets.length,
          API_SOURCE: apiSource,
          PIPELINE_GAME_COUNT: games.length,
          PRODUCT_SPORT_BREAKDOWN: sportBreakdown,
          DEACTIVATED_PRIOR_OPEN: deactivated,
          HOMEPAGE_MIN_MARKETS: homepageMinMarkets(),
        }),
      );

      logHomeApiForensic({
        path: apiSource === "pipeline" ? "protocol-registry-db" : "editorial-db",
        rawFeedCount: diagnostics.totalFromAzuro,
        dbOpenCount: rows.length,
        apiResponseCount: markets.length,
        markets,
        extra: {
          protocolRegistryMode: registryMode,
          editorialCatalogOnly: editorialOnly,
          dbRowsBeforeCap: rows.length,
          apiCap,
        },
      });

      recordRegistryHealthMetrics({
        source: "GET /api/markets",
        rawFeedCount: diagnostics.totalFromAzuro,
        normalizedCount: Number(inv?.NORMALIZED_COUNT ?? games.length),
        persistedCount: dbWritten,
        openRegistryCount: rows.length,
        apiResponseCount: markets.length,
      });

      const footballMarkets = markets.filter(
        (m) => m.sportSlug === "football" || m.sport === "football",
      );
      const inventoryBuckets = computeInventoryBucketCounts(
        footballMarkets.map((m) => ({
          kickoffMs: new Date(m.startsAt).getTime(),
          leagueName: m.leagueName,
          status: m.status,
          isLive: m.status === "LIVE",
        })),
        nowMs,
      );
      logInventoryBucketCounts(inventoryBuckets, {
        FOOTBALL_COUNT: footballMarkets.length,
        API_COUNT: markets.length,
        RENDERED_COUNT: markets.length,
      });

      res.json({
        markets,
        total: games.length > 0 && isRawFeedCatalogActive() ? games.length : markets.length,
        pipelineGameCount: games.length,
        apiSource,
        liquidityMode: registryMode ? "protocol-registry" : "editorial-catalog",
        protocolRegistryMode: registryMode,
        rawFeedMode: registryMode,
        homepageMinMarkets: homepageMinMarkets(),
        productCatalogOpenCount: productRows.length,
        registryOpenCount: rows.length,
        inventoryBuckets,
        footballCount: footballMarkets.length,
      });
    } catch (e) {
      // Never 500 for public catalog — mapping/sort edge cases or unexpected errors → empty list.
      console.warn(
        "[adminCuration] GET /api/markets — unexpected error, returning empty list:",
        e instanceof Error ? e.message : e,
      );
      return res.json({ markets: [], total: 0 });
    }
  });

  /** Single active curated event by Azuro `gameId` or CuratedEvent `id` (for `/markets/azuro-…` links). */
  app.get("/api/markets/:gameId", publicLimiter, async (req, res) => {
    try {
      const raw = typeof req.params.gameId === "string" ? req.params.gameId.trim() : "";
      const gameId = raw.startsWith("azuro-") ? raw.slice("azuro-".length) : raw;
      if (!gameId) {
        return res.status(400).json({ error: "gameId required" });
      }

      let market: Awaited<ReturnType<typeof prisma.curatedEvent.findFirst>>;
      try {
        market = await withDbTimeout(
          "curatedEvent.findFirst",
          prisma.curatedEvent.findFirst({
            where: {
              OR: [{ gameId }, { id: gameId }],
              isActive: true,
            },
          }),
        );
      } catch (dbErr) {
        console.warn(
          "[adminCuration] GET /api/markets/:gameId — database error:",
          dbErr instanceof Error ? dbErr.message : dbErr,
        );
        return res.status(503).json({ error: "Database unavailable" });
      }

      if (!market || !isProductCatalogSportAllowed(market.sportSlug, market.sport)) {
        return res.status(404).json({ error: "Market not found" });
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const kickSec = Math.floor(market.startsAt.getTime() / 1000);
      return res.json({
        market: {
          ...market,
          temporalBand: getTemporalBandForUnix(nowSec, kickSec),
        },
      });
    } catch (e) {
      console.warn(
        "[adminCuration] GET /api/markets/:gameId — unexpected error:",
        e instanceof Error ? e.message : e,
      );
      return res.status(503).json({ error: "Database unavailable" });
    }
  });
}
