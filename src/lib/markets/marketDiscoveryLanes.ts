import type { SeedMarket } from "~/data/seedMarkets";
import { isSeedMarketTradable } from "~/utils/seedMarketTrading";

export type DiscoveryLaneId =
  | "live_now"
  | "trending"
  | "highest_activity"
  | "ending_soon"
  | "high_disagreement"
  | "oracle_pending"
  | "probability_movers";

export type DiscoveryLane = {
  id: DiscoveryLaneId;
  label: string;
  description: string;
  markets: SeedMarket[];
};

function primaryYesPrice(m: SeedMarket): number {
  const outcomes = m.outcomes ?? [];
  const y = outcomes.find((o) => /yes|home|1\b/i.test(o.label)) ?? outcomes[0];
  return y?.price ?? 0.5;
}

function disagreementScore(m: SeedMarket): number {
  const p = primaryYesPrice(m);
  return 1 - Math.abs(p - 0.5) * 2;
}

function convictionSpread(m: SeedMarket): number {
  const outcomes = m.outcomes ?? [];
  if (outcomes.length < 2) return 0;
  const prices = m.outcomes.map((o) => o.price).sort((a, b) => a - b);
  return (prices[prices.length - 1] ?? 0) - (prices[0] ?? 0);
}

export function buildMarketDiscoveryLanes(markets: SeedMarket[]): DiscoveryLane[] {
  const tradable = markets.filter(isSeedMarketTradable);

  const liveNow = tradable
    .filter((m) => m.status === "live" || m.status === "ending-soon")
    .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
    .slice(0, 8);

  const trending = [...tradable]
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 8);

  const highestActivity = [...tradable]
    .sort((a, b) => b.traders * b.volume24h - a.traders * a.volume24h)
    .slice(0, 8);

  const endingSoon = [...tradable]
    .filter((m) => {
      const ms = new Date(m.endsAt).getTime() - Date.now();
      return ms > 0 && ms < 48 * 3_600_000;
    })
    .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
    .slice(0, 8);

  const highDisagreement = [...tradable]
    .sort((a, b) => disagreementScore(b) - disagreementScore(a))
    .slice(0, 8);

  const oraclePending = tradable
    .filter((m) => m.status === "locked" || m.status === "ending-soon")
    .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())
    .slice(0, 8);

  const probabilityMovers = [...tradable]
    .sort((a, b) => convictionSpread(b) - convictionSpread(a))
    .slice(0, 8);

  const lanes: DiscoveryLane[] = [
    {
      id: "live_now",
      label: "Live now",
      description: "Matches in play or closing imminently",
      markets: liveNow,
    },
    {
      id: "trending",
      label: "Trending volume",
      description: "Highest 24h volume in catalog",
      markets: trending,
    },
    {
      id: "highest_activity",
      label: "Most active",
      description: "Trader count × volume — real catalog signals",
      markets: highestActivity,
    },
    {
      id: "ending_soon",
      label: "Nearing resolution",
      description: "Closes within 48h",
      markets: endingSoon,
    },
    {
      id: "high_disagreement",
      label: "High disagreement",
      description: "Implied probability near 50/50",
      markets: highDisagreement,
    },
    {
      id: "oracle_pending",
      label: "Oracle pending",
      description: "Trading locked — awaiting resolution",
      markets: oraclePending,
    },
    {
      id: "probability_movers",
      label: "Wide conviction spread",
      description: "Largest gap between outcome prices (current quote)",
      markets: probabilityMovers,
    },
  ];

  return lanes.filter((l) => l.markets.length > 0);
}
