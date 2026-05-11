/**
 * Pubblica i top 9 eventi Serie A su `curated_events` (Prisma), senza HTTP.
 * Richiede DATABASE_URL e AZURO_DATA_FEED_URL nell'ambiente (es. --env-file=.env in locale).
 */
import { PrismaClient } from "@prisma/client";
import { buildEuropeanCurationGamesPayload } from "../services/eventCurationPipeline";
import { cacheDel } from "../services/redisCache";

const prisma = new PrismaClient();
const MAX = 9;
const CACHE_KEY = "admin:azuro:football:14d:v2";

async function main() {
  const { games } = await buildEuropeanCurationGamesPayload(new Set());
  const serieA = games
    .filter((g) => g.leagueName.toLowerCase().includes("serie a"))
    .slice(0, MAX);

  if (serieA.length === 0) {
    console.warn("[publish-events] Nessun evento Serie A nel payload.");
    await prisma.$disconnect();
    return;
  }

  for (const event of serieA) {
    const startsAt = new Date(event.startsAt);
    const lockedAt = new Date(startsAt.getTime() - 5 * 60 * 1000);

    await prisma.curatedEvent.upsert({
      where: { gameId: event.gameId },
      create: {
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
        selectedBy: "SCRIPT",
        importanceScore: event.importanceScore,
        autoPublish: event.autoPublish,
        homeOdds: event.homeOdds ?? undefined,
        drawOdds: event.drawOdds ?? undefined,
        awayOdds: event.awayOdds ?? undefined,
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
        selectedBy: "SCRIPT",
        importanceScore: event.importanceScore,
        autoPublish: event.autoPublish,
        homeOdds: event.homeOdds ?? undefined,
        drawOdds: event.drawOdds ?? undefined,
        awayOdds: event.awayOdds ?? undefined,
      },
    });
  }

  await cacheDel(CACHE_KEY);
  console.log(`[publish-events] Pubblicati ${serieA.length} eventi Serie A.`);
}

main()
  .catch((e) => {
    console.error("[publish-events]", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => null);
  });
