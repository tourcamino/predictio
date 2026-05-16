/**
 * Trace homepage path: DB → GET /api/markets (no browser).
 * Usage (backend/): PREDICTIO_HOME_PIPELINE_FORENSIC=true npm run debug:trace-home-pipeline
 */
import { PrismaClient } from "@prisma/client";
import { buildEuropeanCurationGamesPayload } from "../../services/eventCurationPipeline";
import { isRawFeedMode } from "../../services/emergencyRelaxMode";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.PREDICTIO_HOME_PIPELINE_FORENSIC) {
    process.env.PREDICTIO_HOME_PIPELINE_FORENSIC = "true";
  }

  const dbOpen = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    select: {
      gameId: true,
      title: true,
      homeTeam: true,
      awayTeam: true,
      startsAt: true,
    },
    orderBy: { startsAt: "asc" },
  });

  console.log("\n=== HOME PIPELINE TRACE (server) ===");
  console.log("PREDICTIO_RAW_FEED_MODE:", isRawFeedMode());
  console.log("DB_OPEN_COUNT (curated_events):", dbOpen.length);
  console.log(
    "DB_TOP_10:",
    dbOpen.slice(0, 10).map((r) => `${r.gameId} | ${r.title}`),
  );

  const { games, diagnostics } = await buildEuropeanCurationGamesPayload(new Set());
  console.log("PIPELINE totalFromAzuro:", diagnostics.totalFromAzuro);
  console.log("PIPELINE picked (raw mode ≈ API pool):", games.length);
  console.log(
    "\nAvvia backend con PREDICTIO_HOME_PIPELINE_FORENSIC=true e GET /api/markets per log API completi.",
  );
  console.log(
    "Apri homepage in DEV per log FRONTEND_FETCH + REACT_RENDER in console browser.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
