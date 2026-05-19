/**
 * PR23B — Continuous homepage layers with inventory continuity guarantees.
 */
import type { AzuroMarket } from "~/services/azuro";
import {
  classifyInventoryBucket,
  computeInventoryBucketCounts,
  isMajorEvent,
  type InventoryBucketId,
} from "~/lib/inventory/inventoryBuckets";
import {
  computeMarketPriorityScore,
} from "~/lib/markets/marketPriorityEngine";
import { isFootballMarket } from "~/lib/footballFirstView";
import { marketCompetitionLabel } from "~/lib/marketViewSafety";

export type HomepageLayerId =
  | "live_now"
  | "starting_soon"
  | "most_active"
  | "biggest_movers"
  | "major_upcoming"
  | "this_week"
  | "long_conviction";

export type HomepageLayer = {
  id: HomepageLayerId;
  label: string;
  description: string;
  markets: AzuroMarket[];
};

function kickoffMs(m: AzuroMarket): number {
  const t = Date.parse(m.event?.startsAt ?? m.endsAt ?? "");
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

function bucketInput(m: AzuroMarket) {
  return {
    kickoffMs: kickoffMs(m),
    leagueName: marketCompetitionLabel(m),
    status: m.status,
    isLive: m.status === "live" || m.azuroStatus === "LIVE",
  };
}

function primaryYesPrice(m: AzuroMarket): number | undefined {
  const o = m.outcomes?.[0];
  return o?.price;
}

function vitalityScore(m: AzuroMarket, nowMs: number): number {
  return computeMarketPriorityScore(
    {
      marketId: m.id,
      kickoffMs: kickoffMs(m),
      leagueName: marketCompetitionLabel(m),
      volume24h: m.volume24h,
      traderCount: m.traders,
      openInterestUsd: m.liquidity,
      isLive: m.status === "live",
      isTradable: m.status !== "resolved" && m.status !== "locked",
      primaryOutcomePrice: primaryYesPrice(m),
    },
    nowMs,
  );
}

function convictionSpread(m: AzuroMarket): number {
  const prices = (m.outcomes ?? []).map((o) => o.price).sort((a, b) => a - b);
  if (prices.length < 2) return 0;
  return (prices[prices.length - 1] ?? 0) - (prices[0] ?? 0);
}

function pickUnique(
  pool: AzuroMarket[],
  limit: number,
  seen: Set<string>,
): AzuroMarket[] {
  const out: AzuroMarket[] = [];
  for (const m of pool) {
    if (out.length >= limit) break;
    const key = m.azuroGameId ?? m.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

function footballPool(markets: readonly AzuroMarket[]): AzuroMarket[] {
  const football = markets.filter(isFootballMarket);
  return football.length > 0 ? football : [...markets];
}

/** Ensure imminent, mid-term, and long-term buckets each have representation. */
export function ensureInventoryContinuity(
  layers: HomepageLayer[],
  fullPool: AzuroMarket[],
): HomepageLayer[] {
  const counts = computeInventoryBucketCounts(fullPool.map(bucketInput));
  const seen = new Set<string>();
  for (const layer of layers) {
    for (const m of layer.markets) seen.add(m.azuroGameId ?? m.id);
  }

  const imminentBuckets: InventoryBucketId[] = ["LIVE_NOW", "STARTING_SOON", "NEXT_24H"];
  const midBuckets: InventoryBucketId[] = ["NEXT_72H", "THIS_WEEK"];
  const longBuckets: InventoryBucketId[] = ["THIS_MONTH"];

  const hasImminent = imminentBuckets.some((b) => counts[b] > 0);
  const hasMid = midBuckets.some((b) => counts[b] > 0);
  const hasLong = longBuckets.some((b) => counts[b] > 0);

  const ranked = [...fullPool].sort(
    (a, b) => vitalityScore(b, nowMs) - vitalityScore(a, nowMs),
  );

  const inject = (layerId: HomepageLayerId, filter: (m: AzuroMarket) => boolean) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer || layer.markets.length > 0) return;
    const fill = pickUnique(ranked.filter(filter), 4, seen);
    if (fill.length > 0) layer.markets = fill;
  };

  if (!hasImminent) {
    inject("starting_soon", (m) => {
      const h = (kickoffMs(m) - Date.now()) / 3_600_000;
      return h >= 0 && h <= 72;
    });
  }
  if (!hasMid) {
    inject("this_week", (m) => {
      const h = (kickoffMs(m) - Date.now()) / 3_600_000;
      return h > 24 && h <= 168;
    });
  }
  if (!hasLong) {
    inject("long_conviction", (m) => {
      const h = (kickoffMs(m) - Date.now()) / 3_600_000;
      return h > 168;
    });
  }

  return layers.filter((l) => l.markets.length > 0);
}

export function buildContinuousHomepageLayers(
  markets: readonly AzuroMarket[],
  opts: { perLayer?: number } = {},
): HomepageLayer[] {
  const perLayer = opts.perLayer ?? 6;
  const nowMs = Date.now();
  const pool = footballPool([...markets]);
  const seen = new Set<string>();
  const byVitality = [...pool].sort(
    (a, b) => vitalityScore(b, nowMs) - vitalityScore(a, nowMs),
  );

  const liveNow = pickUnique(
    pool.filter((m) => classifyInventoryBucket(bucketInput(m), nowMs) === "LIVE_NOW"),
    perLayer,
    seen,
  );

  const startingSoon = pickUnique(
    pool.filter((m) => classifyInventoryBucket(bucketInput(m), nowMs) === "STARTING_SOON"),
    perLayer,
    seen,
  );

  const mostActive = pickUnique(
    [...pool].sort((a, b) => b.traders * b.volume24h - a.traders * a.volume24h),
    perLayer,
    seen,
  );

  const biggestMovers = pickUnique(
    [...pool].sort((a, b) => convictionSpread(b) - convictionSpread(a)),
    perLayer,
    seen,
  );

  const majorUpcoming = pickUnique(
    pool
      .filter((m) => isMajorEvent(bucketInput(m)))
      .sort((a, b) => kickoffMs(a) - kickoffMs(b)),
    perLayer,
    seen,
  );

  const thisWeek = pickUnique(
    pool.filter((m) => {
      const b = classifyInventoryBucket(bucketInput(m), nowMs);
      return b === "NEXT_72H" || b === "THIS_WEEK";
    }),
    perLayer,
    seen,
  );

  const longConviction = pickUnique(
    pool
      .filter((m) => classifyInventoryBucket(bucketInput(m), nowMs) === "THIS_MONTH")
      .sort((a, b) => vitalityScore(b, nowMs) - vitalityScore(a, nowMs)),
    perLayer,
    seen,
  );

  if (liveNow.length === 0 && startingSoon.length === 0) {
    const soonFallback = pickUnique(
      pool.filter((m) => {
        const h = (kickoffMs(m) - nowMs) / 3_600_000;
        return h >= 0 && h <= 24;
      }),
      perLayer,
      seen,
    );
    startingSoon.push(...soonFallback);
  }

  if (majorUpcoming.length === 0) {
    majorUpcoming.push(
      ...pickUnique(byVitality.filter((m) => europeanTopTier(m)), perLayer, seen),
    );
  }

  const layers: HomepageLayer[] = [
    {
      id: "live_now",
      label: "Live now",
      description: "Matches in play — trade in real time",
      markets: liveNow,
    },
    {
      id: "starting_soon",
      label: "Starting soon",
      description: "Kickoff within 3 hours — immediate execution",
      markets: startingSoon,
    },
    {
      id: "most_active",
      label: "Most active",
      description: "Highest trader × volume in catalog",
      markets: mostActive,
    },
    {
      id: "biggest_movers",
      label: "Biggest movers",
      description: "Widest conviction spread — price disagreement",
      markets: biggestMovers,
    },
    {
      id: "major_upcoming",
      label: "Major upcoming",
      description: "Premier League, UCL, Euros, World Cup anchors",
      markets: majorUpcoming,
    },
    {
      id: "this_week",
      label: "This week",
      description: "Swing window — 3 to 7 days out",
      markets: thisWeek,
    },
    {
      id: "long_conviction",
      label: "Long conviction",
      description: "Multi-week positioning — macro event trades",
      markets: longConviction,
    },
  ];

  return ensureInventoryContinuity(layers, pool);
}

function europeanTopTier(m: AzuroMarket): boolean {
  const league = marketCompetitionLabel(m);
  return /premier|champions|serie a|bundesliga|la liga|ligue 1|europa|world cup|euro/i.test(
    league,
  );
}
