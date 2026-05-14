import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * **Trading UI row** (not a Prisma model). When the wallet is connected in paper mode, each
 * row is an adapter view of a persisted **`Order`** (`mapDbOrderToTradingPosition`). When
 * guest demo is active, rows are built from **`DemoPosition`** in local storage instead.
 *
 * Do not confuse with: `LiquidityPosition` (LP DB), `Transaction` (ledger), or the `Trade`
 * type below (orderbook / WS ticks). See `docs/DATA-MODEL-GLOSSARY.md`.
 */
export interface Position {
  id: string;
  marketId: string;
  marketName: string;
  outcome: string; // "Inter wins"
  side: 'YES' | 'NO' | 'DRAW';
  shares: number;
  entryPrice: number; // avg entry price
  costBasis: number;
  currentValue: number; // derived from current price
  unrealizedPnl: number; // derived
  unrealizedPnlPct: number; // derived
  claimableAmount?: number; // Amount claimable if resolved and won
  resolvedAt?: Date; // When market was resolved
  cancelledAt?: Date; // When market was cancelled
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
  bids: [number, number][]; // [price, size]
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
  positions: Position[];
  selectedPositionId: string | null;
  marketPrices: Record<string, MarketPrice>;
  orderbooks: Record<string, Orderbook>;
  recentTrades: Record<string, Trade[]>;
  wsStatus: 'connected' | 'reconnecting' | 'offline';
}

interface TradingStore extends TradingState {
  selectPosition: (id: string | null) => void;
  setPositions: (positions: Position[]) => void;
  updatePosition: (positionId: string, updates: Partial<Position>) => void;
  removePosition: (positionId: string) => void;
  updateMarketPrice: (marketId: string, price: MarketPrice) => void;
  updateOrderbook: (marketId: string, orderbook: Orderbook) => void;
  addTrade: (marketId: string, trade: Trade) => void;
  setWsStatus: (status: 'connected' | 'reconnecting' | 'offline') => void;
  refreshPositions: () => Promise<void>;
  clearMarketData: (marketId: string) => void;
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      positions: [],
      selectedPositionId: null,
      marketPrices: {},
      orderbooks: {},
      recentTrades: {},
      wsStatus: 'offline',

      // Select position
      selectPosition: (id) => {
        set({ selectedPositionId: id });
      },

      // Set all positions
      setPositions: (positions) => {
        set({ positions });
      },

      // Update a specific position
      updatePosition: (positionId, updates) => {
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === positionId ? { ...p, ...updates } : p
          ),
        }));
      },

      // Remove position (after 100% sell)
      removePosition: (positionId) => {
        set((state) => {
          const newPositions = state.positions.filter((p) => p.id !== positionId);
          return {
            positions: newPositions,
            // If we removed the selected position, select the first remaining one
            selectedPositionId:
              state.selectedPositionId === positionId
                ? newPositions[0]?.id || null
                : state.selectedPositionId,
          };
        });
      },

      // Update market price (from WebSocket)
      updateMarketPrice: (marketId, price) => {
        set((state) => {
          // Calculate position updates for this market
          const updatedPositions = state.positions.map((position) => {
            if (position.marketId === marketId) {
              const currentPrice = price.last;
              const currentValue = position.shares * currentPrice;
              const unrealizedPnl = currentValue - position.costBasis;
              const unrealizedPnlPct =
                position.costBasis > 0 ? (unrealizedPnl / position.costBasis) * 100 : 0;

              return {
                ...position,
                currentValue,
                unrealizedPnl,
                unrealizedPnlPct,
              };
            }
            return position;
          });

          // Return all updates in a single state change
          return {
            marketPrices: {
              ...state.marketPrices,
              [marketId]: price,
            },
            positions: updatedPositions,
          };
        });
      },

      // Update orderbook (from WebSocket)
      updateOrderbook: (marketId, orderbook) => {
        set((state) => ({
          orderbooks: {
            ...state.orderbooks,
            [marketId]: orderbook,
          },
        }));
      },

      // Add trade to recent trades (from WebSocket)
      addTrade: (marketId, trade) => {
        set((state) => {
          const existing = state.recentTrades[marketId] || [];
          return {
            recentTrades: {
              ...state.recentTrades,
              [marketId]: [trade, ...existing].slice(0, 20), // Keep last 20
            },
          };
        });
      },

      // Set WebSocket status
      setWsStatus: (status) => {
        set({ wsStatus: status });
      },

      // Refresh positions (placeholder for future API integration)
      refreshPositions: async () => {
        // TODO: Fetch positions from API
        console.log('[Trading] Refreshing positions...');
      },

      // Clear market data when unsubscribing
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
    }
  )
);
