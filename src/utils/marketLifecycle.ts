import type { Market } from "~/data/mockMarkets";
import {
  deriveMarketLifecycleFromUiMarket,
  MarketLifecycleState,
} from "~/lib/market/marketLifecycleStateMachine";

/**
 * @deprecated Prefer `getMarketLifecycleState` + `MarketLifecycleState` for new code.
 * Three-way label kept for countdown copy and legacy components.
 */
export type MarketLifecycleStatus = "open" | "locked" | "resolved";

function canonicalToLegacy3(s: MarketLifecycleState): MarketLifecycleStatus {
  if (s === MarketLifecycleState.OPEN) return "open";
  if (s === MarketLifecycleState.RESOLVED) return "resolved";
  return "locked";
}

/** Single authority: optional `market.lifecycleState` or derive from UI fields. */
export function getMarketLifecycleState(market: Market): MarketLifecycleState {
  if (market.lifecycleState) return market.lifecycleState;
  return deriveMarketLifecycleFromUiMarket(market);
}

export function getMarketStatus(market: Market): MarketLifecycleStatus {
  return canonicalToLegacy3(getMarketLifecycleState(market));
}

export function isMarketTradeable(market: Market): boolean {
  return getMarketLifecycleState(market) === MarketLifecycleState.OPEN;
}

export function getTimeUntilLock(market: Market): number {
  const status = getMarketStatus(market);
  if (status !== "open") {
    return 0;
  }

  const now = new Date();
  const timeRemaining = market.start_time.getTime() - now.getTime();
  return Math.max(0, timeRemaining);
}

export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "Closed";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
