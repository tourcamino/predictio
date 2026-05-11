import type { Market } from "~/data/mockMarkets";
import type { AzuroMarket } from "~/services/azuro";
import { normalizeYesNoUnitPrices } from "~/server/utils/prismaMarket";

/** Maps Azuro GraphQL detail (`fetchAzuroGameDetail`) to the UI `Market` shape used across tRPC + loaders. */
export function azuroDetailToMarket(azuroMarket: AzuroMarket): Market {
  const teamA = azuroMarket.event.teams[0] || "Team A";
  const teamB = azuroMarket.event.teams[1] || "Team B";

  let yesPrice: number;
  let noPrice: number;
  let percentDraw: number | undefined;
  const o = azuroMarket.outcomes;

  if (o.length >= 3) {
    const h = Number(o[0]?.price);
    const d = Number(o[1]?.price);
    const a = Number(o[2]?.price);
    const sum =
      (Number.isFinite(h) ? h : 0) +
        (Number.isFinite(d) ? d : 0) +
        (Number.isFinite(a) ? a : 0) || 1;
    yesPrice = Math.max(0.01, Math.min(0.98, (Number.isFinite(h) ? h : 0) / sum));
    const drawP = (Number.isFinite(d) ? d : 0) / sum;
    noPrice = Math.max(0.01, Math.min(0.98, (Number.isFinite(a) ? a : 0) / sum));
    percentDraw = Math.round(drawP * 100);
  } else {
    const yesRaw = Number(o[0]?.price ?? 0.5);
    const noRaw = o[1]?.price != null ? Number(o[1].price) : undefined;
    const norm = normalizeYesNoUnitPrices(yesRaw, noRaw);
    yesPrice = norm.yesPrice;
    noPrice = norm.noPrice;
  }

  const kickoff = new Date(azuroMarket.event.startsAt);

  let result: "yes" | "no" | "draw" | undefined;
  if (azuroMarket.azuroResult === "home") result = "yes";
  else if (azuroMarket.azuroResult === "away") result = "no";
  else if (azuroMarket.azuroResult === "draw") result = "draw";

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
    percentDraw,
    drawOdds: azuroMarket.drawOdds ?? null,
    predictions: azuroMarket.traders,
  };
}
