// @ts-nocheck — TanStack Router search-param updaters infer `never` until route tree types catch up.
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useEffect } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Sparkles, Loader2 } from 'lucide-react';
import { fetchCuratedMarketsFromApi } from '~/utils/curatedMarketsApi';
import { FilterChips } from '~/components/markets/FilterChips';
import { MarketSection } from '~/components/markets/MarketSection';
import { MarketsGrid } from '~/components/markets/MarketsGrid';
import { MarketsFilterSidebar } from '~/components/markets/MarketsFilterSidebar';
import { MarketCardSkeleton } from '~/components/markets/MarketCardSkeleton';
import { SeedMarket } from '~/data/seedMarkets';
import { SPORT_METADATA, getSportMetadata } from '~/data/mockMarkets';
import { MetaTags } from "~/components/MetaTags";
import { useMarketsUIStore } from '~/store/useMarketsUIStore';
import { isFootballFocusEnabled, getDefaultSport, isSportAllowed, FOOTBALL_FOCUS_CONFIG } from '~/config/footballFocus';
import { MAX_FOOTBALL_MARKETS } from '~/constants/azuro';
import { getApiBaseUrl } from '~/lib/predictioApi';
import { useUserCountry } from '~/hooks/useUserCountry';
import { COUNTRY_FLAG, COUNTRY_LABEL, COUNTRY_OPTIONS, getMarketCountryCode, isEliteMarket, isMajorTournamentMarket } from '~/config/marketGeo';
import { MarketsFilterDrawer } from '~/components/markets/MarketsFilterDrawer';
import { useTRPC } from '~/trpc/react';
import {
  getTradingLockMs,
  hoursUntilTradingLock,
  isSeedMarketTradable,
} from '~/utils/seedMarketTrading';
import type { AzuroMarket } from '~/services/azuro';
import { isCanonicalCuratedCatalog } from '~/lib/curatedMarketPresentation';
import { groupMarketsByEditorialSlot } from '~/lib/editorialCatalogPresentation';
import { marketMatchesSearch } from '~/lib/markets/filterMarketsSearch';
import { expandSearchQuery, logSearchAliasExpansion } from '~/lib/markets/teamPlayerAliases';

