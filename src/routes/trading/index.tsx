import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { EmptyTradingState } from '~/components/trading/EmptyTradingState';
import { PositionsList } from '~/components/trading/PositionsList';
import { PositionDetail } from '~/components/trading/PositionDetail';
import { OrderHistory } from '~/components/trading/OrderHistory';
import { useTradingStore } from '~/store/tradingStore';
import { deriveLivePositionFromQuote } from '~/lib/trading/deriveLivePositionFromQuote';
import { Users, Copy } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { normalizeWalletForQuery, clientChainScopeForTrpc } from '~/utils/walletQuery';
import {
  mapDbOrdersToTradingPositions,
  mapDemoPositionToTradingPosition,
} from '~/lib/trading/mapDbOrderToTradingPosition';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';

export const Route = createFileRoute('/trading/')({
  component: TradingPage,
});

function TradingPage() {
  const { isConnected, address, chainId } = useWallet();
  const { cashUsdc: paperCash } = usePaperWalletBalance();
  const { positions: demoPositions, balance: demoBalance } = useDemoAccount();
  const trpc = useTRPC();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);

  const selectedPositionId = useTradingStore((state) => state.selectedPositionId);
  const selectPosition = useTradingStore((state) => state.selectPosition);
  const marketPrices = useTradingStore((s) => s.marketPrices);
  const navigate = useNavigate();

  const positionsQuery = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: walletKey ?? '',
      status: 'open',
      clientChainId: chainScope,
    }),
    enabled: !!walletKey && isConnected,
  });

  const orders = positionsQuery.data?.positions ?? [];
  const positionMarketIds = useMemo(
    () => [...new Set(orders.map((o) => o.marketId))],
    [orders],
  );

  const marketSummariesQuery = useQuery({
    ...trpc.getMarketSummaries.queryOptions({
      marketIds: positionMarketIds,
    }),
    enabled: !!walletKey && isConnected && positionMarketIds.length > 0,
    staleTime: 30_000,
  });

  const dbTradingPositions = useMemo(
    () => mapDbOrdersToTradingPositions(orders, marketSummariesQuery.data ?? {}),
    [orders, marketSummariesQuery.data],
  );

  const demoTradingPositions = useMemo(
    () => demoPositions.map((p, i) => mapDemoPositionToTradingPosition(p, i)),
    [demoPositions],
  );

  const displayPositions = isConnected ? dbTradingPositions : demoTradingPositions;

  const currentBalance = isConnected ? paperCash : demoBalance;

  /** Paper wallet: selection only — rows from tRPC; `tradingStore` holds quotes + `selectedPositionId` only. */
  useEffect(() => {
    if (!isConnected || !walletKey) return;
    const ids = new Set(dbTradingPositions.map((p) => p.id));
    if (selectedPositionId && !ids.has(selectedPositionId)) {
      selectPosition(dbTradingPositions[0]?.id ?? null);
    } else if (!selectedPositionId && dbTradingPositions.length > 0) {
      selectPosition(dbTradingPositions[0]!.id);
    }
  }, [isConnected, walletKey, dbTradingPositions, selectedPositionId, selectPosition]);

  /** Guest demo: ensure a valid selection for the desktop split view. */
  useEffect(() => {
    if (isConnected) return;
    if (demoTradingPositions.length === 0) return;
    const ids = new Set(demoTradingPositions.map((p) => p.id));
    if (!selectedPositionId || !ids.has(selectedPositionId)) {
      selectPosition(demoTradingPositions[0]!.id);
    }
  }, [isConnected, demoTradingPositions, selectedPositionId, selectPosition]);

  const selectedPosition = displayPositions.find((p) => p.id === selectedPositionId);

  const positionsLoading = isConnected && !!walletKey && positionsQuery.isLoading;
  const hasPositions = displayPositions.length > 0;

  if (positionsLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <p className="text-gray-400">Loading positions…</p>
      </div>
    );
  }

  if (!hasPositions) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="font-syne font-bold text-4xl mb-2">Trading</h1>
              <p className="text-gray-400">Manage your active positions</p>
              {!isConnected && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <span className="text-xs text-purple-400 font-semibold">
                    DEMO MODE · ${demoBalance.toFixed(0)} USDC virtual balance
                  </span>
                </div>
              )}
              {isConnected && positionsQuery.isError && (
                <p className="mt-3 text-sm text-red-400">Could not load positions. Try again shortly.</p>
              )}
            </div>
            <EmptyTradingState />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 px-6 py-4 bg-brand-green/10 border border-brand-green/30 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <span className="text-sm sm:text-base text-gray-300">
                <span className="font-semibold text-white">New to trading?</span> Copy top traders automatically.
              </span>
            </div>
            <a
              href="/copy"
              className="text-brand-green font-semibold text-sm hover:text-brand-green/80 transition-colors whitespace-nowrap"
            >
              Explore Copy Trading →
            </a>
          </div>

          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Trading</h1>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Manage your active positions</p>
                {!isConnected && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                    <span className="text-xs text-purple-400 font-semibold">
                      DEMO MODE · Trading with virtual balance
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Balance: </span>
                <span className="font-mono font-semibold">${currentBalance.toFixed(2)} USDC</span>
                {!isConnected && <span className="ml-2 text-xs text-purple-400">(Virtual)</span>}
              </div>
            </div>
          </div>

          <div className="hidden lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:h-[calc(100vh-280px)]">
            <div className="overflow-hidden">
              <PositionsList positions={displayPositions} />
            </div>

            <div className="overflow-y-auto scrollbar-hide">
              {selectedPosition ? (
                <PositionDetail position={selectedPosition} />
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-center h-full">
                  <p className="text-gray-400">Select a position to view details</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:hidden space-y-4">
            {displayPositions.map((position) => {
              const live = deriveLivePositionFromQuote(
                position,
                marketPrices[position.marketId],
              );
              const terminal =
                position.status === 'resolved' || position.status === 'cancelled';
              const displayPnl = terminal ? position.unrealizedPnl : live.unrealizedPnl;
              const displayValue = terminal ? position.currentValue : live.currentValue;
              const pnlFormatted =
                displayPnl >= 0
                  ? { text: `+$${displayPnl.toFixed(2)}`, colorClass: 'text-brand-green' }
                  : { text: `-$${Math.abs(displayPnl).toFixed(2)}`, colorClass: 'text-red-500' };

              return (
                <button
                  key={position.id}
                  onClick={() => navigate({ to: '/trading/position/$id', params: { id: position.id } })}
                  className="w-full text-left bg-white/5 border border-white/10 rounded-lg p-4 hover:border-brand-green/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{position.marketName}</h3>
                      <p className="text-sm text-gray-400 truncate">{position.outcome}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Current Value</div>
                      <div className="font-mono font-semibold">${displayValue.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Unrealized P&L</div>
                      <div className={`font-mono font-bold ${pnlFormatted.colorClass}`}>{pnlFormatted.text}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {hasPositions && (
            <div className="mt-8 bg-gradient-to-r from-brand-cyan/10 to-brand-green/10 border border-brand-cyan/30 rounded-xl p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-brand-cyan/20 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-brand-cyan" />
                  </div>
                  <div>
                    <h3 className="font-syne font-bold text-2xl mb-2">Discover Social Trading</h3>
                    <p className="text-gray-400">
                      Follow top traders and automatically copy their strategies. Learn from the best while you trade.
                    </p>
                  </div>
                </div>
                <a
                  href="/copy"
                  className="px-8 py-4 bg-brand-cyan text-brand-bg font-bold rounded-lg hover:bg-brand-cyan/90 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Explore Traders
                </a>
              </div>
            </div>
          )}

          {hasPositions && (
            <div className="mt-8">
              <OrderHistory walletAddress={isConnected && walletKey ? walletKey : 'demo'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
