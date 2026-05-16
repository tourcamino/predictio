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
import { collectCatalogDepthDiagnostics } from "../services/catalogDepthDiagnostics";
import { resolveCanonicalLiquidityState } from "../services/canonicalLiquidityState";
import { notifyCatalogLiquidityChanged } from "../services/catalogLiquidityRebalance";
import {
  compareEditorialCatalogOrder,
  inferEditorialSlotForFixture,
} from "../services/editorialCatalogOrchestrator";
import { isRawFeedMode, rawFeedApiResponseCap } from "../services/emergencyRelaxMode";
import { syncRawFeedGamesToPrisma } from "../services/rawFeedDbSync";
import {
  isHomePipelineForensicEnabled,
  logHomeApiForensic,
  logHomeDbForensic,
} from "../services/homePipelineForensicTrace";

const CACHE_KEY = "admin:azuro:football:14d:v2";
const MAX_ACTIVE = 9;

/** Throttle heavy DB upserts on each GET in raw mode. */
let rawFeedLastDbSyncMs = 0;
function rawFeedSyncMinIntervalMs(): number {
  const n = Number(process.env.PREDICTIO_RAW_FEED_SYNC_MIN_INTERVAL_MS ?? "90000");
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
      } else {
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

  /** Public list of founder-curated Azuro games (same chain as indexer). */
  app.get("/api/markets", publicLimiter, async (_req, res) => {
    try {
      if (isRawFeedMode()) {
        const { games, diagnostics } = await buildEuropeanCurationGamesPayload(new Set());
        const apiCap = rawFeedApiResponseCap();
        const out = games.slice(0, apiCap);

        const nowMs = Date.now();
        let dbWritten = 0;
        let deactivated = 0;
        if (nowMs - rawFeedLastDbSyncMs >= rawFeedSyncMinIntervalMs()) {
          try {
            const r = await syncRawFeedGamesToPrisma(prisma, games);
            dbWritten = r.written;
            deactivated = r.deactivated;
            rawFeedLastDbSyncMs = nowMs;
          } catch (syncErr) {
            console.warn(
              "[adminCuration] raw feed DB sync failed (still returning live payload):",
              syncErr instanceof Error ? syncErr.message : syncErr,
            );
          }
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
        } catch (liqErr) {
          console.warn(
            "[adminCuration] raw feed — canonical liquidity snapshot failed:",
            liqErr instanceof Error ? liqErr.message : liqErr,
          );
        }

        const nowSec = Math.floor(nowMs / 1000);
        const markets = out.map((r) => {
          const startsAtDate = new Date(r.startsAt);
          const lockedAt = new Date(startsAtDate.getTime() - 5 * 60 * 1000);
          const timeToLock = Math.floor((lockedAt.getTime() - nowMs) / 1000);
          const kickSec = Math.floor(startsAtDate.getTime() / 1000);
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
            startsAt: startsAtDate.toISOString(),
            lockedAt: lockedAt.toISOString(),
            status: String(r.status || "OPEN"),
            result: null,
            timeToLock,
            importanceScore: r.importanceScore ?? 0,
            autoPublish: r.autoPublish ?? true,
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

        const inv = diagnostics.emergencyInventory as Record<string, unknown> | undefined;
        console.log(
          JSON.stringify({
            tag: "raw_feed_api_markets",
            RAW_FEED_COUNT: diagnostics.totalFromAzuro,
            NORMALIZED_COUNT: inv?.NORMALIZED_COUNT ?? null,
            VALID_COUNT: inv?.VALID_COUNT ?? null,
            PIPELINE_OUT: games.length,
            API_COUNT: markets.length,
            DB_WRITTEN_COUNT: dbWritten,
            DEACTIVATED_PRIOR_OPEN: deactivated,
          }),
        );

        let dbOpenAfterSync = 0;
        if (isHomePipelineForensicEnabled()) {
          try {
            dbOpenAfterSync = await prisma.curatedEvent.count({
              where: { isActive: true, status: "OPEN" },
            });
          } catch {
            dbOpenAfterSync = -1;
          }
        }

        logHomeApiForensic({
          path: "raw-feed-live",
          rawFeedCount: diagnostics.totalFromAzuro,
          dbOpenCount: dbOpenAfterSync >= 0 ? dbOpenAfterSync : null,
          apiResponseCount: markets.length,
          markets,
          extra: {
            rawFeedMode: true,
            pipelineValidCount: inv?.VALID_COUNT ?? null,
            dbWrittenThisRequest: dbWritten,
          },
        });

        return res.json({
          markets,
          total: markets.length,
          liquidityMode: "raw-feed-mode",
          rawFeedMode: true,
        });
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
      logHomeDbForensic({
        queryLabel: "prisma.curatedEvent.findMany",
        whereClause: dbWhere,
        rows,
        maxActiveCap: MAX_ACTIVE,
      });

      const sorted = [...rows].sort((a, b) => {
        const slotA = inferEditorialSlotForFixture({
          leagueName: a.leagueName,
          country: a.country,
          homeTeam: a.homeTeam,
          awayTeam: a.awayTeam,
          importanceScore: a.importanceScore ?? 0,
          sport: a.sport,
          sportSlug: a.sportSlug,
        });
        const slotB = inferEditorialSlotForFixture({
          leagueName: b.leagueName,
          country: b.country,
          homeTeam: b.homeTeam,
          awayTeam: b.awayTeam,
          importanceScore: b.importanceScore ?? 0,
          sport: b.sport,
          sportSlug: b.sportSlug,
        });
        return compareEditorialCatalogOrder(
          {
            editorialSlot: slotA.slot,
            importanceScore: a.importanceScore ?? 0,
            startsAtMs: a.startsAt.getTime(),
          },
          {
            editorialSlot: slotB.slot,
            importanceScore: b.importanceScore ?? 0,
            startsAtMs: b.startsAt.getTime(),
          },
        );
      });

      const top = sorted.slice(0, MAX_ACTIVE);

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

      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);
      const markets = top.map((r) => {
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
          status: String(r.status || "OPEN"),
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

      logHomeApiForensic({
        path: "curated-db",
        rawFeedCount: null,
        dbOpenCount: rows.length,
        apiResponseCount: markets.length,
        markets,
        extra: {
          rawFeedMode: false,
          dbRowsBeforeCap: rows.length,
          maxActiveCap: MAX_ACTIVE,
          getAzuroMarketsUsedByHomepage: false,
        },
      });

      res.json({
        markets,
        total: markets.length,
        liquidityMode: "canonical-catalog-routing",
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

      if (!market) {
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
