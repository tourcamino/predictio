// @ts-nocheck — TanStack Router search-param updaters infer `never` until route tree types catch up.
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useEffect } from 'react';
import { z } from 'zod';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { Header } from '~/components/Header';
import { MarketsHero } from '~/components/markets/MarketsHero';
import { SportCategoriesRail } from '~/components/markets/SportCategoriesRail';
import { FilterChips } from '~/components/markets/FilterChips';
import { MarketSection } from '~/components/markets/MarketSection';
import { MarketsGrid } from '~/components/markets/MarketsGrid';
import { MarketsFilterSidebar } from '~/components/markets/MarketsFilterSidebar';
import { MarketCardSkeleton } from '~/components/markets/MarketCardSkeleton';
import { SeedMarket } from '~/data/seedMarkets';
import { SPORT_METADATA } from '~/data/mockMarkets';
import { MetaTags } from "~/components/MetaTags";
import { useMarketsUIStore } from '~/store/useMarketsUIStore';
import { isFootballFocusEnabled, getDefaultSport, isSportAllowed, FOOTBALL_FOCUS_CONFIG } from '~/config/footballFocus';
import { MAX_FOOTBALL_MARKETS } from '~/constants/azuro';

const marketSearchSchema = z.object({
  sport: fallback(z.string(), isFootballFocusEnabled() ? 'football' : 'all').default(isFootballFocusEnabled() ? 'football' : 'all'),
  competition: fallback(z.string(), 'all').default('all'),
  status: fallback(z.string(), 'all').default('all'),
  sortBy: fallback(z.enum(['trending', 'volume', 'liquidity', 'ending-soon', 'newest']), 'trending').default('trending'),
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
    
    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const searchableText = [
        market.question,
        market.event.name,
        market.competition,
        ...market.event.teams,
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
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
      return sorted.sort((a, b) => 
        new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
      );
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    default:
      return sorted;
  }
}

function MarketsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/markets' });
  const trpc = useTRPC();
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
  
  // Fetch markets from Azuro with 60-second refresh
  const marketsQuery = useQuery({
    ...trpc.getAzuroMarkets.queryOptions({
      sport: selectedSport,
      competition: selectedCompetition,
      status: selectedStatus,
    }),
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 50000, // Consider data stale after 50 seconds
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
  });
  
  const allMarkets = marketsQuery.data?.markets || [];

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
    () => filterMarkets(allMarkets, {
      sport: selectedSport,
      competition: selectedCompetition,
      status: selectedStatus,
      search: searchQuery,
      endsIn,
    }),
    [allMarkets, selectedSport, selectedCompetition, selectedStatus, searchQuery, endsIn]
  );
  
  // Sort markets
  const sortedMarkets = useMemo(
    () => sortMarkets(filteredMarkets, sortBy),
    [filteredMarkets, sortBy]
  );
  
  // Get curated sections (only show when no filters active)
  const hasActiveFilters = selectedSport !== (isFootballFocusEnabled() ? 'football' : 'all') || 
    selectedCompetition !== 'all' || 
    selectedStatus !== 'all' || 
    searchQuery !== '' || 
    endsIn !== 'all';
  
  const trendingMarkets = useMemo(() => 
    sortMarkets(allMarkets.filter(m => m.volume24h > 30000), 'trending').slice(0, 5),
    [allMarkets]
  );
  
  const liveMarkets = useMemo(() => 
    allMarkets.filter(m => m.status === 'live').slice(0, 5),
    [allMarkets]
  );
  
  const endingSoonMarkets = useMemo(() => {
    const now = new Date();
    return sortMarkets(
      allMarkets.filter(m => {
        const endsAt = new Date(m.endsAt);
        const hoursUntil = (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil > 0 && hoursUntil < 24 && m.status !== 'live';
      }),
      'ending-soon'
    ).slice(0, 5);
  }, [allMarkets]);
  
  const upcomingMarkets = useMemo(() => {
    const now = new Date();
    return sortMarkets(
      allMarkets.filter(m => {
        const endsAt = new Date(m.endsAt);
        const hoursUntil = (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil >= 24 && m.status === 'upcoming';
      }),
      'newest'
    ).slice(0, 5);
  }, [allMarkets]);
  
  // Paginated display
  const displayedMarkets = sortedMarkets.slice(0, displayCount);
  
  // Filter chips
  const filterChips = [];
  if (selectedSport !== 'all') {
    const sportMeta = SPORT_METADATA[selectedSport];
    filterChips.push({
      id: 'sport',
      label: `${sportMeta?.emoji || ''} ${sportMeta?.name || selectedSport}`,
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
  
  const handleClearAllFilters = () => {
    navigate({
      search: {
        sport: isFootballFocusEnabled() ? 'football' : 'all',
        competition: 'all',
        status: 'all',
        search: '',
        sortBy: 'trending',
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
          description="Browse all open prediction markets. Champions League, Serie A, NBA, MMA and more."
          url={typeof window !== 'undefined' ? window.location.href : undefined}
        />
        <Header />
        
        <div className="pt-16 lg:pt-20">
          {/* Compact Hero Section */}
          <div className="bg-gradient-to-b from-brand-navy via-brand-bg to-transparent py-12 px-4">
            <div className="max-w-5xl mx-auto text-center">
              <h1 className="font-syne font-bold text-4xl sm:text-5xl mb-4">
                Trade Football Markets
              </h1>
              <p className="text-lg text-gray-400 mb-6 max-w-2xl mx-auto">
                Predict outcomes. Trade before kickoff. Profit from your sports knowledge.
              </p>
              
              {/* Tag Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold">
                  ⚽ Champions League
                </span>
                <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold">
                  ⚽ Serie A
                </span>
                <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold">
                  🏀 NBA
                </span>
                <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold">
                  🥊 MMA
                </span>
              </div>
            </div>
          </div>
          
          <MarketsHero
            searchQuery={searchQuery}
            onSearchChange={(query) => navigate({ search: prev => ({ ...prev, search: query }) })}
          />
          
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Loading indicator */}
            <div className="mb-8 px-6 py-4 bg-brand-green/10 border border-brand-green/30 rounded-xl flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-green" />
              <span className="text-brand-green font-semibold">Loading markets from Azuro Protocol...</span>
            </div>

            {/* Skeleton Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRPC / network failure after retries exhausted (never got a successful response)
  if (marketsQuery.isError && !marketsQuery.isSuccess) {
    const msg =
      marketsQuery.error instanceof Error
        ? marketsQuery.error.message
        : "Unable to load markets.";
    return (
      <div className="min-h-screen bg-brand-bg">
        <MetaTags
          title="Sports Markets — Predictio.live"
          description="Browse all open prediction markets. Champions League, Serie A, NBA, MMA and more."
          url={typeof window !== "undefined" ? window.location.href : undefined}
        />
        <Header />
        <div className="pt-24 lg:pt-28 px-4 max-w-lg mx-auto text-center">
          <p className="text-red-400 font-semibold mb-2">Could not load markets</p>
          <p className="text-gray-400 text-sm mb-6">{msg}</p>
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
        description="Browse all open prediction markets. Champions League, Serie A, NBA, MMA and more."
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />
      <Header />
      
      <div className="pt-16 lg:pt-20">
        {/* Compact Hero Section */}
        <div className="bg-gradient-to-b from-brand-navy via-brand-bg to-transparent py-12 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-syne font-bold text-4xl sm:text-5xl mb-4">
              Trade Football Markets
            </h1>
            <p className="text-lg text-gray-400 mb-6 max-w-2xl mx-auto">
              Predict outcomes. Trade before kickoff. Profit from your sports knowledge.
            </p>
            
            {/* Tag Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold">
                ⚽ Champions League
              </span>
              <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold">
                ⚽ Serie A
              </span>
              <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold">
                🏀 NBA
              </span>
              <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold">
                🥊 MMA
              </span>
            </div>
          </div>
        </div>
        
        {/* Hero Section */}
        <MarketsHero
          searchQuery={searchQuery}
          onSearchChange={(query) => navigate({ search: prev => ({ ...prev, search: query }) })}
        />
        
        {/* Football Focus Header */}
        {isFootballFocusEnabled() && (
          <div className="bg-gradient-to-r from-brand-green/10 to-brand-cyan/10 border-b border-brand-green/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-syne text-2xl font-bold text-brand-green mb-1">
                    ⚽ Football Markets
                  </h2>
                  <p className="text-sm text-gray-400">
                    Champions League • Serie A • Top European Competitions
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand-green">
                    {allMarkets.length}
                  </div>
                  <div className="text-xs text-gray-500">Live Markets</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Sport Categories Rail - Hidden in Football Focus mode since there's only one sport */}
        {!isFootballFocusEnabled() && (
          <SportCategoriesRail
            categories={sportCategories}
            selectedSport={selectedSport}
            onSelectSport={(sport) => navigate({ search: prev => ({ ...prev, sport, competition: 'all' }) })}
          />
        )}
        
        {/* Main Content Area with Sidebar */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Azuro Status Indicator */}
          {['azuro', 'mixed', 'fallback'].includes(marketsQuery.data?.source ?? '') && (
            <div className="mb-6 px-4 py-3 bg-brand-green/10 border border-brand-green/30 rounded-lg flex items-center gap-3">
              <span className="text-brand-green text-xl">✓</span>
              <div className="flex-1">
                <span className="text-brand-green font-semibold">
                  {marketsQuery.data?.source === 'mixed'
                    ? 'Predictio DB markets + Azuro Protocol'
                    : marketsQuery.data?.source === 'fallback'
                      ? 'Demo markets (live feed empty for current filters)'
                      : 'Live data from Azuro Protocol'}
                </span>
                <span className="text-gray-400 text-sm ml-2">· Updates every 60 seconds</span>
              </div>
            </div>
          )}

          {/* Search Bar - Above the grid */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search events, teams, athletes..."
                value={searchQuery}
                onChange={(e) => navigate({ search: prev => ({ ...prev, search: e.target.value }) })}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                🔍
              </div>
            </div>
          </div>

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
                  onRegionChange={(region) => navigate({ search: prev => ({ ...prev, region }) })}
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
                  {/* Feed Structure */}
                  {trendingMarkets.length > 0 && (
                    <MarketSection
                      title="Trending Now"
                      subtitle="Most traded matches right now"
                      icon="🔥"
                      markets={trendingMarkets}
                      onMarketClick={handleMarketClick}
                    />
                  )}
                  
                  {liveMarkets.length > 0 && (
                    <MarketSection
                      title="Live Now"
                      subtitle="Trade while the match is live"
                      icon="🔴"
                      markets={liveMarkets}
                      onMarketClick={handleMarketClick}
                    />
                  )}
                  
                  {endingSoonMarkets.length > 0 && (
                    <MarketSection
                      title="Ending Soon"
                      subtitle="Last chance to trade"
                      icon="⏰"
                      markets={endingSoonMarkets}
                      onMarketClick={handleMarketClick}
                    />
                  )}
                  
                  {upcomingMarkets.length > 0 && (
                    <MarketSection
                      title="Upcoming Matches"
                      subtitle=""
                      icon="⚽"
                      markets={upcomingMarkets}
                      onMarketClick={handleMarketClick}
                    />
                  )}
                  
                  {/* All Markets — grid shows up to MAX_FOOTBALL_MARKETS (Azuro football cap) */}
                  <div className="mt-12">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="font-syne text-2xl sm:text-3xl font-bold mb-1">
                          All Markets
                        </h2>
                        <p className="text-sm text-gray-400">
                          Browse all available {isFootballFocusEnabled() ? 'football' : 'sports'} markets
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
                          <h3 className="font-syne text-2xl font-bold mb-3">No markets available</h3>
                          <p className="text-gray-400 mb-6 max-w-md mx-auto">
                            Check back soon for new {isFootballFocusEnabled() ? 'football' : 'sports'} markets.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <MarketsGrid
                          markets={displayedMarkets.slice(0, MAX_FOOTBALL_MARKETS)}
                          viewMode={viewMode}
                          onMarketClick={handleMarketClick}
                        />
                        
                        {/* Load More */}
                        {displayedMarkets.length > MAX_FOOTBALL_MARKETS && sortedMarkets.length > MAX_FOOTBALL_MARKETS && (
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
    </div>
  );
}
