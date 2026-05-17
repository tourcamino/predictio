import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import { isAwaitingOracleSettlement } from "~/lib/position/derivePositionLifecycle";
import { getMarketLifecycleState } from "~/utils/marketLifecycle";
import { MarketLifecycleState } from "~/lib/market/marketLifecycleStateMachine";

export type MarketProtocolLabel =
  | "LIVE MARKET"
  | "ORACLE PENDING"
  | "RESOLVED"
  | "UPCOMING";

export function getMarketProtocolLabel(
  market: Market | null | undefined,
  order?: UserOrderRow | null,
): MarketProtocolLabel {
  if (!market) return "UPCOMING";
  const life = getMarketLifecycleState(market);
  if (life === MarketLifecycleState.RESOLVED || market.status === "resolved") {
    return "RESOLVED";
  }
  if (
    order &&
    isAwaitingOracleSettlement(order, market)
  ) {
    return "ORACLE PENDING";
  }
  if (
    life === MarketLifecycleState.RESOLVING ||
    life === MarketLifecycleState.LOCKED
  ) {
    return "ORACLE PENDING";
  }
  const now = Date.now();
  const kickoff = market.start_time?.getTime?.() ?? 0;
  if (kickoff > 0 && kickoff <= now && market.status !== "open") {
    return "ORACLE PENDING";
  }
  if (market.status === "closing-soon" || (kickoff > 0 && kickoff <= now)) {
    return "LIVE MARKET";
  }
  return "UPCOMING";
}

export function formatClosesIn(closesAt: Date | null | undefined): string | null {
  if (!closesAt) return null;
  const ms = closesAt.getTime() - Date.now();
  if (ms <= 0) return "Trading closed — settlement pending";
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (h >= 24) return `Closes in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `Closes in ${h}h ${m}m`;
  return `Closes in ${m}m`;
}

export function priceMovementLabel(
  entry: number,
  current: number,
): { label: string; unchanged: boolean; pct: number } {
  const e = entry > 0 ? entry : 0.5;
  const c = current > 0 ? current : e;
  const pct = e > 0 ? ((c - e) / e) * 100 : 0;
  const unchanged = Math.abs(c - e) < 0.005;
  if (unchanged) {
    return { label: "Market unchanged", unchanged: true, pct: 0 };
  }
  const sign = pct >= 0 ? "+" : "";
  return {
    label: `${sign}${pct.toFixed(1)}% vs entry`,
    unchanged: false,
    pct,
  };
}

export function isOracleStaleForDisplay(
  market: Market | null | undefined,
): boolean {
  if (!market?.closesAt) return false;
  const closed = market.closesAt.getTime() < Date.now();
  const life = market ? getMarketLifecycleState(market) : MarketLifecycleState.OPEN;
  return (
    closed &&
    life !== MarketLifecycleState.RESOLVED &&
    market.status !== "resolved"
  );
}

export function marketSupportsDraw(market: Market | null | undefined): boolean {
  return Boolean(market?.percentDraw && market.percentDraw > 0);
}
