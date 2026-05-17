import { createFileRoute, Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, ArrowRight, RefreshCw, Share2 } from 'lucide-react';
import { ShareButton } from '~/components/ShareButton';
import { ShareModal } from '~/components/ShareModal';
import { generatePortfolioShareText } from '~/utils/shareUtils';
import { useTRPC } from '~/trpc/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortfolioValueChart } from '~/components/portfolio/PortfolioValueChart';
import { PnLHistoryChart } from '~/components/portfolio/PnLHistoryChart';
import { PositionTimeline } from '~/components/portfolio/PositionTimeline';
import { SportROIBreakdown } from '~/components/portfolio/SportROIBreakdown';
import { MarketTypeROIBreakdown } from '~/components/portfolio/MarketTypeROIBreakdown';
import { HoldingRewardsSection } from '~/components/portfolio/HoldingRewardsSection';
import { ManageLPModal } from '~/components/liquidity/ManageLPModal';
import { formatLPDuration } from '~/utils/lpUtils';
import type { LPPosition } from '~/data/mockLP';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { DemoSettings } from '~/components/demo/DemoSettings';
import { DemoBadge } from '~/components/demo/DemoBadge';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { GuestPageState } from '~/components/GuestPageState';
import { clientChainScopeForTrpc, normalizeWalletForQuery } from '~/utils/walletQuery';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { useUserPositions } from '~/hooks/useUserPositions';
import { usePortfolioSummary } from '~/hooks/usePortfolioSummary';
import { usePortfolioPerformanceHistory } from '~/hooks/usePortfolioPerformanceHistory';
import { useUserLPPositions } from '~/hooks/useUserLPPositions';
import { useMarketSummaries } from '~/hooks/useMarketSummaries';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';
import { PortfolioExposureSummary } from '~/components/portfolio/PortfolioExposureSummary';
import { ProtocolStatePanel } from '~/components/protocol/ProtocolStatePanel';
import { ProtocolSurfaceWayfinder } from '~/components/protocol/ProtocolSurfaceWayfinder';
import { useCanonicalProtocolRefetch } from '~/hooks/useCanonicalProtocolRefetch';

export const Route = createFileRoute('/portfolio/')({
  component: Portfolio,
});

