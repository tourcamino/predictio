import { createFileRoute, Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, ArrowRight, RefreshCw, Share2 } from 'lucide-react';
import { ShareButton } from '~/components/ShareButton';
import { ShareModal } from '~/components/ShareModal';
import { generatePortfolioShareText } from '~/utils/shareUtils';
import { useTRPC } from '~/trpc/react';
import { useQuery, useMutation } from '@tanstack/react-query';
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

export const Route = createFileRoute('/portfolio/')({
  component: Portfolio,
});

function Portfolio() {
  const { isConnected, balance, address, updateBalance } = useWallet();
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isActive: isDemoActive, positions: demoPositions, balance: demoBalance, tradeHistory: demoTradeHistory } = useDemoAccount();
  const trpc = useTRPC();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM'>('1M');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedLPPosition, setSelectedLPPosition] = useState<LPPosition | null>(null);
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    marketId?: string;
    position?: {
      outcome: 'YES' | 'NO';
      entryPrice: number;
      currentPrice: number;
      pnl: number;
      shares: number;
    };
  }>({
    isOpen: false,
  });

  // Fetch user positions
  const positionsQuery = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: address || '',
      status: 'all',
    }),
    enabled: !!address && isConnected,
  });

  // Fetch portfolio summary
  const summaryQuery = useQuery({
    ...trpc.getPortfolioSummary.queryOptions({
      walletAddress: address || '',
    }),
    enabled: !!address && isConnected,
  });

  // Fetch portfolio performance history
  const performanceQuery = useQuery({
    ...trpc.getPortfolioPerformanceHistory.queryOptions({
      walletAddress: address || '',
      timeRange,
      startDate: customStartDate,
      endDate: customEndDate,
    }),
    enabled: !!address && isConnected,
  });

  // Fetch user's LP positions
  const lpPositionsQuery = useQuery({
    ...trpc.getUserLPPositions.queryOptions({
      walletAddress: address || '',
      status: 'active',
    }),
    enabled: !!address && isConnected,
  });

  const claimAllLPFeesMutation = useMutation(trpc.claimLPFees.mutationOptions());

  const positionsEarly = positionsQuery.data?.positions ?? [];
  const positionMarketIds = useMemo(() => {
    const ids = new Set<string>();
    positionsEarly.forEach((p) => ids.add(p.marketId));
    if (isDemoActive) {
      demoPositions.forEach((p) => ids.add(p.marketId));
    }
    return [...ids];
  }, [positionsEarly, isDemoActive, demoPositions]);

  const marketSummariesQuery = useQuery({
    ...trpc.getMarketSummaries.queryOptions({
      marketIds: positionMarketIds,
    }),
    enabled: isConnected && positionMarketIds.length > 0,
    staleTime: 30_000,
  });

  const marketById = marketSummariesQuery.data ?? {};

  const handleCustomRangeChange = (startDate: Date, endDate: Date) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  const handleClaimAllLPFees = async () => {
    if (!address) return;

    try {
      const result = await claimAllLPFeesMutation.mutateAsync({
        walletAddress: address,
        claimAll: true,
      });

      updateBalance(balance + result.amount);
      toast.success(`Claimed $${result.amount.toFixed(2)} in LP fees!`);
      lpPositionsQuery.refetch();
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
              <p className="text-gray-400">Track your positions and performance</p>
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
              <p className="text-gray-400">Track your positions and performance</p>
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
  const openPositions = positions.filter(p => p.status === 'open');
  const resolvedPositions = positions.filter(p => p.status === 'resolved');

  // Calculate aggregate stats with current market prices
  let totalValue = 0;
  let totalCost = 0;

  if (isDemoActive) {
    // Use demo positions
    demoPositions.forEach(position => {
      const value = position.shares * position.currentPrice;
      const cost = position.shares * position.avgPrice;
      totalValue += value;
      totalCost += cost;
    });
  } else {
    // Use real positions
    openPositions.forEach(position => {
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
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Portfolio</h1>
            <div className="flex items-center justify-between">
              <p className="text-gray-400">
                Track your positions and performance
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
                {isDemoActive ? demoBalance.toLocaleString() : balance.toLocaleString()} USDC available
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

          {/* Open Positions */}
          {isDemoActive && demoPositions.length > 0 && (
            <div className="mb-8">
              <h2 className="font-syne font-bold text-2xl mb-4 flex items-center gap-3">
                Open Positions (Demo)
                <DemoBadge />
              </h2>
              <div className="space-y-4">
                {demoPositions.map((position) => {
                  const market = marketById[position.marketId];
                  if (!market) return null;

                  const value = position.shares * position.currentPrice;
                  const cost = position.shares * position.avgPrice;
                  const pnl = value - cost;
                  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

                  return (
                    <Link
                      key={`${position.marketId}-${position.outcome}`}
                      to="/markets/$marketId"
                      params={{ marketId: position.marketId }}
                      className="block bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{market.sportEmoji}</span>
                            <div>
                              <h3 className="font-syne font-semibold text-lg">
                                {position.marketTitle}
                              </h3>
                              <p className="text-sm text-gray-400">{market.league}</p>
                            </div>
                            <DemoBadge size="sm" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShareModalState({
                                isOpen: true,
                                marketId: position.marketId,
                                position: {
                                  outcome: position.outcome,
                                  entryPrice: position.avgPrice,
                                  currentPrice: position.currentPrice,
                                  pnl: pnl,
                                  shares: position.shares,
                                },
                              });
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Share position"
                          >
                            <Share2 className="w-4 h-4 text-gray-400 hover:text-brand-green" />
                          </button>
                          <div className={`flex items-center gap-1 px-3 py-1 rounded ${
                            position.outcome === 'YES' 
                              ? 'bg-brand-green/20 text-brand-green' 
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            <span className="font-bold">{position.outcome}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Shares</div>
                          <div className="font-mono font-semibold">{position.shares.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Avg Price</div>
                          <div className="font-mono font-semibold">${position.avgPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Current Price</div>
                          <div className="font-mono font-semibold">${position.currentPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Value</div>
                          <div className="font-mono font-semibold">${value.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">P&L:</span>
                          <span className={`font-mono font-bold text-lg ${pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                          <span className={`text-sm ${pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                            ({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                          </span>
                          {pnl >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-brand-green" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>View Market</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          
          {!isDemoActive && openPositions.length > 0 && (
            <div className="mb-8">
              <h2 className="font-syne font-bold text-2xl mb-4">Open Positions</h2>
              <div className="space-y-4">
                {openPositions.map((position) => {
                  const market = marketById[position.marketId];
                  if (!market) return null;

                  const currentPrice = position.outcome.toUpperCase() === 'YES' ? market.yesPrice : market.noPrice;
                  const shares = position.shares || 0;
                  const avgPrice = position.avgPrice || 0;
                  const value = shares * currentPrice;
                  const cost = shares * avgPrice;
                  const pnl = value - cost;
                  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

                  // Get holding rewards data
                  const holdingRewards = (position as any).holdingRewards;

                  return (
                    <Link
                      key={position.id}
                      to="/markets/$marketId"
                      params={{ marketId: position.marketId }}
                      className="block bg-white/5 border border-white/10 rounded-lg p-6 hover:border-brand-green/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{market.sportEmoji}</span>
                            <div>
                              <h3 className="font-syne font-semibold text-lg">
                                {position.market.event || `${market.teamA} vs ${market.teamB}`}
                              </h3>
                              <p className="text-sm text-gray-400">{market.league}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShareModalState({
                                isOpen: true,
                                marketId: position.marketId,
                                position: {
                                  outcome: position.outcome.toUpperCase() as 'YES' | 'NO',
                                  entryPrice: avgPrice,
                                  currentPrice: currentPrice,
                                  pnl: pnl,
                                  shares: shares,
                                },
                              });
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Share position"
                          >
                            <Share2 className="w-4 h-4 text-gray-400 hover:text-brand-green" />
                          </button>
                          <div className={`flex items-center gap-1 px-3 py-1 rounded ${
                            position.outcome.toUpperCase() === 'YES' 
                              ? 'bg-brand-green/20 text-brand-green' 
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            <span className="font-bold">{position.outcome.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Shares</div>
                          <div className="font-mono font-semibold">{shares.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Avg Price</div>
                          <div className="font-mono font-semibold">${avgPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Current Price</div>
                          <div className="font-mono font-semibold">${currentPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Value</div>
                          <div className="font-mono font-semibold">${value.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">P&L:</span>
                          <span className={`font-mono font-bold text-lg ${pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                          <span className={`text-sm ${pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                            ({pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                          </span>
                          {pnl >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-brand-green" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>View Market</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Holding Rewards Badge */}
                      {holdingRewards && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          {holdingRewards.timeUntilRewardsStart ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-4 h-4" />
                              <span>Rewards start in {holdingRewards.timeUntilRewardsStart} ⏳</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">Rewards:</span>
                                <span className="font-mono font-semibold text-brand-green">
                                  +${holdingRewards.rewardAccrued.toFixed(2)} USDC
                                </span>
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded text-xs font-semibold">
                                  {holdingRewards.rewardRateEmoji} {holdingRewards.rewardRateLabel}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resolved Positions */}
          {resolvedPositions.length > 0 && (
            <div>
              <h2 className="font-syne font-bold text-2xl mb-4">Resolved Positions</h2>
              <div className="space-y-4">
                {resolvedPositions.map((position) => {
                  const market = marketById[position.marketId];
                  if (!market) return null;

                  const shares = position.shares || 0;
                  const avgPrice = position.avgPrice || 0;
                  const pnl = position.pnl || 0;
                  const isWin = pnl > 0;

                  return (
                    <div
                      key={position.id}
                      className={`bg-white/5 border rounded-lg p-6 ${
                        isWin ? 'border-brand-green/30' : 'border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{market.sportEmoji}</span>
                            <div>
                              <h3 className="font-syne font-semibold text-lg">
                                {position.market.event || `${market.teamA} vs ${market.teamB}`}
                              </h3>
                              <p className="text-sm text-gray-400">{market.league}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-sm text-gray-400">
                              {shares.toFixed(1)} {position.outcome.toUpperCase()} shares @ ${avgPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center gap-2 mb-2 ${
                            isWin ? 'text-brand-green' : 'text-red-500'
                          }`}>
                            {isWin ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                            <span className="font-bold">
                              {isWin ? 'Won' : 'Lost'}
                            </span>
                          </div>
                          <div className={`font-mono font-bold text-xl ${
                            isWin ? 'text-brand-green' : 'text-red-500'
                          }`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isDemoActive && openPositions.length === 0 && resolvedPositions.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="font-syne font-bold text-xl mb-2">No Positions Yet</h3>
              <p className="text-gray-400 mb-6">
                Start trading on prediction markets to see your positions here.
              </p>
              <Link
                to="/markets"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
              >
                Browse Markets
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          
          {isDemoActive && demoPositions.length === 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-12 text-center">
              <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="font-syne font-bold text-xl mb-2">No Demo Positions Yet</h3>
              <p className="text-gray-400 mb-6">
                Start trading in demo mode to practice without risking real funds.
              </p>
              <Link
                to="/markets"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-all"
              >
                Browse Markets
                <ArrowRight className="w-4 h-4" />
              </Link>
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

