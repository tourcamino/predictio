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
  const yesPrice = 0.34;
  const noPrice = 0.33;
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
    noPrice,
    volume: 25_000,
    closesAt,
    traders: 150,
    isFeatured: false,
    status,
    start_time: row.startsAt,
    event: row.title,
    percentA: 34,
    percentB: 33,
    /** DB has no draw odds yet — stable default so 1X2 UI always shows Draw */
    percentDraw: 33,
    drawOdds: null,
    predictions: 200,
  };
}
