import { useEffect } from 'react';
import { getTradingSocket } from '~/lib/realtime/tradingSocket';
import type { Trade } from '~/store/tradingStore';
import { useTradingStore } from '~/store/tradingStore';

/** Stable fallback — `|| []` in Zustand selectors returns a new array every run → infinite re-renders. */
const EMPTY_TRADES: Trade[] = [];

export function usePositionRealtime(marketId: string | null) {
  const marketPrice = useTradingStore((state) =>
    marketId ? state.marketPrices[marketId] : null
  );
  const orderbook = useTradingStore((state) =>
    marketId ? state.orderbooks[marketId] : null
  );
  const recentTrades = useTradingStore((state) =>
    marketId ? (state.recentTrades[marketId] ?? EMPTY_TRADES) : EMPTY_TRADES
  );
  const wsStatus = useTradingStore((state) => state.wsStatus);

  useEffect(() => {
    if (!marketId) return;

    const socket = getTradingSocket();
    socket.subscribe(marketId);

    return () => {
      socket.unsubscribe(marketId);
    };
  }, [marketId]);

  return {
    marketPrice,
    orderbook,
    recentTrades,
    wsStatus,
  };
}
