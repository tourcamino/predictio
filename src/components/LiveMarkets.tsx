import { ArrowRight, Activity, Shield } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { LiveMarketCard } from './markets/LiveMarketCard';
import { isFootballFocusEnabled } from '~/config/footballFocus';
import { seedMarketToLiveMarket } from '~/utils/seedMarketToLiveMarket';
import { fetchCuratedMarketsFromApi } from '~/utils/curatedMarketsApi';
import {
  marketQualifiesForFeaturedHero,
  orderForHomepageIntelligence,
} from '~/lib/featuredIntelligenceLayer';
import { azuroMarketPassesProtocolCatalogSurface, premiumCatalogTier } from '~/lib/premiumCatalogStrictClient';
import { homeMarketSection } from '~/copy/homePremium';

/** Canonical homepage book — same cap as `/markets` featured rail. */
const HOME_MARKET_CARD_COUNT = 9;

export function LiveMarkets() {
  const navigate = useNavigate();
  const marketsQuery = useQuery({
    queryKey: ['curatedMarkets', 'home'],
    queryFn: fetchCuratedMarketsFromApi,
    staleTime: 50_000,
  });

  const catalogClock = marketsQuery.dataUpdatedAt ?? Date.now();

  const { displayedMarkets, premiumCount, ready } = useMemo(() => {
    if (marketsQuery.isPending && !marketsQuery.data) {
      return {
        displayedMarkets: [] as ReturnType<typeof seedMarketToLiveMarket>[],
        premiumCount: 0,
        ready: false,
      };
    }
    const rows = marketsQuery.data?.markets;
    if (!rows?.length) {
      return { displayedMarkets: [], premiumCount: 0, ready: true };
    }
    const pool = rows.slice(0, HOME_MARKET_CARD_COUNT);
    const premium = pool.filter(azuroMarketPassesProtocolCatalogSurface);
    const ordered =
      premium.length === 0
        ? []
        : orderForHomepageIntelligence(premium, catalogClock, HOME_MARKET_CARD_COUNT);
    return {
      displayedMarkets: ordered.map(seedMarketToLiveMarket),
      premiumCount: premium.length,
      poolCount: pool.length,
      ready: true,
    };
  }, [marketsQuery.isPending, marketsQuery.data, catalogClock]);

  const curatedCount = displayedMarkets.length;

  const handleViewAllMarkets = () => {
    navigate({ to: '/markets', search: { sortBy: 'featured' } });
  };

  const handleMarketClick = (marketId: string) => {
    navigate({ to: '/markets/$marketId', params: { marketId } });
  };

  return (
    <section
      id="markets"
      className="relative overflow-hidden bg-gradient-to-b from-brand-navy to-brand-bg py-20 lg:py-32"
    >
      <div className="absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-brand-green/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-brand-cyan/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-2">
            <Activity className="h-4 w-4 text-brand-green" />
            <span className="text-sm font-bold text-brand-green">{homeMarketSection.badge}</span>
          </div>

          <h2 className="mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text font-syne text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl">
            {isFootballFocusEnabled() ? 'Premium Football Markets' : homeMarketSection.title}
          </h2>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-400">
            {isFootballFocusEnabled()
              ? 'Hand-picked European football — live prices, copy flows, real positioning before lock.'
              : homeMarketSection.sub}
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-6 lg:gap-10">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <Shield className="h-5 w-5 text-brand-cyan" />
              <div className="text-left">
                <p className="m-0 font-mono text-2xl font-bold text-brand-cyan">{curatedCount}</p>
                <p className="m-0 text-xs font-medium text-gray-400">{homeMarketSection.statBookLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <Activity className="h-5 w-5 text-brand-green" />
              <div className="text-left">
                <p className="m-0 text-sm font-semibold text-white/90">{homeMarketSection.statFlowLabel}</p>
                <p className="m-0 text-xs text-gray-400">{homeMarketSection.statFlowHint}</p>
              </div>
            </div>
          </div>
        </div>

        {ready && premiumCount === 0 ? (
          <div className="mb-12 rounded-xl border border-white/10 bg-white/5 px-6 py-16 text-center">
            <p className="font-syne text-xl text-gray-300">{homeMarketSection.emptyTitle}</p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-gray-500">{homeMarketSection.emptySub}</p>
            <button
              type="button"
              onClick={handleViewAllMarkets}
              className="mt-8 text-sm font-semibold text-brand-green hover:text-brand-green/80"
            >
              {homeMarketSection.cta} →
            </button>
          </div>
        ) : (
          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {!ready
              ? Array.from({ length: HOME_MARKET_CARD_COUNT }).map((_, index) => (
                  <div
                    key={`sk-${index}`}
                    className="h-[280px] animate-pulse rounded-xl border border-white/10 bg-white/5"
                  />
                ))
              : displayedMarkets.map((market, index) => {
                  const az = marketsQuery.data?.markets?.find((m) => m.id === market.id);
                  const featured =
                    az && marketQualifiesForFeaturedHero(az) && index === 0 && premiumCatalogTier(az) === 'A';
                  return (
                    <div
                      key={market.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <LiveMarketCard
                        market={market}
                        featured={featured}
                        onClick={() => handleMarketClick(market.id)}
                      />
                    </div>
                  );
                })}
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={handleViewAllMarkets}
            className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-brand-green to-brand-cyan px-8 py-4 text-lg font-bold text-brand-bg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-brand-green/40"
          >
            <span>{homeMarketSection.cta}</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="mt-4 m-0 text-sm text-gray-500">{homeMarketSection.ctaHint}</p>
        </div>
      </div>
    </section>
  );
}
