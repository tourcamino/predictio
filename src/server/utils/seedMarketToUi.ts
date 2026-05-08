import type { SeedMarket } from "~/data/seedMarkets";
import type { Market } from "~/data/mockMarkets";

function seedStatusToUi(s: SeedMarket["status"], endsAt: Date): Market["status"] {
  switch (s) {
    case "resolved":
      return "resolved";
    case "locked":
      return "closed";
    case "ending-soon":
      return "closing-soon";
    case "live":
      return "closed";
    case "upcoming":
    default: {
      const ms = endsAt.getTime() - Date.now();
      if (ms > 0 && ms < 2 * 60 * 60 * 1000) return "closing-soon";
      return "open";
    }
  }
}

export function seedMarketToUiMarket(seedMarket: SeedMarket): Market {
  const closesAt = new Date(seedMarket.endsAt);
  return {
    id: seedMarket.id,
    sport: seedMarket.sport,
    sportEmoji: seedMarket.sportEmoji,
    league: seedMarket.competition,
    region: seedMarket.event.location || "International",
    teamA: seedMarket.event.teams[0] || "Team A",
    teamB: seedMarket.event.teams[1] || "Team B",
    marketType: "moneyline",
    yesPrice: seedMarket.outcomes[0]?.price || 0.5,
    noPrice: seedMarket.outcomes[1]?.price || 0.5,
    volume: seedMarket.volume24h,
    closesAt,
    start_time: new Date(seedMarket.event.startsAt),
    event: seedMarket.event.name,
    traders: seedMarket.traders,
    isFeatured: seedMarket.isFeatured || false,
    location: seedMarket.event.location,
    status: seedStatusToUi(seedMarket.status, closesAt),
    percentA: Math.round((seedMarket.outcomes[0]?.price || 0.5) * 100),
    percentB: Math.round((seedMarket.outcomes[1]?.price || 0.5) * 100),
    predictions: seedMarket.traders,
  };
}
