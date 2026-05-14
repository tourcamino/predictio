import { PrismaClient } from "@prisma/client";
import { buildEuropeanCurationGamesPayload } from "../services/eventCurationPipeline";

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

async function runAutoPublishImportant() {
  try {
    const activeRows = await prisma.curatedEvent.findMany({
      where: { isActive: true },
      select: { gameId: true },
    });
    let currentCount = activeRows.length;
    if (currentCount >= MAX_ACTIVE_CURATED) return;

    const selectedSet = new Set(activeRows.map((r) => r.gameId));
    const { games } = await buildEuropeanCurationGamesPayload(selectedSet);

    const autoCandidates = games
      .filter((g) => g.autoPublish && !selectedSet.has(g.gameId))
      .sort((a, b) => b.importanceScore - a.importanceScore);

    for (const event of autoCandidates) {
      if (currentCount >= MAX_ACTIVE_CURATED) break;

      const existing = await prisma.curatedEvent.findUnique({
        where: { gameId: event.gameId },
      });
      if (existing) continue;

      const startsAt = new Date(event.startsAt);
      const lockedAt = new Date(startsAt.getTime() - 5 * 60 * 1000);

      await prisma.curatedEvent.create({
        data: {
          gameId: event.gameId,
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
          selectedBy: "AUTO",
          importanceScore: event.importanceScore,
          autoPublish: true,
          homeOdds: event.homeOdds ?? undefined,
          drawOdds: event.drawOdds ?? undefined,
          awayOdds: event.awayOdds ?? undefined,
        },
      });

      currentCount += 1;
      selectedSet.add(event.gameId);
       
      console.log("[AutoPublish]", event.title);
    }
  } catch (e) {
     
    console.error("[MarketUpdater] Auto-publish failed:", e instanceof Error ? e.message : e);
  }
}

export async function updateMarketStatuses() {
  try {
    const now = new Date();

    // OPEN → LOCKED: lockedAt passed (5 min before kickoff)
    const toLock = await prisma.curatedEvent.updateMany({
      where: {
        status: "OPEN",
        lockedAt: { lte: now },
      },
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

    for (const market of lockedMarkets) {
      const resolved = await checkAzuroResolution(market.gameId);
      if (!resolved) continue;

      await prisma.curatedEvent.update({
        where: { id: market.id },
        data: {
          status: "RESOLVED",
          resolvedAt: now,
          result: resolved.result,
          isActive: false,
        },
      });

      console.log(`[MarketUpdater] Resolved market: ${market.title} → ${resolved.result}`);
    }

    await runAutoPublishImportant();
  } catch (e) {
    console.warn(
      "[MarketUpdater] cycle skipped (DB offline or transient Prisma error):",
      e instanceof Error ? e.message : e,
    );
  }
}

const g = globalThis as typeof globalThis & { __predictioMarketStatusScheduler?: boolean };

if (!g.__predictioMarketStatusScheduler) {
  g.__predictioMarketStatusScheduler = true;

  /**
   * Curated OPEN→LOCKED→RESOLVED + auto-publish top Azuro rows.
   * One interval per Node process; Docker `--force-recreate` replaces the process (no stacking across deploys).
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
