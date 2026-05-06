import type { Express, RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { requireXAdminKey } from "../middleware/auth";
import { cacheGetJson, cacheSetJson } from "../services/redisCache";
import {
  fetchFootballGamesNext14Days,
  fetchGameByGameId,
  type NormalizedCuratorGame,
} from "../services/azuroCuratorGraphql";

const CACHE_KEY = "admin:azuro:football:14d:v1";
const CACHE_TTL_SEC = 300;
const MAX_ACTIVE = 12;

export function registerAdminCurationRoutes(
  app: Express,
  prisma: PrismaClient,
  publicLimiter: RequestHandler,
) {
  app.get("/api/admin/azuro-events", requireXAdminKey, async (_req, res, next) => {
    try {
      let games = await cacheGetJson<NormalizedCuratorGame[]>(CACHE_KEY);
      if (!games) {
        games = await fetchFootballGamesNext14Days();
        await cacheSetJson(CACHE_KEY, games, CACHE_TTL_SEC);
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const upcoming = games.filter((g) => g.startsAtUnix > nowSec);

      const selectedRows = await prisma.curatedEvent.findMany({
        where: { isActive: true },
        select: { gameId: true },
      });
      const selectedSet = new Set(selectedRows.map((r) => r.gameId));

      const events = upcoming.map((g) => ({
        ...g,
        isSelected: selectedSet.has(g.gameId),
      }));

      res.json({ events });
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

        await prisma.curatedEvent.upsert({
          where: { gameId },
          create: {
            gameId,
            title: meta.title,
            leagueName: meta.leagueName,
            country: meta.country,
            startsAt,
            homeTeam: meta.homeTeam,
            awayTeam: meta.awayTeam,
            homeImage: meta.homeImage ?? undefined,
            awayImage: meta.awayImage ?? undefined,
            isActive: true,
            selectedBy,
          },
          update: {
            title: meta.title,
            leagueName: meta.leagueName,
            country: meta.country,
            startsAt,
            homeTeam: meta.homeTeam,
            awayTeam: meta.awayTeam,
            homeImage: meta.homeImage ?? undefined,
            awayImage: meta.awayImage ?? undefined,
            isActive: true,
            selectedBy,
            selectedAt: new Date(),
          },
        });
      } else {
        await prisma.curatedEvent.updateMany({
          where: { gameId },
          data: { isActive: false },
        });
      }

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  /** Public list of founder-curated Azuro games (same chain as indexer). */
  app.get("/api/markets", publicLimiter, async (_req, res, next) => {
    try {
      const rows = await prisma.curatedEvent.findMany({
        where: { isActive: true },
        orderBy: { startsAt: "asc" },
      });

      const markets = rows.map((r) => ({
        id: `azuro-${r.gameId}`,
        gameId: r.gameId,
        title: r.title,
        league: r.leagueName,
        country: r.country,
        homeTeam: r.homeTeam,
        awayTeam: r.awayTeam,
        homeImage: r.homeImage,
        awayImage: r.awayImage,
        startsAt: r.startsAt.toISOString(),
        lockedAt: r.startsAt.toISOString(),
      }));

      res.json({ markets, total: markets.length });
    } catch (e) {
      next(e);
    }
  });
}
