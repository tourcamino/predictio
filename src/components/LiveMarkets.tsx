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
    <section id="markets" className="py-20 lg:py-32 bg-brand-bg relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/10 rounded-full mb-6">
            <Activity className="w-3.5 h-3.5 text-brand-green" />
            <span className="text-xs font-semibold text-gray-400 tracking-wide">CURATED MARKETS</span>
          </div>

          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl mb-6 text-white">
            {isFootballFocusEnabled()
              ? 'Premium Football Markets'
              : 'Curated Prediction Markets'}
          </h2>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            {isFootballFocusEnabled()
              ? 'Nine editorially orchestrated fixtures — premium anchors, Italy-first, and protocol identity slots — with shared paper liquidity routing.'
              : 'A focused set of curated markets with editorial paper liquidity allocation.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8 mb-10">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/10 rounded-lg">
              <Shield className="w-4 h-4 text-gray-500" />
              <div className="text-left">
                <p className="font-mono text-xl font-bold text-white m-0">{curatedCount}</p>
                <p className="text-xs text-gray-400 m-0">Active curated markets</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/10 rounded-lg">
              <Activity className="w-4 h-4 text-brand-green" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-300 m-0">Vault-backed</p>
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
                  className="h-[280px] rounded-xl bg-white/[0.02] border border-white/10 animate-pulse"
                />
              ))
            : displayedMarkets.map((market) => (
                <div key={market.id}>
                  <LiveMarketCard market={market} onClick={() => handleMarketClick(market.id)} />
                </div>
              ))}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleViewAllMarkets}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-green text-brand-bg font-semibold text-base rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            <span>View all curated markets</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-sm text-gray-500 mt-4 m-0">
            Same catalog and ranking as the Markets page
          </p>
        </div>
      </div>
    </section>
  );
}
