#!/usr/bin/env npx tsx
/**
 * PR18 — One-shot protocol vitality: stale retirement + settlement tick hint.
 * Run on VPS: npx tsx backend/scripts/run-protocol-vitality.ts
 */
import { PrismaClient } from "@prisma/client";
import { retireStaleMarketsAndCatalog } from "../src/services/staleMarketRetirement";
import { updateMarketStatuses } from "../src/jobs/marketStatusUpdater";

const prisma = new PrismaClient();

async function main() {
  console.log(JSON.stringify({ phase: "stale_retirement_start", at: new Date().toISOString() }));
  const retirement = await retireStaleMarketsAndCatalog(prisma);
  console.log(JSON.stringify({ phase: "stale_retirement_done", ...retirement }));

  console.log(JSON.stringify({ phase: "market_status_updater_start" }));
  const cycle = await updateMarketStatuses();
  console.log(JSON.stringify({ phase: "market_status_updater_done", cycle }));

  const openCurated = await prisma.curatedEvent.count({
    where: { isActive: true, status: "OPEN" },
  });
  const openMarkets = await prisma.market.count({ where: { status: "open" } });
  const openOrders = await prisma.order.count({ where: { status: "open" } });

  console.log(
    JSON.stringify({
      phase: "vitality_summary",
      openCurated,
      openMarkets,
      openOrders,
      at: new Date().toISOString(),
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
