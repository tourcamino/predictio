import type { Market } from "~/data/mockMarkets";
import type { AzuroMarket } from "~/services/azuro";

/** Maps Azuro GraphQL detail (`fetchAzuroGameDetail`) to the UI `Market` shape used across tRPC + loaders. */
export function azuroDetailToMarket(azuroMarket: AzuroMarket): Market {
  const teamA = azuroMarket.event.teams[0] || "Team A";
  const teamB = azuroMarket.event.teams[1] || "Team B";
  const yesPrice = azuroMarket.outcomes[0]?.price || 0.5;
  const noPrice = azuroMarket.outcomes[1]?.price || 0.5;

  return {
    id: azuroMarket.id,
    sport: azuroMarket.sport,
    sportEmoji: azuroMarket.sportEmoji,
    league: azuroMarket.competition,
    region: azuroMarket.event.location || "International",
    teamA,
    teamB,
    marketType: "moneyline",
    yesPrice,
    noPrice,
    volume: azuroMarket.volume24h,
    closesAt: new Date(azuroMarket.endsAt),
    start_time: new Date(azuroMarket.event.startsAt),
    event: azuroMarket.question,
    traders: azuroMarket.traders,
    isFeatured: azuroMarket.isFeatured || false,
    location: azuroMarket.event.location,
    status:
      azuroMarket.status === "resolved"
        ? "resolved"
        : azuroMarket.status === "locked"
          ? "closed"
          : azuroMarket.status === "ending-soon"
            ? "closing-soon"
            : "open",
    percentA: Math.round(yesPrice * 100),
    percentB: Math.round(noPrice * 100),
    predictions: azuroMarket.traders,
  };
}
