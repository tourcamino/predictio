import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Home, ChevronRight, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { AIInsightBadge } from '~/components/AIInsightBadge';
import { PriceChart } from '~/components/markets/PriceChart';
import { RecentTradesFeed } from '~/components/markets/RecentTradesFeed';
import { TradingBox } from '~/components/markets/TradingBox';
import { MarketStatsBar } from '~/components/markets/MarketStatsBar';
import { OrderBook } from '~/components/markets/OrderBook';
import { LiquidityDepth } from '~/components/markets/LiquidityDepth';
import { CommunitySentiment } from '~/components/markets/CommunitySentiment';
import { RelatedMarkets } from '~/components/markets/RelatedMarkets';
import { ResolutionInfo } from '~/components/markets/ResolutionInfo';
import { DisputeBanner } from '~/components/markets/DisputeBanner';
import { ShareButton } from '~/components/ShareButton';
import { DecisionBlock } from '~/components/markets/DecisionBlock';
import { SocialProof } from '~/components/markets/SocialProof';
import { MicroHook } from '~/components/markets/MicroHook';
import { CollapsibleSection } from '~/components/markets/CollapsibleSection';
import { MarketCountdown } from '~/components/MarketCountdown';
import { MarketOracleStatusPanel } from '~/components/markets/MarketOracleStatusPanel';
import { getMarketStatus } from '~/utils/marketLifecycle';
import { getMarketDetailLoadIssue } from '~/utils/marketDetailErrors';
import { fetchMarketDetailWithRestFallback } from '~/utils/fetchMarketDetailWithRestFallback';
import { useTRPC, useTRPCClient } from '~/trpc/react';

export const Route = createFileRoute('/markets/$marketId/')({
  component: MarketDetailPage,
});