function Portfolio() {
  const { isConnected, address, chainId } = useWallet();
  const chainScope = clientChainScopeForTrpc(chainId);
  const { cashUsdc: paperCash } = usePaperWalletBalance();
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isActive: isDemoActive, positions: demoPositions, balance: demoBalance, tradeHistory: demoTradeHistory } = useDemoAccount();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const walletKey = normalizeWalletForQuery(address);
  useCanonicalProtocolRefetch(walletKey);
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM'>('1M');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedLPPosition, setSelectedLPPosition] = useState<LPPosition | null>(null);
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    marketId?: string;
    position?: {
      outcome: 'YES' | 'NO' | 'DRAW';
      entryPrice: number;
      currentPrice: number;
      pnl: number;
      shares: number;
    };
  }>({
    isOpen: false,
  });

  const positionsQuery = useUserPositions({
    status: 'all',
    enabled: !!walletKey && isConnected,
  });

  const summaryQuery = usePortfolioSummary({
    enabled: !!walletKey && isConnected,
  });

  const performanceQuery = usePortfolioPerformanceHistory({
    timeRange,
    startDate: customStartDate,
    endDate: customEndDate,
    enabled: isConnected,
  });

  const lpPositionsQuery = useUserLPPositions({
    walletAddress: walletKey ?? '',
    status: 'active',
    clientChainId: chainScope,
    enabled: !!walletKey && isConnected,
  });

  const claimAllLPFeesMutation = useMutation(trpc.claimLPFees.mutationOptions());

  const positionsEarly = positionsQuery.data?.positions ?? [];
  const positionMarketIds = useMemo(() => {
    const ids = new Set<string>();
    positionsEarly.forEach((p) => ids.add(p.marketId));
    if (isDemoActive && !isConnected) {
      demoPositions.forEach((p) => ids.add(p.marketId));
    }
    return [...ids];
  }, [positionsEarly, isDemoActive, isConnected, demoPositions]);

  const marketSummariesQuery = useMarketSummaries({
    marketIds: positionMarketIds,
    enabled: isConnected && positionMarketIds.length > 0,
    staleTime: 20_000,
    refetchInterval: 25_000,
  });

  const marketById = marketSummariesQuery.data ?? {};

  const handleCustomRangeChange = (startDate: Date, endDate: Date) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  const handleClaimAllLPFees = async () => {
    if (!walletKey) return;

    try {
      const result = await claimAllLPFeesMutation.mutateAsync({
        walletAddress: walletKey,
        claimAll: true,
      });

      toast.success(`Claimed $${result.amount.toFixed(2)} in LP fees!`);
      if (walletKey) {
        invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);
      }
    } catch (err: any) {
      toast.error('Failed to claim fees');
    }
  };

  // Loading state
  if (
    isConnected &&
    (positionsQuery.isLoading ||
      summaryQuery.isLoading ||
      performanceQuery.isLoading)
  ) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="font-syne font-bold text-4xl mb-2">Portfolio</h1>
              <p className="text-gray-400">Net worth, PnL, and exposure — positions live on Trading</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <RefreshCw className="w-12 h-12 text-brand-green mx-auto mb-4 animate-spin" />
              <p className="text-gray-400">Loading your portfolio...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (
    isConnected &&
    (positionsQuery.isError ||
      summaryQuery.isError ||
      performanceQuery.isError)
  ) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="font-syne font-bold text-4xl mb-2">Portfolio</h1>
              <p className="text-gray-400">Net worth, PnL, and exposure — positions live on Trading</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-12 text-center">
              <p className="text-red-500 mb-4">Failed to load portfolio data</p>
              <button
                onClick={() => {
                  positionsQuery.refetch();
                  summaryQuery.refetch();
                  performanceQuery.refetch();
                }}
                className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Process positions data
  const positions = positionsQuery.data?.positions || [];
  const openPositions = positions.filter(p => p.status === 'open' || p.status === 'disputed');
  const resolvedPositions = positions.filter(p => p.status === 'resolved' || p.status === 'refunded');

  // Calculate aggregate stats with current market prices
  let totalValue = 0;
  let totalCost = 0;

  if (!isConnected && isDemoActive) {
    demoPositions.forEach((position) => {
      const value = position.shares * position.currentPrice;
      const cost = position.shares * position.avgPrice;
      totalValue += value;
      totalCost += cost;
    });
  } else {
    openPositions.forEach((position) => {
      const market = marketById[position.marketId];
      if (!market) return;

      const currentPrice = position.outcome.toUpperCase() === 'YES' ? market.yesPrice : market.noPrice;
      const value = (position.shares || 0) * currentPrice;
      const cost = (position.shares || 0) * (position.avgPrice || 0);

      totalValue += value;
      totalCost += cost;
    });
  }

  const unrealizedPnL = totalValue - totalCost;
  const unrealizedPnLPct = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

  const resolvedPnL = summaryQuery.data?.resolvedPnL || 0;
  const summary = summaryQuery.data;

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-bg">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -15%, rgba(0,255,135,0.1), transparent 55%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      <div className="relative z-10 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 border-b border-white/10 pb-6">
            <p className="mb-2 inline-flex rounded-full border border-brand-green/25 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              Net worth & exposure
            </p>
            <h1 className="font-syne font-bold text-4xl tracking-tight mb-2">Portfolio</h1>
            <div className="flex items-center justify-between">
              <p className="text-gray-400">
                Institutional PnL · positions execute on Trading
              </p>
              {isConnected && (
              <ShareButton
                text={generatePortfolioShareText({
                  totalProfit: Math.round(unrealizedPnL + resolvedPnL),
                  winRate: Math.round(summary?.winRate || 0),
                  totalPredictions: positions.length,
                  activePredictions: openPositions.length,
                })}
                url={typeof window !== 'undefined' ? window.location.origin : ''}
                variant="secondary"
                size="md"
              />
              )}
            </div>
          </div>

          {!isConnected ? (
            <>
              <GuestPageState onConnect={() => requireWallet()} />
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-brand-green mb-3 mx-auto" />
                  <h3 className="font-semibold mb-2">Track Performance</h3>
                  <p className="text-sm text-gray-400">
                    Monitor your wins, losses, and overall ROI
                  </p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <Clock className="w-8 h-8 text-brand-cyan mb-3 mx-auto" />
                  <h3 className="font-semibold mb-2">Active Predictions</h3>
                  <p className="text-sm text-gray-400">
                    View all your live predictions in one place
                  </p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-purple-400 mb-3 mx-auto" />
                  <h3 className="font-semibold mb-2">History</h3>
                  <p className="text-sm text-gray-400">
                    Access your complete trading history
                  </p>
                </div>
              </div>
            </>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm text-gray-400">Total Value</div>
                {isDemoActive && <DemoBadge size="sm" />}
              </div>
              <div className="font-mono text-3xl font-bold text-white">
                ${totalValue.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {(isDemoActive && !isConnected ? demoBalance : paperCash).toLocaleString()} USDC available
              </div>
            </div>
            
            <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-sm text-gray-400 mb-2">Unrealized P&L</div>
              <div className={`font-mono text-3xl font-bold ${unrealizedPnL >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
              </div>
              <div className={`text-xs mt-1 ${unrealizedPnLPct >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                {unrealizedPnLPct >= 0 ? '+' : ''}{unrealizedPnLPct.toFixed(1)}%
              </div>
            </div>
            
            <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-sm text-gray-400 mb-2">Realized P&L</div>
              <div className={`font-mono text-3xl font-bold ${resolvedPnL >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                {resolvedPnL >= 0 ? '+' : ''}${resolvedPnL.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {resolvedPositions.length} positions closed
              </div>
            </div>
          </div>

          <PortfolioExposureSummary
            openPositions={openPositions}
            resolvedPositions={resolvedPositions}
            marketById={marketById}
            realizedPnL={resolvedPnL}
            unrealizedPnL={unrealizedPnL}
            unrealizedPnLPct={unrealizedPnLPct}
          />

          <ProtocolSurfaceWayfinder current="/portfolio" />

          {/* Holding Rewards Section */}
          {summaryQuery.data?.holdingRewards && summaryQuery.data.holdingRewards.pending > 0 && (
            <div className="mb-8">
              <HoldingRewardsSection
                walletAddress={address || ''}
                accrued={summaryQuery.data.holdingRewards.pending}
                earningRate={summaryQuery.data.holdingRewards.dailyEarningRate}
                activePositions={summaryQuery.data.holdingRewards.activeEarningPositions}
                nextUpdate="43 min"
              />
            </div>
          )}

          {/* LP Positions Section */}
          {lpPositionsQuery.data && lpPositionsQuery.data.positions.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-syne font-bold text-2xl">LP Positions</h2>
                {lpPositionsQuery.data.summary.totalFeesPending > 0 && (
                  <button
                    onClick={handleClaimAllLPFees}
                    disabled={claimAllLPFeesMutation.isPending}
                    className="px-4 py-2 bg-brand-green/20 text-brand-green border border-brand-green/30 font-semibold text-sm rounded-lg hover:bg-brand-green/30 transition-colors disabled:opacity-50"
                  >
                    {claimAllLPFeesMutation.isPending 
                      ? 'Claiming...' 
                      : `Claim All Fees $${lpPositionsQuery.data.summary.totalFeesPending.toFixed(2)}`}
                  </button>
                )}
              </div>

              {/* LP Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total LP Value</div>
                  <div className="font-mono font-bold text-xl">${lpPositionsQuery.data.summary.totalValue.toFixed(2)}</div>
                  <div className={`text-xs mt-1 ${lpPositionsQuery.data.summary.totalPnL >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                    {lpPositionsQuery.data.summary.totalPnL >= 0 ? '+' : ''}${lpPositionsQuery.data.summary.totalPnL.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Fees Earned</div>
                  <div className="font-mono font-bold text-xl text-brand-green">${lpPositionsQuery.data.summary.totalFeesEarned.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    ${lpPositionsQuery.data.summary.totalFeesPending.toFixed(2)} unclaimed
                  </div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Avg APY</div>
                  <div className="font-mono font-bold text-xl text-brand-cyan">{lpPositionsQuery.data.summary.avgAPY.toFixed(1)}%</div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Active Positions</div>
                  <div className="font-mono font-bold text-xl">{lpPositionsQuery.data.summary.activePositions}</div>
                </div>
              </div>

              {/* LP Positions List */}
              <div className="space-y-4">
                {lpPositionsQuery.data.positions.map((position) => {
                  const pnl = position.currentValue - position.deposited;
                  const pnlPct = position.deposited > 0 ? (pnl / position.deposited) * 100 : 0;

                  return (
                    <div
                      key={position.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-brand-green/30 transition-all cursor-pointer"
                      onClick={() =>
                        setSelectedLPPosition(position as LPPosition)
                      }
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{position.sportEmoji}</span>
                            <div>
                              <h3 className="font-syne font-semibold text-lg">{position.marketName}</h3>
                              <p className="text-sm text-gray-400">{position.league}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-xl">${position.currentValue.toFixed(2)}</div>
                          <div className={`text-sm ${pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Pool Share</div>
                          <div className="font-mono font-semibold">{(position.poolShare * 100).toFixed(2)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">APY</div>
                          <div className="font-mono font-semibold text-brand-green">{position.apy.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Fees Earned</div>
                          <div className="font-mono font-semibold text-brand-green">${position.feesEarned.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Unclaimed</div>
                          <div className="font-mono font-semibold">${position.feesPending.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="text-sm text-gray-400">
                          Position open for {formatLPDuration(position.openSince)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-brand-green">
                          <span>Manage Position</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State for LP Positions */}
          {isConnected && lpPositionsQuery.data && lpPositionsQuery.data.positions.length === 0 && (
            <div className="mb-8 bg-white/5 border border-white/10 rounded-lg p-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="font-syne font-bold text-xl mb-2">No LP Positions Yet</h3>
              <p className="text-gray-400 mb-6">
                Start providing liquidity to markets and earn fees on every trade.
              </p>
              <Link
                to="/liquidity"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
              >
                Explore LP Opportunities
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Performance Charts */}
          {performanceQuery.data && performanceQuery.data.dataPoints.length > 0 && (
            <div className="mb-8 space-y-6">
              {/* Portfolio Value Chart */}
              <PortfolioValueChart
                data={performanceQuery.data.dataPoints}
                summary={performanceQuery.data.summary}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                onCustomRangeChange={handleCustomRangeChange}
              />

              {/* P&L History and Position Timeline */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PnLHistoryChart data={performanceQuery.data.dataPoints} />
                <PositionTimeline events={performanceQuery.data.positionEvents} />
              </div>
            </div>
          )}

          {/* Sport ROI Breakdown */}
          {summaryQuery.data?.sportBreakdown && summaryQuery.data.sportBreakdown.length > 0 && (
            <div className="mb-8">
              <SportROIBreakdown sportBreakdown={summaryQuery.data.sportBreakdown} />
            </div>
          )}

          {/* Market Type ROI Breakdown */}
          {summaryQuery.data?.marketTypeBreakdown && summaryQuery.data.marketTypeBreakdown.length > 0 && (
            <div className="mb-8">
              <MarketTypeROIBreakdown marketTypeBreakdown={summaryQuery.data.marketTypeBreakdown} />
            </div>
          )}

          {/* Demo Settings */}
          {isDemoActive && (
            <div className="mb-8">
              <DemoSettings />
            </div>
          )}

          {/* Recent positions (canonical list on /trading) */}
          {(openPositions.length > 0 || resolvedPositions.length > 0) && (
            <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-syne font-bold text-lg">Recent positions</h2>
                <Link to="/trading" className="text-sm text-brand-green font-semibold hover:text-brand-green/80">
                  View all on Trading →
                </Link>
              </div>
              <ul className="space-y-2 text-sm">
                {[...openPositions, ...resolvedPositions]
                  .slice(0, 3)
                  .map((p) => {
                    const m = marketById[p.marketId];
                    const title = p.market?.event ?? (m ? `${m.teamA} vs ${m.teamB}` : p.marketId);
                    return (
                      <li key={p.id} className="flex justify-between gap-2 text-gray-300">
                        <span className="truncate">{title}</span>
                        <span className="font-mono text-xs shrink-0">{p.outcome.toUpperCase()} · {p.status}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          
          </>
          )}
        </div>
      </div>

      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />

      {/* LP Position Modal */}
      {selectedLPPosition && (
        <ManageLPModal
          isOpen={true}
          onClose={() => setSelectedLPPosition(null)}
          position={selectedLPPosition}
          onSuccess={() => {
            setSelectedLPPosition(null);
            lpPositionsQuery.refetch();
            summaryQuery.refetch();
          }}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalState.isOpen}
        onClose={() => setShareModalState({ isOpen: false })}
        marketId={shareModalState.marketId}
        userPosition={shareModalState.position}
      />
    </div>
  );
}

