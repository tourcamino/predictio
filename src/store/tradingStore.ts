import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * **Realtime market infrastructure** for the trading UI: quotes, orderbook, tape, WS status.
 *
 * **Not** portfolio authority: prediction rows come from **tRPC** (`getUserPositions`, etc.) and
 * `mapDbOrderToTradingPosition`; guest demo from **`demoStorage`**. Live PnL uses
 * `deriveLivePositionFromQuote` against `marketPrices` here plus the row from the server.
 *
 * The exported **`Position`** type is a shared **UI row** shape — it is not stored in this slice.
 *
 * See `docs/DATA-MODEL-GLOSSARY.md`.
 */
export interface Position {
  id: string;
  marketId: string;
  marketName: string;
  outcome: string;
  side: 'YES' | 'NO' | 'DRAW';
  shares: number;
  entryPrice: number;
  costBasis: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  claimableAmount?: number;
  resolvedAt?: Date;
  cancelledAt?: Date;
  openedAt: Date;
  status: 'live' | 'soon' | 'locked' | 'resolved' | 'cancelled';
  marketEndsAt: Date;
}

export interface MarketPrice {
  marketId: string;
  last: number;
  change24h: number;
  changePct24h: number;
  volume24h: number;
  timestamp: number;
}

export interface Orderbook {
  marketId: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

/** One synthetic orderbook tick for UI / WS feeds — not Prisma `Transaction` or `Order`. */
export interface Trade {
  id: string;
  marketId: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  txHash: string;
  timestamp: number;
}

export interface TxResult {
  success: boolean;
  txHash: string;
  mode: 'live' | 'demo';
}

interface TradingState {
  /** Transient UI: which position row is selected in split layouts (id from tRPC or demo). */
  selectedPositionId: string | null;
  marketPrices: Record<string, MarketPrice>;
  orderbooks: Record<string, Orderbook>;
  recentTrades: Record<string, Trade[]>;
  wsStatus: 'connected' | 'reconnecting' | 'offline';
  /** Mirrors `TradingSocketClient` subscription set for dev observability only. */
  wsSubscribedMarketCount: number;
}

interface TradingStore extends TradingState {
  selectPosition: (id: string | null) => void;
  setWsSubscribedMarketCount: (count: number) => void;
  updateMarketPrice: (marketId: string, price: MarketPrice) => void;
  updateOrderbook: (marketId: string, orderbook: Orderbook) => void;
  addTrade: (marketId: string, trade: Trade) => void;
  setWsStatus: (status: 'connected' | 'reconnecting' | 'offline') => void;
  clearMarketData: (marketId: string) => void;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set) => ({
      selectedPositionId: null,
      marketPrices: {},
      orderbooks: {},
      recentTrades: {},
      wsStatus: 'offline',
      wsSubscribedMarketCount: 0,

      selectPosition: (id) => {
        set({ selectedPositionId: id });
      },

      setWsSubscribedMarketCount: (count) => {
        set({ wsSubscribedMarketCount: count });
      },

      updateMarketPrice: (marketId, price) => {
        set((state) => ({
          marketPrices: {
            ...state.marketPrices,
            [marketId]: price,
          },
        }));
      },

      updateOrderbook: (marketId, orderbook) => {
        set((state) => ({
          orderbooks: {
            ...state.orderbooks,
            [marketId]: orderbook,
          },
        }));
      },

      addTrade: (marketId, trade) => {
        set((state) => {
          const existing = state.recentTrades[marketId] || [];
          return {
            recentTrades: {
              ...state.recentTrades,
              [marketId]: [trade, ...existing].slice(0, 20),
            },
          };
        });
      },

      setWsStatus: (status) => {
        set({ wsStatus: status });
      },

      clearMarketData: (marketId) => {
        set((state) => {
          const { [marketId]: _, ...restPrices } = state.marketPrices;
          const { [marketId]: __, ...restOrderbooks } = state.orderbooks;
          const { [marketId]: ___, ...restTrades } = state.recentTrades;
          return {
            marketPrices: restPrices,
            orderbooks: restOrderbooks,
            recentTrades: restTrades,
          };
        });
      },
    }),
    {
      name: 'predictio-trading',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedPositionId: state.selectedPositionId,
      }),
    },
  ),
);
