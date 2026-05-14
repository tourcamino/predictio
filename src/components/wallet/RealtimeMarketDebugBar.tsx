import { useMemo } from "react";
import { useTradingStore } from "~/store/tradingStore";

/** Dev-only: `VITE_REALTIME_PNL_DEBUG=1` — realtime market slice (quotes, book, tape, WS). */
export function RealtimeMarketDebugBar() {
  if (!import.meta.env.DEV || import.meta.env.VITE_REALTIME_PNL_DEBUG !== "1") {
    return null;
  }

  return <RealtimeMarketDebugBarInner />;
}

function RealtimeMarketDebugBarInner() {
  const wsStatus = useTradingStore((s) => s.wsStatus);
  const wsSubscribedMarketCount = useTradingStore((s) => s.wsSubscribedMarketCount);
  const marketPrices = useTradingStore((s) => s.marketPrices);
  const orderbooks = useTradingStore((s) => s.orderbooks);
  const recentTrades = useTradingStore((s) => s.recentTrades);

  const priceKeys = Object.keys(marketPrices).length;
  const orderbookDepth = useMemo(
    () =>
      Object.values(orderbooks).reduce(
        (acc, ob) => acc + ob.bids.length + ob.asks.length,
        0,
      ),
    [orderbooks],
  );
  const recentTradesCount = useMemo(
    () => Object.values(recentTrades).reduce((acc, rows) => acc + rows.length, 0),
    [recentTrades],
  );

  const lastTick = useMemo(() => {
    let best: { id: string; ts: number } | null = null;
    for (const id of Object.keys(marketPrices)) {
      const p = marketPrices[id];
      if (!p) continue;
      if (!best || p.timestamp > best.ts) best = { id, ts: p.timestamp };
    }
    return best ? `${best.id.slice(0, 10)}… ts=${best.ts}` : "—";
  }, [marketPrices]);

  return (
    <div className="pointer-events-none fixed bottom-2 right-2 z-[20000] max-w-[min(100vw-1rem,22rem)] rounded border border-cyan-500/40 bg-black/85 px-2 py-1.5 font-mono text-[10px] leading-snug text-cyan-100 shadow-lg">
      <div className="font-semibold text-cyan-300/90">realtime market slice</div>
      <div>ws: {wsStatus}</div>
      <div>WS subscribed markets: {wsSubscribedMarketCount}</div>
      <div>marketPrices keys: {priceKeys}</div>
      <div>orderbook depth (bid+ask levels): {orderbookDepth}</div>
      <div>recentTrades rows (all mkts): {recentTradesCount}</div>
      <div className="truncate opacity-90" title={lastTick}>
        last tick: {lastTick}
      </div>
      <div className="opacity-75">live PnL = tRPC row + deriveLivePositionFromQuote</div>
    </div>
  );
}
