import { ArrowRight, Activity } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { LiveMarketCard } from './markets/LiveMarketCard';
import { seedMarketToLiveMarket } from '~/utils/seedMarketToLiveMarket';
import { fetchCuratedMarketsFromApi } from '~/utils/curatedMarketsApi';
import { formatKickoffPreview } from '~/lib/homepageCuratedNarrative';
import {
  editorialBriefingDescriptor,
  orderForHomepageIntelligence,
} from '~/lib/featuredIntelligenceLayer';

/** Match curated cap (9) — same pool as `/markets`. */
const HOME_MARKET_CARD_COUNT = 9;

export function LiveMarkets() {
  const navigate = useNavigate();
  const marketsQuery = useQuery({
    queryKey: ['curatedMarkets', 'home'],
    queryFn: fetchCuratedMarketsFromApi,
    staleTime: 50_000,
  });

  const curatedSlice = useMemo(() => {
    if (marketsQuery.isPending && !marketsQuery.data) return [];
    const rows = marketsQuery.data?.markets;
    if (!rows?.length) return [];
    return rows.slice(0, HOME_MARKET_CARD_COUNT);
  }, [marketsQuery.isPending, marketsQuery.data]);

  const catalogClock = marketsQuery.dataUpdatedAt ?? Date.now();

  /** Foreground density cap — featured + two supporting + optional compact strip. */
  const intelligenceSlice = useMemo(() => {
    if (curatedSlice.length === 0) return [];
    return orderForHomepageIntelligence(curatedSlice, catalogClock, 5);
  }, [curatedSlice, catalogClock]);

  const featuredRow = intelligenceSlice[0];
  const supportingRows = intelligenceSlice.slice(1, 3);
  const compactRows = intelligenceSlice.slice(3, 5);

  const poolCount = curatedSlice.length;
  const foregroundCount = intelligenceSlice.length;

  const handleViewAllMarkets = () => {
    navigate({ to: '/markets', search: { sortBy: 'featured' } });
  };

  const handleMarketClick = (marketId: string) => {
    navigate({ to: '/markets/$marketId', params: { marketId } });
  };

  return (
    <section id="markets" className="py-20 lg:py-32 bg-brand-bg relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mb-16 lg:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.08] mb-8">
            <Activity className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px] font-semibold text-gray-500 tracking-[0.22em] uppercase">
              Editorial catalogue
            </span>
          </div>

          <h2 className="font-syne font-bold text-3xl sm:text-4xl lg:text-[2.75rem] text-white mb-6 leading-[1.1] tracking-tight">
            European premium multisport outlook
          </h2>

          <p className="text-base sm:text-lg text-gray-500 leading-[1.65] mb-8 max-w-2xl">
            High-signal events only — a cover outlook, two supporting contexts, and a compact radar
            strip when the book allows. Ordering favours anticipation and editorial priority over raw
            grid sequence.
          </p>

          <p className="text-xs text-gray-600 font-mono tabular-nums m-0">
            {foregroundCount} foreground outlook{foregroundCount === 1 ? '' : 's'}
            {poolCount > 0 ? ` · drawn from ${poolCount}-row curated pool` : ''}
          </p>
        </div>

        {marketsQuery.isPending && !marketsQuery.data ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-7 min-h-[360px] rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="min-h-[200px] rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse flex-1" />
              <div className="min-h-[200px] rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse flex-1" />
            </div>
          </div>
        ) : featuredRow ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start mb-16 lg:mb-20">
              <div className="lg:col-span-7 min-w-0">
                <LiveMarketCard
                  variant="featured"
                  market={seedMarketToLiveMarket(featuredRow)}
                  narrativeLabel={
                    [
                      editorialBriefingDescriptor(featuredRow),
                      formatKickoffPreview(featuredRow),
                    ]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  onClick={() => handleMarketClick(featuredRow.id)}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col gap-6">
                {supportingRows.map((row) => {
                  const kick = formatKickoffPreview(row);
                  const kicker = [editorialBriefingDescriptor(row), kick].filter(Boolean).join(' · ');
                  return (
                    <div key={row.id} className="min-h-[200px] min-w-0">
                      <LiveMarketCard
                        variant="standard"
                        market={seedMarketToLiveMarket(row)}
                        narrativeLabel={kicker || undefined}
                        onClick={() => handleMarketClick(row.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {compactRows.length > 0 && (
              <div className="border-t border-white/[0.05] pt-12 lg:pt-16 mb-16">
                <div className="mb-8 max-w-2xl">
                  <h3 className="font-syne text-lg sm:text-xl font-bold text-white m-0 tracking-tight">
                    Compact radar
                  </h3>
                  <p className="text-sm text-gray-500 mt-2 m-0 leading-relaxed">
                    Additional curated gates — same protocol, lower visual weight.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  {compactRows.map((row) => (
                    <div key={row.id}>
                      <LiveMarketCard
                        variant="compact"
                        market={seedMarketToLiveMarket(row)}
                        onClick={() => handleMarketClick(row.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        <div className="text-center pt-6 border-t border-white/[0.04]">
          <button
            type="button"
            onClick={handleViewAllMarkets}
            className="inline-flex items-center gap-2 px-7 py-3 border border-white/15 text-sm font-semibold text-gray-300 rounded-lg hover:border-white/25 hover:text-white transition-colors"
          >
            <span>Full research terminal</span>
            <ArrowRight className="w-4 h-4 opacity-70" />
          </button>
          <p className="text-[11px] text-gray-600 mt-4 m-0">
            Full terminal lists the complete curated book; homepage sequence is intelligence-ranked
            for this surface.
          </p>
        </div>
      </div>
    </section>
  );
}
