import type { SeedMarket } from "~/data/seedMarkets";
import type { Market } from "~/data/mockMarkets";

/**
 * Maps Seed/Azuro-shaped markets to legacy `Market` used by `LiveMarketCard` and lifecycle helpers.
 */
export function seedMarketToLiveMarket(m: SeedMarket): Market {
  const teamA = m.event.teams[0] ?? "Home";
  const teamB = m.event.teams[1] ?? "Away";

  const yesPrice = m.outcomes[0]?.price ?? 0.5;
  const noPrice =
    m.outcomes.length >= 2
      ? m.outcomes[1]!.price
      : Math.max(0.01, Math.min(0.99, 1 - yesPrice));

  const start_time = new Date(m.event.startsAt);
  const closesAt = new Date(m.endsAt);

  let legacyStatus: Market["status"] = "open";
  if (m.status === "resolved") legacyStatus = "resolved";
  else if (m.status === "locked") legacyStatus = "closed";

  const market: Market = {
    id: m.id,
    sport: m.sport,
    sportEmoji: m.sportEmoji,
    league: m.competition,
    region: m.event.location ?? "",
    teamA,
    teamB,
    marketType: "moneyline",
    yesPrice,
    noPrice,
    volume: m.volume24h,
    closesAt,
    traders: m.traders,
    isFeatured: m.isFeatured ?? false,
    location: m.event.location,
    status: legacyStatus,
    start_time,
    event: m.event.name,
    predictions: Math.max(1, Math.floor(m.traders * 2.2)),
  };

  if (typeof m.importanceScore === "number" && Number.isFinite(m.importanceScore)) {
    market.importanceScore = m.importanceScore;
  }

  if (m.liquidity > 0) {
    market.liquidity = {
      totalPool: m.liquidity,
      yesSide: m.liquidity * yesPrice,
      noSide: m.liquidity * noPrice,
      volume24h: m.volume24h,
      trades24h: Math.max(1, Math.floor(m.traders / 5)),
      bidPrice: Math.max(0.01, yesPrice - 0.02),
      askPrice: Math.min(0.99, yesPrice + 0.02),
      spread: 0.04,
      spreadPct: 4,
      botActive: true,
    };
  }

  return market;
}
