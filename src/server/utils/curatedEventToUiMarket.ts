import type { Market } from "~/data/mockMarkets";
import type { CuratedEvent } from "@prisma/client";

function curatedStatusToUi(
  row: CuratedEvent,
): Market["status"] {
  if (row.status === "RESOLVED") return "resolved";
  if (row.status === "LOCKED") return "closed";
  const now = Date.now();
  const lockMs = row.lockedAt.getTime();
  if (now >= lockMs) return "closed";
  const msToLock = lockMs - now;
  if (msToLock > 0 && msToLock < 2 * 60 * 60 * 1000) return "closing-soon";
  return "open";
}

/** Builds UI `Market` from an active `CuratedEvent` row (same DB as Prisma). */
export function curatedEventRowToUiMarket(
  row: CuratedEvent,
  canonicalId: string,
): Market {
  const yesPrice = 0.5;
  const closesAt = row.lockedAt;
  const status = curatedStatusToUi(row);

  return {
    id: canonicalId,
    sport: "football",
    sportEmoji: "⚽",
    league: row.leagueName,
    region: row.country,
    teamA: row.homeTeam,
    teamB: row.awayTeam,
    marketType: "moneyline",
    yesPrice,
    noPrice: 1 - yesPrice,
    volume: 25_000,
    closesAt,
    traders: 150,
    isFeatured: false,
    status,
    start_time: row.startsAt,
    event: row.title,
    percentA: 50,
    percentB: 50,
    predictions: 200,
  };
}
