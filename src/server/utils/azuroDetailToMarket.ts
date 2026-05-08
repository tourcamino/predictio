import type { Market } from "~/data/mockMarkets";
import type { AzuroMarket } from "~/services/azuro";
import { normalizeYesNoUnitPrices } from "~/server/utils/prismaMarket";

/** Maps Azuro GraphQL detail (`fetchAzuroGameDetail`) to the UI `Market` shape used across tRPC + loaders. */
export function azuroDetailToMarket(azuroMarket: AzuroMarket): Market {
  const teamA = azuroMarket.event.teams[0] || "Team A";
  const teamB = azuroMarket.event.teams[1] || "Team B";
  const yesRaw = Number(azuroMarket.outcomes[0]?.price ?? 0.5);
  const noRaw =
    azuroMarket.outcomes[1]?.price != null ? Number(azuroMarket.outcomes[1].price) : undefined;
  const { yesPrice, noPrice } = normalizeYesNoUnitPrices(yesRaw, noRaw);

  const kickoff = new Date(azuroMarket.event.startsAt);

  let result: "yes" | "no" | undefined;
  if (azuroMarket.azuroResult === "home") result = "yes";
  else if (azuroMarket.azuroResult === "away") result = "no";

  let status: Market["status"];
  if (azuroMarket.status === "resolved") {
    status = "resolved";
  } else if (Date.now() >= kickoff.getTime()) {
    status = "closed";
  } else if (azuroMarket.status === "locked") {
    status = "closed";
  } else if (azuroMarket.status === "ending-soon") {
    status = "closing-soon";
  } else {
    status = "open";
  }

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
    start_time: kickoff,
    event: azuroMarket.question,
    traders: azuroMarket.traders,
    isFeatured: azuroMarket.isFeatured || false,
    location: azuroMarket.event.location,
    status,
    result,
    resolved_at:
      azuroMarket.status === "resolved" ? new Date() : undefined,
    percentA: Math.round(yesPrice * 100),
    percentB: Math.round(noPrice * 100),
    predictions: azuroMarket.traders,
  };
}