function MarketDetailPage() {
  const { marketId } = Route.useParams();
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();

  const marketQuery = useQuery({
    queryKey: trpc.getMarketDetail.queryKey({ marketId }),
    queryFn: () => fetchMarketDetailWithRestFallback(trpcClient, marketId),
  });

  // Generate OG image in the background for social sharing
  const ogImageQuery = useQuery(
    trpc.generateMarketOGImage.queryOptions({
      marketId,
    })
  );

  // Get bot status for AMM indicator
  const botHeartbeatQuery = useQuery({
    ...trpc.getBotHeartbeat.queryOptions({}),
    refetchInterval: 30_000,
  });

  // Get vault allocation for this market
  const vaultAllocationsQuery = useQuery(
    trpc.getVaultAllocations.queryOptions({})
  );

  // Selected outcome for trading
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');

  const handleOutcomeSelect = (outcome: 'YES' | 'NO') => {
    setSelectedOutcome(outcome);
    // Scroll to trading box
    const tradingBox = document.getElementById('trading-box');
    if (tradingBox) {
      tradingBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  if (marketQuery.isLoading) {
    return (
      <div className="min-h-screen bg-brand-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-brand-green mx-auto mb-4" />
              <p className="text-gray-400">Loading market details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (marketQuery.isError || !marketQuery.data) {
    const issue = marketQuery.isError
      ? getMarketDetailLoadIssue(marketQuery.error)
      : 'server';
    const title =
      issue === 'network'
        ? 'Connection failed'
        : issue === 'not_found'
          ? 'Market not found'
          : 'Unable to load market';
    const description =
      issue === 'network'
        ? 'We cannot reach the server right now. Check your connection and try again.'
        : issue === 'not_found'
          ? 'This market no longer exists or was removed from the platform.'
          : 'Something went wrong while loading this market. You can retry or go back to the list.';

    const errMsg =
      marketQuery.isError && marketQuery.error instanceof Error
        ? marketQuery.error.message
        : null;

    return (
      <div
        className="min-h-screen bg-brand-navy"
        data-predictio-market-error="v3-rest-first"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center py-20 max-w-lg mx-auto">
            <h2
              className={`text-2xl font-bold mb-4 ${
                issue === 'not_found' ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {title}
            </h2>
            <p className="text-gray-400 mb-6 text-sm sm:text-base leading-relaxed">
              {description}
            </p>
            {issue === 'server' && errMsg && (
              <p className="text-xs font-mono text-gray-500 mb-6 break-words px-2">
                {errMsg}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void marketQuery.refetch()}
                disabled={marketQuery.isFetching}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-w-[200px] bg-brand-green text-brand-bg font-semibold rounded hover:bg-brand-green/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {marketQuery.isFetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Try again
              </button>
              <Link
                to="/markets"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-w-[200px] border border-white/20 text-gray-200 font-semibold rounded hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to markets
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { market } = marketQuery.data;
  
  // Calculate lifecycle status
  const lifecycleStatus = getMarketStatus(market);

  return (
    <div className="min-h-screen bg-brand-navy">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 pb-[500px] lg:pb-8">
        {/* Main Content Grid - Desktop: 2 columns with sticky sidebar */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-gray-400 overflow-x-auto">
              <Link to="/" className="hover:text-brand-green transition-colors cursor-pointer flex-shrink-0">
                <Home className="w-4 h-4" />
              </Link>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
              <Link to="/markets" className="hover:text-brand-green transition-colors cursor-pointer flex-shrink-0">
                Markets
              </Link>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
              <Link 
                to="/markets" 
                search={{ sport: market.sport }}
                className="hover:text-brand-green transition-colors cursor-pointer flex-shrink-0"
              >
                {market.sport}
              </Link>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
              <span className="text-white truncate">{market.teamA} vs {market.teamB}</span>
            </div>

            {/* Back Button */}
            <Link
              to="/markets"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-green transition-colors font-semibold text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Markets
            </Link>

            {/* Share Button */}
            <div>
              <ShareButton
                text=""
                marketId={marketId}
                marketData={{
                  homeTeam: market.teamA,
                  awayTeam: market.teamB,
                  competition: market.league,
                  yesPrice: market.yesPrice,
                  volume: market.volume,
                  closesAt: market.closesAt,
                  isLive: market.status === 'closing-soon',
                }}
                variant="secondary"
                size="md"
              />
            </div>

            <MarketOracleStatusPanel
              market={market}
              lastUpdatedAt={marketQuery.dataUpdatedAt ? new Date(marketQuery.dataUpdatedAt) : undefined}
            />

            {/* Dispute/Void Banner */}
            {(market.status === 'under_review' || market.status === 'voided') && (
              <DisputeBanner
                status={market.status}
                reason={market.disputeReason || market.resolutionReason}
                reviewSince={market.reviewSince}
                voidedAt={market.voidedAt}
                refundAmount={market.refundAmount}
              />
            )}

            {/* LIFECYCLE STATUS BANNERS */}
            
            {/* RESOLVED Banner */}
            {lifecycleStatus === 'resolved' && market.result && (
              <div className="mb-4 px-4 py-3 border border-white/10 rounded-lg bg-white/5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-white/10 text-gray-300">
                    Resolved
                  </span>
                  <span className="text-sm text-gray-300">
                    {market.result === 'yes' ? `${market.teamA} won` : `${market.teamB} won`}
                  </span>
                  {market.resolved_at && (
                    <span className="text-xs text-gray-500 font-mono">
                      · {market.resolved_at.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Settlements run automatically.{' '}
                  <Link to="/portfolio" className="text-brand-green hover:text-brand-cyan">
                    View portfolio
                  </Link>
                </p>
              </div>
            )}

            {/* LOCKED Banner */}
            {lifecycleStatus === 'locked' && (
              <div className="mb-4 px-4 py-3 border border-white/10 rounded-lg bg-white/5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-white/10 text-gray-300">
                    Locked
                  </span>
                  <span className="text-sm text-gray-500">Trading closed at kickoff</span>
                </div>
                <p className="text-sm text-gray-500">
                  Resolves when the final result is confirmed by the oracle.
                </p>
              </div>
            )}

            {/* Prominent Countdown - OPEN markets only */}
            {lifecycleStatus === 'open' && (
              <MarketCountdown market={market} variant="prominent" />
            )}

            {/* Simplified Match Header */}
            <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="bg-brand-green text-brand-bg text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wide">
                  {market.sportEmoji} {market.sport}
                </span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400 uppercase tracking-wide">{market.league}</span>
                {market.status === 'closing-soon' && lifecycleStatus === 'open' && (
                  <>
                    <span className="text-xs text-gray-400">·</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-500 font-semibold text-xs uppercase">LIVE</span>
                    </div>
                  </>
                )}
                {lifecycleStatus === 'locked' && (
                  <>
                    <span className="text-xs text-gray-400">·</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded">
                      <span className="text-orange-500 font-semibold text-xs uppercase">🔒 IN PROGRESS</span>
                    </div>
                  </>
                )}
                {lifecycleStatus === 'resolved' && (
                  <>
                    <span className="text-xs text-gray-400">·</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500/20 border border-gray-500/30 rounded">
                      <span className="text-gray-400 font-semibold text-xs uppercase">✓ RESOLVED</span>
                    </div>
                  </>
                )}
              </div>

              <h1 className="font-syne font-bold text-3xl sm:text-4xl md:text-5xl mb-4">
                {market.teamA} <span className="text-gray-500">vs</span> {market.teamB}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {market.start_time.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })} at {market.start_time.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {market.location && (
                  <>
                    <span>·</span>
                    <span>{market.location}</span>
                  </>
                )}
              </div>
            </div>

            {/* Decision Block - PRIMARY CTA - Mobile only */}
            <div className="lg:hidden">
              <DecisionBlock market={market} onSelectOutcome={handleOutcomeSelect} />
            </div>

            {/* Social Proof - Mobile only */}
            <div className="lg:hidden">
              <SocialProof market={market} />
            </div>

            {/* Micro Hook - Mobile only */}
            <div className="lg:hidden">
              <MicroHook />
            </div>

            {/* Trading Box - Mobile only (with overlay if locked/resolved) */}
            <div id="trading-box" className="lg:hidden relative">
              {lifecycleStatus !== 'open' && (
                <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="text-4xl mb-3">
                      {lifecycleStatus === 'locked' ? '🔒' : '✅'}
                    </div>
                    <div className="text-lg font-semibold mb-2">
                      {lifecycleStatus === 'locked' ? 'Trading Closed' : 'Market Resolved'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {lifecycleStatus === 'locked' 
                        ? 'Match in progress' 
                        : 'Result confirmed'}
                    </div>
                  </div>
                </div>
              )}
              <TradingBox market={market} initialOutcome={selectedOutcome} />
            </div>

            {/* AI Market Insight — collapsed by default */}
            <div>
              <AIInsightBadge
                sport={market.sport}
                marketSnapshot={{
                  marketId: market.id,
                  teamA: market.teamA,
                  teamB: market.teamB,
                  league: market.league,
                  sport: market.sport,
                  question: market.event,
                  yesPrice: market.yesPrice,
                  noPrice: market.noPrice,
                  volume24h: (() => {
                    const v = market.liquidity?.volume24h ?? market.volume ?? 0;
                    return v > 0 ? v : undefined;
                  })(),
                  status: market.status,
                  lifecycle: lifecycleStatus,
                }}
              />
            </div>

            {/* Probability Chart */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-brand-green" />
                <h3 className="font-semibold">Probability Chart</h3>
              </div>
              <PriceChart market={market} />
            </div>

            {/* Recent Activity */}
            <div>
              <RecentTradesFeed market={market} />
            </div>

            {/* Full Width Sections - Lower Priority */}
            <div className="space-y-6">
              <MarketStatsBar market={market} />
              
              <CollapsibleSection 
                title="Order Book" 
                defaultOpen={false}
              >
                <OrderBook market={market} />
              </CollapsibleSection>
              
              <CollapsibleSection 
                title="Liquidity Depth" 
                defaultOpen={false}
              >
                <LiquidityDepth market={market} />
              </CollapsibleSection>
              
              <RelatedMarkets currentMarket={market} />
              
              <CommunitySentiment market={market} />
              
              <CollapsibleSection 
                title="Resolution Details" 
                defaultOpen={false}
              >
                <ResolutionInfo azuroData={marketQuery.data?.azuroData} />
              </CollapsibleSection>
            </div>
          </div>

          {/* Right Column - Sticky Trading Box (Desktop only) */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              {/* Decision Block */}
              <DecisionBlock market={market} onSelectOutcome={handleOutcomeSelect} />

              {/* Social Proof */}
              <SocialProof market={market} />

              {/* Micro Hook */}
              <MicroHook />

              {/* Trading Box with overlay if locked/resolved */}
              <div id="trading-box" className="relative">
                {lifecycleStatus !== 'open' && (
                  <div className="absolute inset-0 bg-brand-bg/90 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="text-5xl mb-4">
                        {lifecycleStatus === 'locked' ? '🔒' : '✅'}
                      </div>
                      <div className="text-xl font-bold mb-2">
                        {lifecycleStatus === 'locked' ? 'Trading Closed' : 'Market Resolved'}
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        {lifecycleStatus === 'locked' 
                          ? 'Match in progress — awaiting result' 
                          : 'Result confirmed by oracle'}
                      </div>
                      {lifecycleStatus === 'resolved' && market.result && (
                        <div className={`mt-4 px-4 py-2 rounded-lg ${
                          market.result === 'yes' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          <div className="font-semibold">
                            {market.result === 'yes' ? `${market.teamA} Won` : `${market.teamB} Won`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <TradingBox market={market} initialOutcome={selectedOutcome} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AMMStatusIndicator({
  botStatus,
  azuroFairValue,
  vaultDepth,
}: {
  botStatus?: {
    status: string;
    isStale: boolean;
  };
  azuroFairValue?: number;
  vaultDepth?: number;
}) {
  const isActive = botStatus?.status === 'ONLINE' && !botStatus?.isStale;
  const statusColor = isActive ? '#00FF87' : '#888888';
  const spread = 0.01; // 1% spread

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: statusColor,
                boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none',
              }}
            />
            <span className="font-mono text-sm font-bold" style={{ color: statusColor }}>
              AMM {isActive ? 'ACTIVE' : 'PAUSED'}
            </span>
          </div>
          {!isActive && (
            <span className="text-xs text-gray-500">— Manual trading only</span>
          )}
        </div>
        
        {isActive && azuroFairValue && (
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-gray-400">Azuro fair value:</span>
              <span className="ml-2 font-mono text-white">{azuroFairValue.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Bot spread:</span>
              <span className="ml-2 font-mono text-white">±{(spread * 100).toFixed(1)}%</span>
            </div>
            {vaultDepth !== undefined && (
              <div>
                <span className="text-gray-400">Vault depth:</span>
                <span className="ml-2 font-mono text-white">${Math.round(vaultDepth)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
