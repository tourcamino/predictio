import type { SeedMarket } from "~/data/seedMarkets";
import { isSeedMarketTradable } from "~/utils/seedMarketTrading";
import {
  classifyInventoryBucket,
  isMajorEvent,
} from "~/lib/inventory/inventoryBuckets";
import {
  computeMarketPriorityScore,
} from "~/lib/markets/marketPriorityEngine";

export type DiscoveryLaneId =
  | "live_now"
  | "starting_soon"
  | "this_week"
  | "major_tournaments"
  | "highest_activity"
  | "probability_movers"
  | "oracle_pending"
  | "settling"
  | "long_conviction";

export type DiscoveryLane = {
  id: DiscoveryLaneId;
  label: string;
  description: string;
  markets: SeedMarket[];
};

function kickoffMs(m: SeedMarket): number {
  const t = Date.parse(m.event?.startsAt ?? m.endsAt ?? "");
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

function bucketInput(m: SeedMarket) {
  return {
    kickoffMs: kickoffMs(m),
    leagueName: m.competition,
    status: m.status,
    isLive: m.status === "live",
  };
}

function primaryYesPrice(m: SeedMarket): number {
  const outcomes = m.outcomes ?? [];
  const y = outcomes.find((o) => /yes|home|1\b/i.test(o.label)) ?? outcomes[0];
  return y?.price ?? 0.5;
}

function convictionSpread(m: SeedMarket): number {
  const prices = (m.outcomes ?? []).map((o) => o.price).sort((a, b) => a - b);
  if (prices.length < 2) return 0;
  return (prices[prices.length - 1] ?? 0) - (prices[0] ?? 0);
}

function vitalityRanked(tradable: SeedMarket[]): SeedMarket[] {
  const now = Date.now();
  return [...tradable].sort(
    (a, b) =>
      computeMarketPriorityScore(
        {
          marketId: b.id,
          kickoffMs: kickoffMs(b),
          leagueName: b.competition,
          volume24h: b.volume24h,
          traderCount: b.traders,
          isLive: b.status === "live",
          primaryOutcomePrice: primaryYesPrice(b),
        },
        now,
      ) -
      computeMarketPriorityScore(
        {
          marketId: a.id,
          kickoffMs: kickoffMs(a),
          leagueName: a.competition,
          volume24h: a.volume24h,
          traderCount: a.traders,
          isLive: a.status === "live",
          primaryOutcomePrice: primaryYesPrice(a),
        },
        now,
      ),
  );
}

export function buildMarketDiscoveryLanes(markets: SeedMarket[]): DiscoveryLane[] {
  const tradable = markets.filter(isSeedMarketTradable);
  const nowMs = Date.now();
  const ranked = vitalityRanked(tradable);

  const liveNow = tradable
    .filter((m) => classifyInventoryBucket(bucketInput(m), nowMs) === "LIVE_NOW")
    .sort((a, b) => kickoffMs(a) - kickoffMs(b))
    .slice(0, 12);

  const startingSoon = tradable
    .filter((m) => classifyInventoryBucket(bucketInput(m), nowMs) === "STARTING_SOON")
    .sort((a, b) => kickoffMs(a) - kickoffMs(b))
    .slice(0, 12);

  const thisWeek = tradable
    .filter((m) => {
      const b = classifyInventoryBucket(bucketInput(m), nowMs);
      return b === "NEXT_24H" || b === "NEXT_72H" || b === "THIS_WEEK";
    })
    .sort((a, b) => kickoffMs(a) - kickoffMs(b))
    .slice(0, 16);

  const majorTournaments = tradable
    .filter((m) => isMajorEvent(bucketInput(m)))
    .sort((a, b) => kickoffMs(a) - kickoffMs(b))
    .slice(0, 12);

  const highestActivity = [...tradable]
    .sort((a, b) => b.traders * b.volume24h - a.traders * a.volume24h)
    .slice(0, 12);

  const probabilityMovers = [...tradable]
    .sort((a, b) => convictionSpread(b) - convictionSpread(a))
    .slice(0, 12);

  const oraclePending = tradable
    .filter((m) => m.status === "locked" || m.status === "ending-soon")
    .sort((a, b) => kickoffMs(a) - kickoffMs(b))
    .slice(0, 12);

  const settling = tradable
    .filter((m) => m.status === "locked" || m.status === "resolved")
    .sort((a, b) => kickoffMs(b) - kickoffMs(a))
    .slice(0, 12);

  const longConviction = tradable
    .filter((m) => classifyInventoryBucket(bucketInput(m), nowMs) === "THIS_MONTH")
    .sort(
      (a, b) =>
        computeMarketPriorityScore(
          {
            marketId: b.id,
            kickoffMs: kickoffMs(b),
            leagueName: b.competition,
            volume24h: b.volume24h,
            traderCount: b.traders,
          },
          nowMs,
        ) -
        computeMarketPriorityScore(
          {
            marketId: a.id,
            kickoffMs: kickoffMs(a),
            leagueName: a.competition,
            volume24h: a.volume24h,
            traderCount: a.traders,
          },
          nowMs,
        ),
    )
    .slice(0, 12);

  const lanes: DiscoveryLane[] = [
    {
      id: "live_now",
      label: "Live",
      description: "Matches in play right now",
      markets: liveNow.length > 0 ? liveNow : ranked.slice(0, 8),
    },
    {
      id: "starting_soon",
      label: "Soon",
      description: "Kickoff within 3 hours",
      markets:
        startingSoon.length > 0
          ? startingSoon
          : tradable
              .filter((m) => {
                const h = (kickoffMs(m) - nowMs) / 3_600_000;
                return h >= 0 && h <= 24;
              })
              .slice(0, 8),
    },
    {
      id: "this_week",
      label: "This week",
      description: "Swing window — next 7 days",
      markets: thisWeek,
    },
    {
      id: "major_tournaments",
      label: "Major tournaments",
      description: "PL, UCL, Euros, World Cup anchors",
      markets:
        majorTournaments.length > 0
          ? majorTournaments
          : ranked.filter((m) => /premier|champions|serie a|bundesliga|la liga/i.test(m.competition)).slice(0, 8),
    },
    {
      id: "highest_activity",
      label: "High activity",
      description: "Most traders × volume",
      markets: highestActivity,
    },
    {
      id: "probability_movers",
      label: "Movers",
      description: "Widest conviction spread",
      markets: probabilityMovers,
    },
    {
      id: "oracle_pending",
      label: "Oracle pending",
      description: "FT — awaiting external oracle",
      markets: oraclePending,
    },
    {
      id: "settling",
      label: "Settling",
      description: "Locked or recently resolved",
      markets: settling,
    },
    {
      id: "long_conviction",
      label: "Long conviction",
      description: "Multi-week macro positioning",
      markets: longConviction,
    },
  ];

  return lanes.filter((l) => l.markets.length > 0);
}

export const DISCOVERY_LANE_TABS: { id: DiscoveryLaneId; label: string }[] = [
  { id: "live_now", label: "Live" },
  { id: "starting_soon", label: "Soon" },
  { id: "this_week", label: "This week" },
  { id: "major_tournaments", label: "Major" },
  { id: "highest_activity", label: "Active" },
  { id: "probability_movers", label: "Movers" },
  { id: "oracle_pending", label: "Oracle" },
  { id: "settling", label: "Settling" },
  { id: "long_conviction", label: "Long" },
];
