/**
 * Audit curated_events table + pipeline caps (no HTTP).
 * Usage: npm run debug:trace-curated-lifecycle
 */
import { PrismaClient } from "@prisma/client";
import { buildEuropeanCurationGamesPayload } from "../../services/eventCurationPipeline";
import {
  CURATED_LIFECYCLE_WRITERS,
  logCuratedLifecycleInventory,
  isCuratedLifecycleForensicEnabled,
} from "../../services/curatedEventLifecycleForensic";
import { isRawFeedMode } from "../../services/emergencyRelaxMode";
import { CATALOG_TARGET_SIZE } from "../../services/editorialCatalogOrchestrator";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.PREDICTIO_CURATED_LIFECYCLE_FORENSIC) {
    process.env.PREDICTIO_CURATED_LIFECYCLE_FORENSIC = "true";
  }

  logCuratedLifecycleInventory();

  const [openActive, locked, resolved, inactive, total] = await Promise.all([
    prisma.curatedEvent.count({ where: { isActive: true, status: "OPEN" } }),
    prisma.curatedEvent.count({ where: { status: "LOCKED" } }),
    prisma.curatedEvent.count({ where: { status: "RESOLVED" } }),
    prisma.curatedEvent.count({ where: { isActive: false } }),
    prisma.curatedEvent.count(),
  ]);

  const openRows = await prisma.curatedEvent.findMany({
    where: { isActive: true, status: "OPEN" },
    select: {
      gameId: true,
      title: true,
      startsAt: true,
      selectedBy: true,
    },
    orderBy: { startsAt: "asc" },
    take: 30,
  });

  const { games, diagnostics } = await buildEuropeanCurationGamesPayload(new Set());

  console.log("\n=== CURATED EVENT LIFECYCLE AUDIT ===");
  console.log("Forensic logging enabled:", isCuratedLifecycleForensicEnabled());
  console.log("PREDICTIO_RAW_FEED_MODE:", isRawFeedMode());
  console.log(
    "Protocol registry (default):",
    String(process.env.PREDICTIO_EDITORIAL_CATALOG_ONLY ?? "").trim() === ""
      ? "ON"
      : "OFF (editorial only)",
  );
  console.log("CATALOG_TARGET_SIZE (editorial-only pick cap):", CATALOG_TARGET_SIZE);
  console.log("\nDB totals:");
  console.log("  total rows:", total);
  console.log("  OPEN + isActive:", openActive);
  console.log("  LOCKED:", locked);
  console.log("  RESOLVED:", resolved);
  console.log("  isActive=false:", inactive);
  console.log("\nDB_OPEN top titles:", openRows.map((r) => r.title).slice(0, 15));
  console.log("\nPipeline this run:");
  console.log("  totalFromAzuro:", diagnostics.totalFromAzuro);
  console.log("  pickedCount (max persistable in curated mode):", diagnostics.pickedCount);
  console.log("  games.length:", games.length);
  console.log("\nWriters (see CURATED_LIFECYCLE_INVENTORY log):", CURATED_LIFECYCLE_WRITERS.length);

  console.log("\n--- Collapse diagnosis ---");
  console.log(
    `Pipeline valid for registry: ${games.length} (expect ~113 raw). Persistence: syncProtocolRegistryToPrisma on boot + GET.`,
  );
  console.log(
    "If DB_OPEN=0: run backend boot, check Prisma migrations (sport/sportSlug), DATABASE_URL target.",
  );
  console.log(
    `Legacy editorial-only (PREDICTIO_EDITORIAL_CATALOG_ONLY=true) caps at ${CATALOG_TARGET_SIZE} — do not use in production AMM.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
