import { ArrowRight, Activity, Shield } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { LiveMarketCard } from './markets/LiveMarketCard';
import { isFootballFocusEnabled } from '~/config/footballFocus';
import { seedMarketToLiveMarket } from '~/utils/seedMarketToLiveMarket';
import { fetchCuratedMarketsFromApi } from '~/utils/curatedMarketsApi';

/** Match curated cap (9) — same pool as `/markets`. */
const HOME_MARKET_CARD_COUNT = 9;

export function LiveMarkets() {
  const navigate = useNavigate();
  const marketsQuery = useQuery({
    queryKey: ['curatedMarkets', 'home'],
    queryFn: fetchCuratedMarketsFromApi,
    staleTime: 50_000,
  });

  const displayedMarkets = useMemo(() => {
    if (marketsQuery.isPending && !marketsQuery.data) {
      return [];
    }
    const rows = marketsQuery.data?.markets;
    if (!rows?.length) return [];
    return rows.slice(0, HOME_MARKET_CARD_COUNT).map(seedMarketToLiveMarket);
  }, [marketsQuery.isPending, marketsQuery.data]);

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
      className="py-20 lg:py-32 bg-gradient-to-b from-brand-navy to-brand-bg relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green/10 border border-brand-green/30 rounded-full mb-6">
            <Activity className="w-4 h-4 text-brand-green" />
            <span className="text-sm font-bold text-brand-green">CURATED MARKETS</span>
          </div>

          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            {isFootballFocusEnabled()
              ? 'Premium Football Markets'
              : 'Curated Prediction Markets'}
          </h2>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            {isFootballFocusEnabled()
              ? 'Nine founder-curated matches backed by the protocol vault. Odds from Azuro; order reflects editorial priority.'
              : 'A focused set of curated markets with shared vault liquidity.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10 mb-10">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
              <Shield className="w-5 h-5 text-brand-cyan" />
              <div className="text-left">
                <p className="font-mono text-2xl font-bold text-brand-cyan m-0">{curatedCount}</p>
                <p className="text-xs text-gray-400 font-medium m-0">Active curated markets</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
              <Activity className="w-5 h-5 text-brand-green" />
              <div className="text-left">
                <p className="text-sm font-semibold text-white/90 m-0">Vault-backed</p>
                <p className="text-xs text-gray-400 m-0">Pre-testnet · paper USDC</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {marketsQuery.isPending && !marketsQuery.data
            ? Array.from({ length: HOME_MARKET_CARD_COUNT }).map((_, index) => (
                <div
                  key={`sk-${index}`}
                  className="h-[280px] rounded-xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))
            : displayedMarkets.map((market, index) => (
                <div
                  key={market.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <LiveMarketCard market={market} onClick={() => handleMarketClick(market.id)} />
                </div>
              ))}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleViewAllMarkets}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold text-lg rounded-xl hover:shadow-2xl hover:shadow-brand-green/40 hover:scale-105 transition-all"
          >
            <span>View all curated markets</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm text-gray-500 mt-4 m-0">
            Same catalog and ranking as the Markets page
          </p>
        </div>
      </div>
    </section>
  );
}
