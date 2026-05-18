import type { Market } from "~/data/mockMarkets";
import type { MarketPrice, Position } from "~/store/tradingStore";

/** Side-aware mark from a UI `Market` row (YES/NO/DRAW moneyline). */
export function sideAwareQuoteFromMarket(
  position: Pick<Position, "marketId" | "side">,
  market: Market,
): MarketPrice {
  const last =
    position.side === "YES"
      ? market.yesPrice
      : position.side === "NO"
        ? market.noPrice
        : (market.percentDraw ?? 50) / 100;
  return {
    marketId: position.marketId,
    last,
    change24h: 0,
    changePct24h: 0,
    volume24h: market.volume ?? 0,
    timestamp: Date.now(),
  };
}

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
