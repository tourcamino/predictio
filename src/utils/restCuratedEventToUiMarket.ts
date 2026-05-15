import type { Market } from "~/data/mockMarkets";

/** Shape of `market` from Express `GET /api/markets/:gameId` (JSON). */
export type RestCuratedEventPayload = {
  id: string;
  gameId: string;
  title: string;
  leagueName: string;
  country: string;
  startsAt: string;
  lockedAt: string;
  status: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds?: number | null;
  drawOdds?: number | null;
  awayOdds?: number | null;
};

function curatedStatusToUi(row: RestCuratedEventPayload): Market["status"] {
  const st = String(row.status || "").toUpperCase();
  if (st === "RESOLVED") return "resolved";
  if (st === "LOCKED") return "closed";
  const now = Date.now();
  const lockMs = new Date(row.lockedAt).getTime();
  if (now >= lockMs) return "closed";
  const msToLock = lockMs - now;
  if (msToLock > 0 && msToLock < 2 * 60 * 60 * 1000) return "closing-soon";
  return "open";
}

function baseMarketFields(
  row: RestCuratedEventPayload,
  canonicalId: string,
  status: Market["status"],
  yesPrice: number,
  noPrice: number,
  percentA: number,
  percentB: number,
  extras: Pick<Market, "percentDraw" | "drawOdds"> | Record<string, never>,
): Market {
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
    volume: 0,
    closesAt: new Date(row.lockedAt),
    traders: 0,
    isFeatured: false,
    status,
    start_time: new Date(row.startsAt),
    event: row.title,
    percentA,
    percentB,
    predictions: 0,
    ...extras,
  };
}

/** Same pricing rules as `curatedEventRowToUiMarket` (server), for REST fallback. */
export function restCuratedEventToUiMarket(
  row: RestCuratedEventPayload,
  canonicalId: string,
): Market {
  const status = curatedStatusToUi(row);
  const ho = row.homeOdds;
  const doo = row.drawOdds;
  const ao = row.awayOdds;

  if (ho != null && doo != null && ao != null && ho > 0 && doo > 0 && ao > 0) {
    const ih = 1 / ho;
    const id = 1 / doo;
    const ia = 1 / ao;
    const t = ih + id + ia;
    if (t > 0) {
      const yesPrice = Math.max(0.01, Math.min(0.98, ih / t));
      const noPrice = Math.max(0.01, Math.min(0.98, ia / t));
      const percentA = Math.round(yesPrice * 100);
      const percentDraw = Math.round((id / t) * 100);
      const percentB = Math.max(0, 100 - percentA - percentDraw);
      return baseMarketFields(row, canonicalId, status, yesPrice, noPrice, percentA, percentB, {
        percentDraw,
        drawOdds: doo.toFixed(2),
      });
    }
  }

  if (ho != null && ao != null && ho > 0 && ao > 0) {
    const ih = 1 / ho;
    const ia = 1 / ao;
    const t = ih + ia;
    if (t > 0) {
      const yesPrice = Math.max(0.01, Math.min(0.98, ih / t));
      const noPrice = Math.max(0.01, Math.min(0.98, ia / t));
      const percentA = Math.round(yesPrice * 100);
      const percentB = Math.round(noPrice * 100);
      return baseMarketFields(row, canonicalId, status, yesPrice, noPrice, percentA, percentB, {
        drawOdds: null,
      });
    }
  }

  return baseMarketFields(row, canonicalId, status, 0.45, 0.3, 45, 30, {
    percentDraw: 25,
    drawOdds: null,
  });
}