const marketSearchSchema = z.object({
  sport: fallback(z.string(), isFootballFocusEnabled() ? 'football' : 'all').default(isFootballFocusEnabled() ? 'football' : 'all'),
  competition: fallback(z.string(), 'all').default('all'),
  status: fallback(z.string(), 'all').default('all'),
  sortBy: fallback(
    z.enum([
      'featured',
      'trending',
      'volume',
      'liquidity',
      'ending-soon',
      'newest',
      'traders',
      'closing-soon',
      'most-popular',
      'most-predicted',
    ]),
    'featured',
  ).default('featured'),
  search: fallback(z.string(), '').default(''),
  viewMode: fallback(z.enum(['grid', 'list']), 'grid').default('grid'),
  endsIn: fallback(z.string(), 'all').default('all'),
  displayCount: fallback(z.number(), 20).default(20),
  selectedRegion: fallback(z.string(), 'all').default('all'),
  minOdds: fallback(z.number(), 1.01).default(1.01),
  maxOdds: fallback(z.number(), 10).default(10),
  analystRecommended: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute('/markets/')({
  validateSearch: zodValidator(marketSearchSchema),
  component: MarketsPage,
});

// Calculate sport categories with stats
function calculateSportCategories(markets: SeedMarket[]) {
  const categoriesMap = new Map<string, { count: number; volume: number }>();
  
  markets.forEach(market => {
    const existing = categoriesMap.get(market.sport) || { count: 0, volume: 0 };
    categoriesMap.set(market.sport, {
      count: existing.count + 1,
      volume: existing.volume + market.volume24h,
    });
  });
  
  const categories = [
    {
      id: 'all',
      name: 'All Sports',
      emoji: '🏆',
      marketCount: markets.length,
      volume24h: markets.reduce((sum, m) => sum + m.volume24h, 0),
    },
  ];
  
  categoriesMap.forEach((stats, sportId) => {
    const meta = SPORT_METADATA[sportId];
    if (meta) {
      categories.push({
        id: sportId,
        name: meta.name,
        emoji: meta.emoji,
        marketCount: stats.count,
        volume24h: stats.volume,
      });
    }
  });
  
  return categories;
}

// Filter markets
function filterMarkets(
  markets: SeedMarket[],
  filters: {
    sport: string;
    competition: string;
    status: string;
    search: string;
    endsIn: string;
  }
): SeedMarket[] {
  return markets.filter(market => {
    // Sport filter
    if (filters.sport !== 'all' && market.sport !== filters.sport) {
      return false;
    }
    
    // Competition filter
    if (filters.competition !== 'all' && market.competitionSlug !== filters.competition) {
      return false;
    }
    
    // Status filter
    if (filters.status !== 'all' && market.status !== filters.status) {
      return false;
    }
    
    // Search filter — token + alias aware (football / curated)
    if (filters.search.trim()) {
      if (!marketMatchesSearch(market, filters.search)) {
        return false;
      }
    }
    
    // Ends in filter
    if (filters.endsIn !== 'all') {
      const now = new Date();
      const endsAt = new Date(market.endsAt);
      const hoursUntilEnd = (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (filters.endsIn === '24h' && hoursUntilEnd > 24) return false;
      if (filters.endsIn === '7d' && hoursUntilEnd > 168) return false;
      if (filters.endsIn === '30d' && hoursUntilEnd > 720) return false;
    }
    
    return true;
  });
}

// Sort markets
function sortMarkets(markets: SeedMarket[], sortBy: string): SeedMarket[] {
  const sorted = [...markets];
  
  switch (sortBy) {
    case 'featured':
      return sorted;
    case 'trending':
      return sorted.sort((a, b) => {
        const scoreA = a.volume24h * a.traders;
        const scoreB = b.volume24h * b.traders;
        return scoreB - scoreA;
      });
    case 'volume':
      return sorted.sort((a, b) => b.volume24h - a.volume24h);
    case 'liquidity':
      return sorted.sort((a, b) => b.liquidity - a.liquidity);
    case 'ending-soon':
    case 'closing-soon':
      return sorted.sort((a, b) => {
        const la = getTradingLockMs(a);
        const lb = getTradingLockMs(b);
        const sa = Number.isFinite(la) ? la : Number.POSITIVE_INFINITY;
        const sb = Number.isFinite(lb) ? lb : Number.POSITIVE_INFINITY;
        return sa - sb;
      });
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'traders':
    case 'most-popular':
    case 'most-predicted':
      return sorted.sort((a, b) => (b.traders || 0) - (a.traders || 0));
    default:
      return sorted;
  }
}

function MarketsPage() {
  const trpc = useTRPC();
  const expandSearchMutation = useMutation(trpc.expandMarketSearch.mutationOptions());
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/markets' });
  const { isSidebarCollapsed } = useMarketsUIStore();
  
  const {
    sport: selectedSport,
    competition: selectedCompetition,
    status: selectedStatus,
    sortBy,
    search: searchQuery,
    viewMode,
    endsIn,
    displayCount,
    selectedRegion,
    minOdds,
    maxOdds,
    analystRecommended,
  } = search;

  const userCountry = useUserCountry();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleAiRefineSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      toast.error('Enter at least 2 characters to refine');
      return;
    }
    try {
      const r = await expandSearchMutation.mutateAsync({ query: q });
      navigate({ search: (prev) => ({ ...prev, search: r.expandedQuery }) });
      if (r.note) toast(r.note, { duration: 5000 });
      else if (r.expandedQuery.trim() !== q) {
        toast.success('Search matched to teams & competitions');
      }
    } catch {
      toast.error('AI refine failed — try again');
    }
  };
  
  // Redirect to football if user tries to access other sports in football focus mode
  useEffect(() => {
    if (isFootballFocusEnabled() && !isSportAllowed(selectedSport)) {
      navigate({ 
        search: { 
          ...search, 
          sport: getDefaultSport(),
          competition: 'all' 
        },
        replace: true 
      });
    }
  }, [selectedSport, navigate, search]);
  
  // Founder-curated list from Express `GET /api/markets` (same DB as admin curation)
  const marketsQuery = useQuery({
    queryKey: ["curatedMarkets", "markets-page"],
    queryFn: fetchCuratedMarketsFromApi,
    refetchInterval: 120_000,
    staleTime: 50000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
  });
  
  const allMarkets = marketsQuery.data?.markets || [];
  const rawFeedCatalog = marketsQuery.data?.rawFeedMode === true;
  const canonicalCuratedCatalog = isCanonicalCuratedCatalog(allMarkets);

  /** True until the first successful response (includes automatic retry fetches). */
  const awaitingFirstSuccess =
    !marketsQuery.isSuccess &&
    (marketsQuery.isPending || marketsQuery.isFetching);
  
  // Calculate sport categories with stats
  const sportCategories = useMemo(() => {
    const calculated = calculateSportCategories(allMarkets);
    
    // Filter to only football categories when football focus is enabled
    if (isFootballFocusEnabled()) {
      return calculated.filter(cat => cat.id === 'all' || cat.id === 'football');
    }
    
    return calculated;
  }, [allMarkets]);
  
  // Get competitions for selected sport
  const competitions = useMemo(() => {
    if (selectedSport === 'all') return [];
    
    const comps = new Set<string>();
    allMarkets.forEach(market => {
      if (market.sport === selectedSport) {
        comps.add(market.competition);
      }
    });
    return Array.from(comps).sort();
  }, [selectedSport, allMarkets]);
  
  // Filter markets
  const filteredMarkets = useMemo(
    () => {
      const base = filterMarkets(allMarkets, {
        sport: selectedSport,
        competition: selectedCompetition,
        status: selectedStatus,
        search: searchQuery,
        endsIn,
      });

      if (searchQuery.trim()) {
        const { expandedTokens } = expandSearchQuery(searchQuery);
        logSearchAliasExpansion(
          searchQuery,
          expandedTokens,
          base.map((m) => m.id),
        );
      }

      if (!selectedRegion || selectedRegion === 'all') return base;
      if (selectedRegion === 'elite') return base.filter((m) => isEliteMarket(m));

      // country code filter (e.g. "IT")
      return base.filter((m) => getMarketCountryCode(m) === selectedRegion);
    },
    [
      allMarkets,
      selectedSport,
      selectedCompetition,
      selectedStatus,
      searchQuery,
      endsIn,
      selectedRegion,
    ]
  );
  
  // Sort markets; canonical catalog + featured preserves API editorial order
  const editorialCatalogSections = useMemo(() => {
    if (!canonicalCuratedCatalog || sortBy !== 'featured') return [];
    return groupMarketsByEditorialSlot(filteredMarkets as AzuroMarket[]);
  }, [canonicalCuratedCatalog, sortBy, filteredMarkets]);

  const effectiveDisplayCount = rawFeedCatalog ? Math.max(displayCount, 250) : displayCount;

  const sortedMarkets = useMemo(() => {
    if (canonicalCuratedCatalog && sortBy === 'featured') {
      return filteredMarkets;
    }
    const base = sortMarkets(filteredMarkets, sortBy);
    if (canonicalCuratedCatalog) {
      return base;
    }
    const cc = userCountry.countryCode;

    const score = (m: SeedMarket) => {
      const tradable = isSeedMarketTradable(m) ? 500000 : 0;
      const local = getMarketCountryCode(m) === cc ? 100000 : 0;
      const trending = (m.volume24h || 0) >= 30000 ? 10000 : 0;
      const vol = Math.min(9999, Math.floor((m.volume24h || 0) / 10));
      return tradable + local + trending + vol;
    };

    return [...base].sort((a, b) => score(b) - score(a));
  }, [filteredMarkets, sortBy, userCountry.countryCode, canonicalCuratedCatalog]);
  
  // Get curated sections (only show when no filters active)
  const hasActiveFilters = selectedSport !== (isFootballFocusEnabled() ? 'football' : 'all') || 
    selectedCompetition !== 'all' || 
    selectedStatus !== 'all' || 
    searchQuery !== '' || 
    endsIn !== 'all';
  
  const spotlightMarkets = useMemo(() => {
    const tradable = allMarkets.filter(isSeedMarketTradable);
    const importance = (m: SeedMarket) => (m as AzuroMarket).importanceScore ?? 0;
    const spotlightScore = (m: SeedMarket) => {
      const imp = importance(m);
      const major = isMajorTournamentMarket(m) ? 5000 : 0;
      const elite = isEliteMarket(m) ? 2000 : 0;
      return imp * 100 + major + elite + (m.traders || 0);
    };
    const candidates = tradable.filter((m) => {
      const imp = importance(m);
      return isMajorTournamentMarket(m) || imp >= 40 || isEliteMarket(m);
    });
    let list = [...candidates].sort((a, b) => spotlightScore(b) - spotlightScore(a));
    if (list.length < 3) {
      const ids = new Set(list.map((m) => m.id));
      const extra = [...tradable]
        .filter((m) => !ids.has(m.id))
        .sort((a, b) => spotlightScore(b) - spotlightScore(a));
      list = [...list, ...extra].slice(0, 5);
    } else {
      list = list.slice(0, 5);
    }
    return list;
  }, [allMarkets]);

  const mostTradedMarkets = useMemo(() => {
    const tradable = allMarkets.filter(isSeedMarketTradable);
    return [...tradable]
      .sort((a, b) => (b.traders || 0) - (a.traders || 0))
      .slice(0, 5);
  }, [allMarkets]);

  const locksSoonMarkets = useMemo(() => {
    return allMarkets
      .filter((m) => {
        if (!isSeedMarketTradable(m)) return false;
        const h = hoursUntilTradingLock(m);
        return h > 0 && h <= 72;
      })
      .sort((a, b) => {
        const la = getTradingLockMs(a);
        const lb = getTradingLockMs(b);
        const sa = Number.isFinite(la) ? la : 0;
        const sb = Number.isFinite(lb) ? lb : 0;
        return sa - sb;
      })
      .slice(0, 5);
  }, [allMarkets]);

  const trendingMarkets = useMemo(
    () =>
      sortMarkets(
        allMarkets.filter((m) => isSeedMarketTradable(m) && m.volume24h > 30000),
        'trending',
      ).slice(0, 5),
    [allMarkets],
  );

  const localMarkets = useMemo(() => {
    const cc = userCountry.countryCode;
    return sortMarkets(
      allMarkets.filter(
        (m) => isSeedMarketTradable(m) && getMarketCountryCode(m) === cc,
      ),
      'trending',
    ).slice(0, 5);
  }, [allMarkets, userCountry.countryCode]);

  const eliteMarkets = useMemo(() => {
    return sortMarkets(
      allMarkets.filter((m) => isSeedMarketTradable(m) && isEliteMarket(m)),
      'trending',
    ).slice(0, 5);
  }, [allMarkets]);

  const upcomingMarkets = useMemo(() => {
    return sortMarkets(
      allMarkets.filter((m) => {
        if (!isSeedMarketTradable(m)) return false;
        const h = hoursUntilTradingLock(m);
        return Number.isFinite(h) ? h > 72 : m.status === 'upcoming';
      }),
      'newest',
    ).slice(0, 5);
  }, [allMarkets]);
  
  // Paginated display
  const displayedMarkets = sortedMarkets.slice(0, effectiveDisplayCount);
  
  // Filter chips
  const filterChips = [];
  if (selectedSport !== 'all') {
    const sportMeta = getSportMetadata(selectedSport);
    filterChips.push({
      id: 'sport',
      label: `${sportMeta.emoji} ${sportMeta.name}`,
      onRemove: () => navigate({ search: prev => ({ ...prev, sport: 'all' }) }),
    });
  }
  if (selectedCompetition !== 'all') {
    filterChips.push({
      id: 'competition',
      label: selectedCompetition,
      onRemove: () => navigate({ search: prev => ({ ...prev, competition: 'all' }) }),
    });
  }
  if (selectedStatus !== 'all') {
    filterChips.push({
      id: 'status',
      label: selectedStatus,
      onRemove: () => navigate({ search: prev => ({ ...prev, status: 'all' }) }),
    });
  }
  if (endsIn !== 'all') {
    filterChips.push({
      id: 'endsIn',
      label: `Ends in ${endsIn}`,
      onRemove: () => navigate({ search: prev => ({ ...prev, endsIn: 'all' }) }),
    });
  }
  if (selectedRegion && selectedRegion !== 'all') {
    const isElite = selectedRegion === 'elite';
    const label = isElite
      ? '🌍 World Class'
      : `${COUNTRY_FLAG[selectedRegion as keyof typeof COUNTRY_FLAG] ?? '🏳️'} ${COUNTRY_LABEL[selectedRegion as keyof typeof COUNTRY_LABEL] ?? selectedRegion}`;
    filterChips.push({
      id: 'region',
      label,
      onRemove: () => navigate({ search: prev => ({ ...prev, selectedRegion: 'all' }) }),
    });
  }
  
  const handleClearAllFilters = () => {
    navigate({
      search: {
        sport: isFootballFocusEnabled() ? 'football' : 'all',
        competition: 'all',
        status: 'all',
        search: '',
        sortBy: 'featured',
        viewMode: 'grid',
        endsIn: 'all',
        displayCount: 20,
        selectedRegion: 'all',
        minOdds: 1.01,
        maxOdds: 10,
        analystRecommended: false,
      },
    });
  };
  
  const handleMarketClick = (marketId: string) => {
    navigate({ to: '/markets/$marketId', params: { marketId } });
  };
  
  const handleLoadMore = () => {
    navigate({
      search: prev => ({ ...prev, displayCount: prev.displayCount + 20 }),
    });
  };
  
  // Loading / retrying until we have a successful payload
  if (awaitingFirstSuccess) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <MetaTags
          title="Sports Markets — Predictio.live"
          description="Browse football prediction markets. Champions League, Serie A, Premier League and more."
          url={typeof window !== 'undefined' ? window.location.href : undefined}
        />
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Loading indicator */}
            <div className="mb-8 px-6 py-4 bg-brand-green/10 border border-brand-green/30 rounded-xl flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-green" />
              <span className="text-brand-green font-semibold">Loading markets…</span>
            </div>

            {/* Skeleton Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))}
            </div>
        </div>
      </div>
    );
  }

  // TRPC / network failure after retries exhausted (never got a successful response)
  if (marketsQuery.isError && !marketsQuery.isSuccess) {
    const rawMsg =
      marketsQuery.error instanceof Error
        ? marketsQuery.error.message
        : "Unable to load markets.";
    const apiHint =
      typeof window !== "undefined" &&
      (rawMsg === "Failed to fetch" || /network|fetch/i.test(rawMsg))
        ? ` API base: ${getApiBaseUrl() || window.location.origin}. Start Express in another terminal: cd backend && npm run dev (default port 3001). Ensure Postgres is up if you expect curated rows.`
        : "";
    const msg = rawMsg + apiHint;
    return (
      <div className="min-h-screen bg-brand-bg">
        <MetaTags
          title="Sports Markets — Predictio.live"
          description="Browse football prediction markets. Champions League, Serie A, Premier League and more."
          url={typeof window !== "undefined" ? window.location.href : undefined}
        />
        <div className="px-4 max-w-lg mx-auto text-center">
          <p className="text-red-400 font-semibold mb-2">Could not load markets</p>
          <p className="text-gray-400 text-sm mb-6 whitespace-pre-wrap">{msg}</p>
          <button
            type="button"
            onClick={() => marketsQuery.refetch()}
            className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-brand-bg">
      <MetaTags
        title="Sports Markets — Predictio.live"
        description="Browse football prediction markets. Champions League, Serie A, Premier League and more."
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />
      {/* Main Content Area with Sidebar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search Bar - Above the grid */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Teams, leagues, or natural language (e.g. Juve Champions) — AI refines to match names"
                value={searchQuery}
                onChange={(e) => navigate({ search: prev => ({ ...prev, search: e.target.value }) })}
                className="w-full pl-12 pr-28 sm:pr-32 py-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" aria-hidden>
                🔍
              </div>
              <button
                type="button"
                title="Align search with your intent (teams, leagues, languages)"
                onClick={() => void handleAiRefineSearch()}
                disabled={expandSearchMutation.isPending || searchQuery.trim().length < 2}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan hover:bg-brand-cyan/25 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {expandSearchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Refine</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Refine uses AI to map informal or mixed-language queries to team and competition names in the catalog.
            </p>
          </div>

          {/* Mobile filters: compact bar + drawer */}
          <div className="mb-4 lg:hidden flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 hover:border-brand-green/30 transition-colors"
              >
                Filters
              </button>
              {(selectedRegion !== 'all' ||
                selectedStatus !== 'all' ||
                selectedSport !== (isFootballFocusEnabled() ? 'football' : 'all')) && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="h-10 px-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200 hover:bg-red-500/20 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Geo-smart quick filters (mobile-first chips) */}
          <div className="mb-4 lg:hidden flex items-center gap-3">
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 min-w-max">
              <button
                type="button"
                onClick={() => navigate({ search: prev => ({ ...prev, selectedRegion: userCountry.countryCode }) })}
                className={`px-3 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  selectedRegion === userCountry.countryCode
                    ? 'bg-brand-green/20 border-brand-green/40 text-brand-green'
                    : 'bg-white/5 border-white/10 text-white/80 hover:border-brand-green/30'
                }`}
              >
                {userCountry.flag} Your Nation
              </button>
              <button
                type="button"
                onClick={() => navigate({ search: prev => ({ ...prev, selectedRegion: 'elite' }) })}
                className={`px-3 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  selectedRegion === 'elite'
                    ? 'bg-brand-cyan/20 border-brand-cyan/40 text-brand-cyan'
                    : 'bg-white/5 border-white/10 text-white/80 hover:border-brand-cyan/30'
                }`}
              >
                🌍 World Class
              </button>
              <button
                type="button"
                onClick={() => navigate({ search: prev => ({ ...prev, selectedRegion: 'all' }) })}
                className={`px-3 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  selectedRegion === 'all'
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                }`}
              >
                All Regions
              </button>
              </div>
            </div>

            {/* Compact region/country dropdown (mobile) */}
            <div className="flex-shrink-0">
              <select
                value={selectedRegion}
                onChange={(e) =>
                  navigate({ search: (prev) => ({ ...prev, selectedRegion: e.target.value }) })
                }
                className="h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green/40"
              >
                <option value="all">🌍 All</option>
                <option value={userCountry.countryCode}>
                  {userCountry.flag} Your Nation
                </option>
                <option value="elite">🌍 World Class</option>
                <optgroup label="Countries">
                  {COUNTRY_OPTIONS.map((cc) => (
                    <option key={cc} value={cc}>
                      {COUNTRY_FLAG[cc]} {COUNTRY_LABEL[cc]}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <MarketsFilterDrawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            onApply={() => setFiltersOpen(false)}
            selectedSport={selectedSport}
            selectedRegion={selectedRegion}
            selectedStatus={selectedStatus}
            sortBy={sortBy}
            minOdds={minOdds}
            maxOdds={maxOdds}
            analystRecommended={analystRecommended}
            onSportChange={(sport) => {
              navigate({ search: (prev) => ({ ...prev, sport }) });
            }}
            onRegionChange={(r) => {
              navigate({ search: (prev) => ({ ...prev, selectedRegion: r }) });
            }}
            onStatusChange={(status) => {
              navigate({ search: (prev) => ({ ...prev, status }) });
            }}
            onSortChange={(s) => {
              navigate({ search: (prev) => ({ ...prev, sortBy: s }) });
            }}
            onOddsRangeChange={(min, max) =>
              navigate({ search: (prev) => ({ ...prev, minOdds: min, maxOdds: max }) })
            }
            onAnalystRecommendedChange={(recommended) =>
              navigate({ search: (prev) => ({ ...prev, analystRecommended: recommended }) })
            }
            onClearAll={handleClearAllFilters}
          />

          {/* Filter Chips */}
          {filterChips.length > 0 && (
            <div className="mb-6">
              <FilterChips chips={filterChips} onClearAll={handleClearAllFilters} />
            </div>
          )}

          {/* Layout: Sidebar (25%) + Content (75%) or Full Width when collapsed */}
          <div className={`grid grid-cols-1 gap-6 ${
            isSidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-4'
          }`}>
            {/* Sidebar - 25% width on desktop, hidden on mobile */}
            <div className={`hidden lg:block ${isSidebarCollapsed ? '' : 'lg:col-span-1'}`}>
              <div className="sticky top-24">
                <MarketsFilterSidebar
                  selectedSport={selectedSport}
                  selectedRegion={selectedRegion}
                  selectedStatus={selectedStatus}
                  sortBy={sortBy}
                  minOdds={minOdds}
                  maxOdds={maxOdds}
                  analystRecommended={analystRecommended}
                  onSportChange={(sport) => navigate({ search: prev => ({ ...prev, sport }) })}
                  onRegionChange={(region) => navigate({ search: prev => ({ ...prev, selectedRegion: region }) })}
                  onStatusChange={(status) => navigate({ search: prev => ({ ...prev, status }) })}
                  onSortChange={(sortBy) => navigate({ search: prev => ({ ...prev, sortBy }) })}
                  onOddsRangeChange={(minOdds, maxOdds) => navigate({ search: prev => ({ ...prev, minOdds, maxOdds }) })}
                  onAnalystRecommendedChange={(recommended) => navigate({ search: prev => ({ ...prev, analystRecommended: recommended }) })}
                  onClearAll={handleClearAllFilters}
                />
              </div>
            </div>

            {/* Main Content - 75% width on desktop when sidebar open, 100% when collapsed */}
            <div className={isSidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-3'}>
              {!hasActiveFilters ? (
                <>
                  {/* Feed Structure — hidden for canonical curated catalog (API order in grid) */}
                  {!canonicalCuratedCatalog && spotlightMarkets.length > 0 && (
                    <MarketSection
                      title="Major events"
                      subtitle="Champions League, cups, internationals & editorial highlights — still open for trading"
                      icon="🏆"
                      markets={spotlightMarkets}
                      onMarketClick={handleMarketClick}
                      onViewAll={() =>
                        navigate({ search: (prev) => ({ ...prev, sortBy: 'volume' }) })
                      }
                    />
                  )}

                  {!canonicalCuratedCatalog && mostTradedMarkets.length > 0 && (
                    <MarketSection
                      title="Most active"
                      subtitle="Markets with the highest trader participation"
                      icon="📊"
                      markets={mostTradedMarkets}
                      onMarketClick={handleMarketClick}
                      onViewAll={() =>
                        navigate({ search: (prev) => ({ ...prev, sortBy: 'most-popular' }) })
                      }
                    />
                  )}

                  {!canonicalCuratedCatalog && locksSoonMarkets.length > 0 && (
                    <MarketSection
                      title="Locks soon"
                      subtitle="Trading stops at kickoff — last hours before the match"
                      icon="⏳"
                      markets={locksSoonMarkets}
                      onMarketClick={handleMarketClick}
                      onViewAll={() =>
                        navigate({ search: (prev) => ({ ...prev, sortBy: 'closing-soon' }) })
                      }
                    />
                  )}

                  {!canonicalCuratedCatalog && localMarkets.length > 0 && (
                    <MarketSection
                      title={`${userCountry.flag} Your Nation`}
                      subtitle={`Top local markets in ${userCountry.label}`}
                      icon=""
                      markets={localMarkets}
                      onMarketClick={handleMarketClick}
                      onViewAll={() =>
                        navigate({
                          search: (prev) => ({ ...prev, selectedRegion: userCountry.countryCode }),
                        })
                      }
                    />
                  )}

                  {!canonicalCuratedCatalog && eliteMarkets.length > 0 && (
                    <MarketSection
                      title="World Class"
                      subtitle="Top leagues still open before kickoff"
                      icon="🌍"
                      markets={eliteMarkets}
                      onMarketClick={handleMarketClick}
                      onViewAll={() =>
                        navigate({ search: (prev) => ({ ...prev, selectedRegion: 'elite' }) })
                      }
                    />
                  )}

                  {!canonicalCuratedCatalog && trendingMarkets.length > 0 && (
                    <MarketSection
                      title="Trending Global"
                      subtitle="High volume among markets still open for trading"
                      icon="🔥"
                      markets={trendingMarkets}
                      onMarketClick={handleMarketClick}
                      onViewAll={() =>
                        navigate({ search: (prev) => ({ ...prev, sortBy: 'trending' }) })
                      }
                    />
                  )}

                  {!canonicalCuratedCatalog && upcomingMarkets.length > 0 && (
                    <MarketSection
                      title="Upcoming Matches"
                      subtitle="Kickoff in more than ~3 days — still plenty of time to trade"
                      icon="⚽"
                      markets={upcomingMarkets}
                      onMarketClick={handleMarketClick}
                      onViewAll={() =>
                        navigate({ search: (prev) => ({ ...prev, status: 'upcoming' }) })
                      }
                    />
                  )}
                  
                  {/* All Markets — grid shows up to MAX_FOOTBALL_MARKETS (Azuro football cap) */}
                  <div className="mt-12">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="font-syne text-2xl sm:text-3xl font-bold mb-1">
                          {canonicalCuratedCatalog ? 'Curated markets' : 'All Markets'}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {canonicalCuratedCatalog
                            ? 'Editorial slot order — premium anchors, Italy-first, protocol identity — not raw score ranking'
                            : `Browse sports markets`}
                        </p>
                      </div>
                      
                      {/* View Mode Toggle */}
                      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                        <button
                          onClick={() => navigate({ search: prev => ({ ...prev, viewMode: 'grid' }) })}
                          className={`p-2 rounded transition-colors ${
                            viewMode === 'grid'
                              ? 'bg-brand-green text-brand-bg'
                              : 'text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate({ search: prev => ({ ...prev, viewMode: 'list' }) })}
                          className={`p-2 rounded transition-colors ${
                            viewMode === 'list'
                              ? 'bg-brand-green text-brand-bg'
                              : 'text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {displayedMarkets.length === 0 ? (
                      <div className="col-span-full">
                        <div className="text-center py-20">
                          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-full mb-6">
                            <span className="text-4xl">⚽</span>
                          </div>
                          <h3 className="font-syne text-xl font-bold mb-2">No markets right now</h3>
                          <p className="text-sm text-gray-500 max-w-md mx-auto">
                            The curated catalog is empty. Check back soon for new{' '}
                            sports matches.
                          </p>
                        </div>
                      </div>
                    ) : editorialCatalogSections.length > 0 ? (
                      <div className="space-y-10">
                        {editorialCatalogSections.map((section) => (
                          <div key={section.slot}>
                            <div className="flex items-baseline justify-between gap-3 mb-4">
                              <h3 className="font-syne text-lg font-semibold text-white">
                                {section.label}
                              </h3>
                              <span className="text-[11px] text-gray-600 uppercase tracking-wider">
                                {section.markets.length} fixture
                                {section.markets.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <MarketsGrid
                              markets={section.markets}
                              viewMode={viewMode}
                              onMarketClick={handleMarketClick}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <MarketsGrid
                          markets={
                            rawFeedCatalog
                              ? displayedMarkets
                              : displayedMarkets.slice(0, MAX_FOOTBALL_MARKETS)
                          }
                          viewMode={viewMode}
                          onMarketClick={handleMarketClick}
                        />
                        
                        {/* Load More */}
                        {!rawFeedCatalog &&
                          displayedMarkets.length > MAX_FOOTBALL_MARKETS &&
                          sortedMarkets.length > MAX_FOOTBALL_MARKETS && (
                          <div className="col-span-full mt-8 text-center">
                            <button
                              onClick={handleLoadMore}
                              className="px-8 py-4 bg-transparent border-2 border-brand-green text-brand-green font-semibold rounded-xl hover:bg-brand-green hover:text-brand-bg transition-all hover:scale-105"
                            >
                              Load More Markets
                            </button>
                            <p className="font-mono text-sm text-gray-500 mt-4">
                              Showing {Math.min(MAX_FOOTBALL_MARKETS, displayedMarkets.length)} of {sortedMarkets.length} markets
                            </p>
                          </div>
                        )}
                        {rawFeedCatalog && sortedMarkets.length > 0 && (
                          <p className="font-mono text-sm text-gray-500 mt-6 text-center">
                            Showing {displayedMarkets.length} of {sortedMarkets.length} markets (raw feed mode)
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                /* Filtered Results */
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-syne text-2xl font-bold">
                      Filtered Markets
                    </h2>
                    
                    {/* View Mode Toggle */}
                    <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => navigate({ search: prev => ({ ...prev, viewMode: 'grid' }) })}
                        className={`p-2 rounded transition-colors ${
                          viewMode === 'grid'
                            ? 'bg-brand-green text-brand-bg'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => navigate({ search: prev => ({ ...prev, viewMode: 'list' }) })}
                        className={`p-2 rounded transition-colors ${
                          viewMode === 'list'
                            ? 'bg-brand-green text-brand-bg'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {displayedMarkets.length === 0 ? (
                    <div className="col-span-full">
                      <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-full mb-6">
                          <span className="text-4xl">🔍</span>
                        </div>
                        <h3 className="font-syne text-2xl font-bold mb-3">No markets found</h3>
                        <p className="text-gray-400 mb-6 max-w-md mx-auto">
                          Try adjusting your filters or search query to find more markets.
                        </p>
                        <button
                          onClick={handleClearAllFilters}
                          className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <MarketsGrid
                        markets={displayedMarkets}
                        viewMode={viewMode}
                        onMarketClick={handleMarketClick}
                      />
                      
                      {/* Load More */}
                      {displayedMarkets.length < sortedMarkets.length && (
                        <div className="col-span-full mt-8 text-center">
                          <button
                            onClick={handleLoadMore}
                            className="px-8 py-4 bg-transparent border-2 border-brand-green text-brand-green font-semibold rounded-xl hover:bg-brand-green hover:text-brand-bg transition-all hover:scale-105"
                          >
                            Load More Markets
                          </button>
                          <p className="font-mono text-sm text-gray-500 mt-4">
                            Showing {displayedMarkets.length} of {sortedMarkets.length} markets
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
