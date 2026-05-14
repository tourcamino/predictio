import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { useWallet } from '~/store/useWalletStore';
import { Trophy, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { GuestPageState } from '~/components/GuestPageState';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { normalizeWalletForQuery, clientChainScopeForTrpc } from '~/utils/walletQuery';
import { useMemo, useEffect } from 'react';
import {
  mapDbOrderToTradingPosition,
  type UserOrderRow,
} from '~/lib/trading/mapDbOrderToTradingPosition';

export const Route = createFileRoute('/portfolio/resolved/')({
  component: ResolvedMarketsPage,
});

function sortResolvedOrders(orders: UserOrderRow[]): UserOrderRow[] {
  return [...orders].sort((a, b) => {
    const ta = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
    const tb = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
    return tb - ta;
  });
}

function ResolvedMarketsPage() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected, address, chainId } = useWallet();
  const trpc = useTRPC();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);

  const positionsQuery = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: walletKey,
      status: 'resolved',
      clientChainId: chainScope,
    }),
    enabled: !!walletKey && isConnected,
  });

  const rows = positionsQuery.data?.positions ?? [];
  const marketIds = useMemo(() => [...new Set(rows.map((r) => r.marketId))], [rows]);

  const marketSummariesQuery = useQuery({
    ...trpc.getMarketSummaries.queryOptions({ marketIds }),
    enabled: isConnected && marketIds.length > 0,
    staleTime: 30_000,
  });

  const marketById = marketSummariesQuery.data ?? {};

  const sorted = useMemo(() => sortResolvedOrders(rows), [rows]);

  const totalPositivePnl = useMemo(
    () => sorted.reduce((s, o) => s + Math.max(0, o.pnl ?? 0), 0),
    [sorted],
  );

  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.VITE_SETTLEMENT_DEBUG !== '1') return;
    console.info('[settlement-debug]', {
      settlementSource: 'trpc.getUserPositions',
      statusFilter: 'resolved',
      rowCount: rows.length,
      queryStatus: positionsQuery.status,
      dataUpdatedAt: positionsQuery.dataUpdatedAt,
      optimisticMockResidue: 'none (resolved UI is DB-backed only)',
    });
  }, [positionsQuery.status, positionsQuery.dataUpdatedAt, rows.length]);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-syne font-bold text-4xl">Settled predictions</h1>
              <Link
                to="/portfolio"
                className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                ← Back to Portfolio
              </Link>
            </div>
            <p className="text-gray-400">
              {sorted.length} {sorted.length === 1 ? 'row' : 'rows'} from the database · positive PnL
              credited at resolution: ${totalPositivePnl.toFixed(2)}
            </p>
          </div>

          {!isConnected ? (
            <GuestPageState onConnect={() => requireWallet()} />
          ) : (
            <>
              <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
                <span className="text-white font-semibold">Paper runtime: </span>
                When a market settles, your virtual balance is updated on the server. There is no
                separate &quot;claim&quot; step in the paper model. Future on-chain Azuro / oracle
                flows will expose explicit claim mutations and refetch wallet state after settlement.
              </div>

              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => positionsQuery.refetch()}
                  disabled={positionsQuery.isFetching}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-white/15 text-gray-200 hover:bg-white/5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${positionsQuery.isFetching ? 'animate-spin' : ''}`} />
                  Sync from server
                </button>
              </div>

              {positionsQuery.isError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200">
                  Could not load settled rows.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => positionsQuery.refetch()}
                  >
                    Retry
                  </button>
                </div>
              )}

              {positionsQuery.isLoading ? (
                <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center text-gray-400">
                  Loading settled predictions…
                </div>
              ) : sorted.length > 0 ? (
                <div className="space-y-4">
                  {sorted.map((order) => {
                    const ui = mapDbOrderToTradingPosition(order, marketById[order.marketId] ?? null);
                    const pnl = order.pnl ?? 0;
                    const won = pnl > 0;
                    const timeSinceResolved = order.resolvedAt
                      ? Math.floor((Date.now() - new Date(order.resolvedAt).getTime()) / (1000 * 60 * 60))
                      : null;
                    const winner = order.market?.winner?.trim();

                    return (
                      <div
                        key={order.id}
                        className="p-6 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2 gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Trophy
                                className={`w-5 h-5 flex-shrink-0 ${won ? 'text-brand-green' : 'text-gray-500'}`}
                              />
                              <h3 className="font-syne font-semibold text-lg truncate">{ui.marketName}</h3>
                            </div>
                            <div className="text-sm text-gray-400 mb-1">
                              Your side: <span className="text-white">{ui.outcome}</span>
                            </div>
                            {winner ? (
                              <div className="text-sm text-gray-400 mb-1">
                                Market result: <span className="text-white">{winner}</span>
                              </div>
                            ) : null}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              Settled{' '}
                              {timeSinceResolved === null
                                ? '—'
                                : timeSinceResolved < 1
                                  ? 'recently'
                                  : `${timeSinceResolved}h ago`}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div
                              className={`font-mono text-2xl font-bold mb-1 ${pnl >= 0 ? 'text-brand-green' : 'text-red-400'}`}
                            >
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">Realized PnL (paper)</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle className="w-3.5 h-3.5 text-brand-green/80" />
                          Balance effect applied when this order was resolved (server-side).
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
                  <CheckCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="font-syne font-bold text-xl mb-2">No settled rows yet</h3>
                  <p className="text-gray-400 mb-6">
                    Resolved predictions for this wallet will appear here after the database marks
                    them settled.
                  </p>
                  <Link
                    to="/markets"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                  >
                    Browse markets
                  </Link>
                </div>
              )}

              <div className="mt-10 text-center">
                <Link
                  to="/account"
                  search={{ tab: 'history' }}
                  className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
                >
                  Account history →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}
