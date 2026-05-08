import type { Express, RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { requireXAdminKey } from "../middleware/auth";
import { cacheDel } from "../services/redisCache";
import { fetchGameByGameId, normalizeAzuroGraphqlUrl, type RawAzuroGame } from "../services/azuroCuratorGraphql";
import {
  buildEuropeanCurationGamesPayload,
  getImportanceScoreFromNormalized,
  isAutoPublish,
} from "../services/eventCurationPipeline";

const CACHE_KEY = "admin:azuro:football:14d:v2";
const MAX_ACTIVE = 12;

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
        const autoPublishVal = isAutoPublish(rawForAuto, importanceScore);

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
          },
        });
      } else {
        await prisma.curatedEvent.updateMany({
          where: { gameId },
          data: { isActive: false },
        });
      }

      await cacheDel(CACHE_KEY);

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  /** Public list of founder-curated Azuro games (same chain as indexer). */
  app.get("/api/markets", publicLimiter, async (_req, res) => {
    try {
      let rows: Awaited<ReturnType<typeof prisma.curatedEvent.findMany>>;
      try {
        rows = await withDbTimeout(
          "curatedEvent.findMany",
          prisma.curatedEvent.findMany({
            where: { isActive: true },
          }),
        );
      } catch (dbErr) {
        console.warn(
          "[adminCuration] GET /api/markets — database unavailable, returning empty list:",
          dbErr instanceof Error ? dbErr.message : dbErr,
        );
        return res.json({ markets: [], total: 0 });
      }

      const sorted = [...rows].sort((a, b) => {
        const scoreDiff = (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return a.startsAt.getTime() - b.startsAt.getTime();
      });

      const top = sorted.slice(0, MAX_ACTIVE);

      const nowMs = Date.now();
      const markets = top.map((r) => {
        const lockedAt = r.lockedAt instanceof Date ? r.lockedAt : r.startsAt;
        const timeToLock = Math.floor((lockedAt.getTime() - nowMs) / 1000);
        return {
          id: `azuro-${r.gameId}`,
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
        };
      });

      res.json({ markets, total: markets.length });
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

      return res.json({ market });
    } catch (e) {
      console.warn(
        "[adminCuration] GET /api/markets/:gameId — unexpected error:",
        e instanceof Error ? e.message : e,
      );
      return res.status(503).json({ error: "Database unavailable" });
    }
  });
}
