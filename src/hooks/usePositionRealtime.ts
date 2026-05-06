import { useEffect } from 'react';
import { getTradingSocket } from '~/lib/realtime/tradingSocket';
import { useTradingStore } from '~/store/tradingStore';

export function usePositionRealtime(marketId: string | null) {
  const marketPrice = useTradingStore((state) =>
    marketId ? state.marketPrices[marketId] : null
  );
  const orderbook = useTradingStore((state) =>
    marketId ? state.orderbooks[marketId] : null
  );
  const recentTrades = useTradingStore((state) =>
    marketId ? state.recentTrades[marketId] || [] : []
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
