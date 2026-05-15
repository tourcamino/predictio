/**
 * Production DB snapshot — curated_events rows (read-only).
 * Usage on VPS: docker compose -f docker-compose.prod.yml exec -T backend npx tsx src/scripts/auditDbCuratedEvents.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.curatedEvent.findMany({
    orderBy: { selectedAt: "desc" },
    take: 50,
  });

  const openActive = rows.filter((r) => r.isActive && r.status === "OPEN");

  console.log(
    JSON.stringify({
      tag: "audit_db_curated_events",
      totalSampled: rows.length,
      openActiveCount: openActive.length,
      openActive: openActive.map((r) => ({
        title: r.title,
        league: r.leagueName,
        country: r.country,
        status: r.status,
        active: r.isActive,
        score: r.importanceScore,
        autoPublish: r.autoPublish,
        selectedBy: r.selectedBy,
        startsAt: r.startsAt.toISOString(),
        selectedAt: r.selectedAt.toISOString(),
      })),
    }),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
