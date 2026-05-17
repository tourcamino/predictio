import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";
import type { Market } from "~/data/mockMarkets";
import { getMarketLifecycleState } from "~/utils/marketLifecycle";
import { MarketLifecycleState } from "~/lib/market/marketLifecycleStateMachine";

export type UserOrderRow =
  inferRouterOutputs<AppRouter>["getUserPositions"]["positions"][number];

export type PositionLifecycleBucket =
  | "OPEN"
  | "LIVE"
  | "SETTLING"
  | "SETTLED"
  | "CLAIMABLE"
  | "CLOSED";

/** Canonical trading UI buckets (PR1 consolidation). */
export type CanonicalTradingBucket = "OPEN" | "SETTLING" | "RESOLVED";

export function toCanonicalTradingBucket(
  bucket: PositionLifecycleBucket,
  orderStatus: string,
): CanonicalTradingBucket {
  if (bucket === "SETTLING") return "SETTLING";
  if (
    orderStatus === "resolved" ||
    orderStatus === "closed" ||
    bucket === "SETTLED" ||
    bucket === "CLAIMABLE" ||
    bucket === "CLOSED"
  ) {
    return "RESOLVED";
  }
  return "OPEN";
}

export function isAwaitingOracleSettlement(
  order: UserOrderRow,
  market: Market | null | undefined,
): boolean {
  if (order.status !== "open") return false;
  const lifecycle = derivePositionLifecycle(order, market);
  const closesAt = lifecycle.closesAt;
  if (!closesAt || closesAt.getTime() > Date.now()) return false;
  const marketStatus = (order.market?.status ?? market?.status ?? "open").toLowerCase();
  return marketStatus === "open" || !order.market?.resolvedAt;
}

export function countAwaitingOracleSettlement(
  positions: UserOrderRow[],
  marketById: Record<string, Market | null | undefined>,
): number {
  return positions.filter((o) =>
    isAwaitingOracleSettlement(o, marketById[o.marketId] ?? null),
  ).length;
}

export type PositionLifecycleView = {
  bucket: PositionLifecycleBucket;
  bucketLabel: string;
  eventPhase: "upcoming" | "live" | "ended" | "settled";
  marketLifecycle: MarketLifecycleState;
  isWinner: boolean | null;
  isLoser: boolean | null;
  isUnsettled: boolean;
  settlementPending: boolean;
  claimable: boolean;
  closeable: boolean;
  entryProbability: number;
  currentProbability: number;
  unrealizedPnl: number;
  realizedPnl: number | null;
  maxPayout: number;
  kickoffAt: Date | null;
  closesAt: Date | null;
  resolvedAt: Date | null;
};

function parseMaybeDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function derivePositionLifecycle(
  order: UserOrderRow,
  market: Market | null | undefined,
): PositionLifecycleView {
  const shares = order.shares ?? 0;
  const avgPrice = order.avgPrice ?? 0;
  const side = order.outcome.toUpperCase();
  const entryProbability = avgPrice > 0 ? avgPrice : 0;
  const currentProbability = market
    ? side === "YES"
      ? market.yesPrice
      : side === "NO"
        ? market.noPrice
        : (market.percentDraw ?? 50) / 100
    : entryProbability;

  const cost = shares * avgPrice;
  const mark = shares * currentProbability;
  const unrealizedPnl = mark - cost;
  const maxPayout = shares * 1;

  const marketLife = market
    ? getMarketLifecycleState(market)
    : order.market?.status === "resolved"
      ? MarketLifecycleState.RESOLVED
      : MarketLifecycleState.OPEN;

  const kickoffAt =
    parseMaybeDate(market?.start_time) ??
    parseMaybeDate(order.market?.closesAt);
  const closesAt =
    parseMaybeDate(market?.closesAt) ??
    parseMaybeDate(order.market?.closesAt);
  const resolvedAt =
    parseMaybeDate(order.resolvedAt) ??
    parseMaybeDate(order.market?.resolvedAt);

  const now = Date.now();
  let eventPhase: PositionLifecycleView["eventPhase"] = "upcoming";
  if (marketLife === MarketLifecycleState.RESOLVED || order.status === "resolved") {
    eventPhase = "settled";
  } else if (kickoffAt && kickoffAt.getTime() <= now) {
    eventPhase =
      marketLife === MarketLifecycleState.RESOLVING ||
      marketLife === MarketLifecycleState.LOCKED
        ? "ended"
        : "live";
  }

  const winnerDb = order.market?.winner?.toUpperCase();
  const isWinner =
    order.status === "resolved" && winnerDb
      ? side === winnerDb
      : order.status === "resolved"
        ? (order.pnl ?? 0) > 0
        : null;
  const isLoser =
    order.status === "resolved" ? (order.pnl ?? 0) < 0 : null;

  const settlementPending =
    order.status === "open" &&
    (marketLife === MarketLifecycleState.RESOLVING ||
      marketLife === MarketLifecycleState.LOCKED ||
      eventPhase === "ended");

  const claimable =
    order.status === "resolved" && (order.pnl ?? 0) > 0;

  const closeable =
    order.status === "open" &&
    marketLife === MarketLifecycleState.OPEN &&
    eventPhase !== "ended";

  let bucket: PositionLifecycleBucket = "OPEN";
  if (order.status === "resolved" || order.status === "closed") {
    bucket = claimable ? "CLAIMABLE" : "SETTLED";
  } else if (settlementPending) {
    bucket = "SETTLING";
  } else if (eventPhase === "live") {
    bucket = "LIVE";
  } else if (order.status === "open") {
    bucket = "OPEN";
  } else {
    bucket = "CLOSED";
  }

  const bucketLabels: Record<PositionLifecycleBucket, string> = {
    OPEN: "Open",
    LIVE: "Live",
    SETTLING: "Settling",
    SETTLED: "Settled",
    CLAIMABLE: "Won",
    CLOSED: "Closed",
  };

  return {
    bucket,
    bucketLabel: bucketLabels[bucket],
    eventPhase,
    marketLifecycle: marketLife,
    isWinner,
    isLoser,
    isUnsettled: order.status === "open",
    settlementPending,
    claimable,
    closeable,
    entryProbability,
    currentProbability,
    unrealizedPnl,
    realizedPnl: order.status === "resolved" ? order.pnl ?? 0 : null,
    maxPayout,
    kickoffAt,
    closesAt,
    resolvedAt,
  };
}

export function groupPositionsByLifecycleBucket<T extends { bucket: PositionLifecycleBucket }>(
  rows: T[],
): Record<PositionLifecycleBucket, T[]> {
  const init = (): Record<PositionLifecycleBucket, T[]> => ({
    OPEN: [],
    LIVE: [],
    SETTLING: [],
    SETTLED: [],
    CLAIMABLE: [],
    CLOSED: [],
  });
  const out = init();
  for (const row of rows) {
    out[row.bucket].push(row);
  }
  return out;
}
