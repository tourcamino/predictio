/**
 * Trading UI `Position` rows are a **view** of persisted **`Order`** records (paper trading).
 * This adapter maps `getUserPositions` + optional `getMarketSummaries` into the shape
 * expected by `PositionsList` / `PositionDetail` (same shape as `~/store/tradingStore` `Position`).
 *
 * **Semantics:** `Position.id` MUST equal `Order.id` for connected users (real CUIDs).
 * Product copy may say “prediction” or “position”; the DB entity remains `Order`.
 * See `docs/DATA-MODEL-GLOSSARY.md`.
 */
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '~/server/trpc/root';
import type { Market } from '~/data/mockMarkets';
import type { DemoPosition } from '~/lib/demoStorage';
import type { Position } from '~/store/tradingStore';
import { getMarketLifecycleState } from '~/utils/marketLifecycle';
import { MarketLifecycleState } from '~/lib/market/marketLifecycleStateMachine';

export type UserOrderRow = inferRouterOutputs<AppRouter>['getUserPositions']['positions'][number];

function normalizeOutcomeSide(outcome: string): 'YES' | 'NO' | 'DRAW' {
  const u = outcome.toUpperCase();
  if (u === 'YES' || u === 'NO' || u === 'DRAW') return u;
  return 'YES';
}

function quotePriceForSide(
  market: Market | null | undefined,
  side: 'YES' | 'NO' | 'DRAW',
  fallback: number,
): number {
  if (!market) return fallback;
  if (side === 'YES') return market.yesPrice;
  if (side === 'NO') return market.noPrice;
  if (typeof market.percentDraw === 'number' && Number.isFinite(market.percentDraw)) {
    return Math.min(0.99, Math.max(0.01, market.percentDraw / 100));
  }
  return fallback;
}

function buildMarketTitle(order: UserOrderRow, market: Market | null | undefined): string {
  if (market?.teamA && market?.teamB) return `${market.teamA} vs ${market.teamB}`;
  const ev = order.market?.event?.trim();
  if (ev) return ev;
  return order.marketId;
}

function buildOutcomeLabel(side: 'YES' | 'NO' | 'DRAW', market: Market | null | undefined): string {
  if (side === 'DRAW') return 'Draw (X)';
  if (market?.teamA && market?.teamB) {
    return side === 'YES' ? `${market.teamA} wins` : `${market.teamB} wins`;
  }
  return `${side} wins`;
}

function mapOrderToUiStatus(
  order: UserOrderRow,
  market: Market | null | undefined,
): Position['status'] {
  if (order.status === 'resolved') return 'resolved';
  if (order.status === 'closed') return 'resolved';
  const life = market ? getMarketLifecycleState(market) : MarketLifecycleState.OPEN;
  if (
    life === MarketLifecycleState.RESOLVED ||
    life === MarketLifecycleState.CANCELLED ||
    life === MarketLifecycleState.REFUNDED
  ) {
    return 'resolved';
  }
  if (
    life === MarketLifecycleState.LOCKED ||
    life === MarketLifecycleState.RESOLVING ||
    life === MarketLifecycleState.DISPUTED ||
    life === MarketLifecycleState.PAUSED
  ) {
    return 'locked';
  }
  return 'live';
}

export function mapDbOrderToTradingPosition(
  order: UserOrderRow,
  market: Market | null | undefined,
): Position {
  const shares = order.shares ?? 0;
  const entryPrice = order.avgPrice ?? 0;
  const costBasis = shares * entryPrice;
  const side = normalizeOutcomeSide(order.outcome);
  const tokenPrice = quotePriceForSide(market, side, entryPrice);
  const currentValue = shares * tokenPrice;
  const unrealizedPnl = currentValue - costBasis;
  const unrealizedPnlPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

  const closes = order.market?.closesAt;
  const marketEndsAt = closes ? new Date(closes) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    id: order.id,
    marketId: order.marketId,
    marketName: buildMarketTitle(order, market),
    outcome: buildOutcomeLabel(side, market),
    side,
    shares,
    entryPrice,
    costBasis,
    currentValue,
    unrealizedPnl,
    unrealizedPnlPct,
    openedAt: new Date(order.createdAt),
    status: mapOrderToUiStatus(order, market),
    marketEndsAt,
    ...(order.resolvedAt ? { resolvedAt: new Date(order.resolvedAt) } : {}),
  };
}

export function mapDbOrdersToTradingPositions(
  orders: UserOrderRow[],
  marketById: Record<string, Market | null>,
): Position[] {
  return orders.map((o) => mapDbOrderToTradingPosition(o, marketById[o.marketId]));
}

/** Guest demo rows — local-only, not `Order` records. */
export function mapDemoPositionToTradingPosition(demoPos: DemoPosition, index: number): Position {
  return {
    id: `demo-${index}`,
    marketId: demoPos.marketId,
    marketName: demoPos.marketTitle,
    outcome: demoPos.outcome === 'DRAW' ? 'Draw (X)' : `${demoPos.outcome} wins`,
    side: demoPos.outcome,
    shares: demoPos.shares,
    entryPrice: demoPos.avgPrice,
    costBasis: demoPos.shares * demoPos.avgPrice,
    currentValue: demoPos.shares * demoPos.currentPrice,
    unrealizedPnl: demoPos.shares * demoPos.currentPrice - demoPos.shares * demoPos.avgPrice,
    unrealizedPnlPct:
      demoPos.avgPrice > 0
        ? ((demoPos.currentPrice - demoPos.avgPrice) / demoPos.avgPrice) * 100
        : 0,
    openedAt: new Date(demoPos.openedAt),
    status: 'live',
    marketEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}
