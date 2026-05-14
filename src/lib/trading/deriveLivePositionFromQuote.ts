import type { MarketPrice, Position } from "~/store/tradingStore";

/**
 * Live PnL/value from **DB-backed or demo snapshot** `Position` + optional WS `MarketPrice`.
 * WebSocket feeds **`marketPrices` in `tradingStore` only** — portfolio rows never live in that slice.
 */
export function deriveLivePositionFromQuote(
  position: Position,
  marketPrice: MarketPrice | null | undefined,
): {
  lastPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
} {
  const shares = position.shares;
  const lastPrice =
    marketPrice?.last ??
    (shares > 0 ? position.currentValue / shares : position.entryPrice);
  const currentValue = shares * lastPrice;
  const { costBasis } = position;
  const unrealizedPnl = currentValue - costBasis;
  const unrealizedPnlPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
  return { lastPrice, currentValue, unrealizedPnl, unrealizedPnlPct };
}
