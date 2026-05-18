import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, ChevronRight, TrendingUp, RefreshCw } from 'lucide-react';
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
import { DecisionBlock } from '~/components/markets/DecisionBlock';
import { CollapsibleSection } from '~/components/markets/CollapsibleSection';
import { MarketCountdown } from '~/components/MarketCountdown';
import {
  ExecutionMarketHeader,
  MarketMovementHint,
  QuickProfitStrip,
} from '~/components/markets/ExecutionMarketShell';
import { AdvancedProtocolDetails } from '~/components/markets/AdvancedProtocolDetails';
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
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');

  const marketQuery = useQuery({
    queryKey: trpc.getMarketDetail.queryKey({ marketId }),
    queryFn: () => fetchMarketDetailWithRestFallback(trpcClient, marketId),
    refetchInterval: 15_000,
  });

  useQuery(trpc.generateMarketOGImage.queryOptions({ marketId }));

  const handleOutcomeSelect = (outcome: 'YES' | 'NO') => {
    setSelectedOutcome(outcome);
    document.getElementById('trading-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (marketQuery.isLoading) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-brand-green" />
      </div>
    );
  }

  if (marketQuery.isError || !marketQuery.data) {
    const issue = marketQuery.isError ? getMarketDetailLoadIssue(marketQuery.error) : 'server';
    return (
      <div className="min-h-screen bg-brand-navy px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-3">Could not load market</h2>
        <button
          type="button"
          onClick={() => void marketQuery.refetch()}
          className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg"
        >
          Try again
        </button>
        <Link to="/markets" className="block mt-4 text-gray-400">
          Back to markets
        </Link>
      </div>
    );
  }

  const { market } = marketQuery.data;
  const lifecycleStatus = getMarketStatus(market);
  const lastUpdated = marketQuery.dataUpdatedAt ? new Date(marketQuery.dataUpdatedAt) : undefined;
  const canTrade = lifecycleStatus === 'open';

  return (
    <div className="min-h-screen bg-brand-navy pb-28 lg:pb-10">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Minimal nav */}
        <div className="flex items-center justify-between gap-2 mb-4 text-sm">
          <Link
            to="/markets"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-brand-green"
          >
            <ArrowLeft className="w-4 h-4" />
            Markets
          </Link>
          <span className="text-gray-600 truncate hidden sm:inline">
            {market.teamA} vs {market.teamB}
          </span>
        </div>

        {(market.status === 'under_review' || market.status === 'voided') && (
          <DisputeBanner
            status={market.status}
            reason={market.disputeReason || market.resolutionReason}
            reviewSince={market.reviewSince}
            voidedAt={market.voidedAt}
            refundAmount={market.refundAmount}
          />
        )}

        {lifecycleStatus === 'open' && (
          <div className="mb-4">
            <MarketCountdown market={market} variant="prominent" />
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* EXECUTION COLUMN — first on mobile */}
          <div className="lg:col-span-5 space-y-4 order-1">
            <ExecutionMarketHeader market={market} />
            <MarketMovementHint market={market} />
            <QuickProfitStrip market={market} />
            <DecisionBlock market={market} onSelectOutcome={handleOutcomeSelect} />

            <div
              id="trading-box"
              className="relative lg:sticky lg:top-20"
            >
              {!canTrade && (
                <div className="absolute inset-0 bg-brand-bg/85 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center mx-3 lg:mx-0">
                  <div className="text-center p-4">
                    <p className="font-semibold text-lg">
                      {lifecycleStatus === 'locked' ? 'Match in progress' : 'Market settled'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {lifecycleStatus === 'locked'
                        ? 'Trading closed at kickoff — payout after oracle confirms result'
                        : 'Check your portfolio for payout'}
                    </p>
                    {lifecycleStatus === 'resolved' && (
                      <Link to="/portfolio" className="text-brand-green text-sm mt-2 inline-block">
                        View portfolio →
                      </Link>
                    )}
                  </div>
                </div>
              )}
              <TradingBox market={market} initialOutcome={selectedOutcome} executionFirst />
            </div>
          </div>

          {/* RESEARCH COLUMN — below fold */}
          <div className="lg:col-span-7 space-y-5 mt-6 lg:mt-0 order-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-brand-green" />
                <h3 className="font-syne font-bold text-lg">Price movement</h3>
              </div>
              <PriceChart market={market} />
            </div>

            <RecentTradesFeed market={market} />
            <MarketStatsBar market={market} />

            <CollapsibleSection title="Order book" defaultOpen={false}>
              <OrderBook market={market} />
            </CollapsibleSection>

            <CollapsibleSection title="Liquidity depth" defaultOpen={false}>
              <LiquidityDepth market={market} />
            </CollapsibleSection>

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
                volume24h: market.liquidity?.volume24h ?? market.volume,
                status: market.status,
                lifecycle: lifecycleStatus,
              }}
            />

            <RelatedMarkets currentMarket={market} />
            <CommunitySentiment market={market} />

            <CollapsibleSection title="Resolution rules" defaultOpen={false}>
              <ResolutionInfo azuroData={marketQuery.data?.azuroData} />
            </CollapsibleSection>

            <AdvancedProtocolDetails
              marketId={marketId}
              market={market}
              lastUpdatedAt={lastUpdated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
