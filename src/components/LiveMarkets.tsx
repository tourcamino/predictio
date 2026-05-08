import { ArrowRight, TrendingUp, Activity, DollarSign, Users, Calendar, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { SEED_MARKETS } from '~/data/seedMarkets';
import { LiveMarketCard } from './markets/LiveMarketCard';
import { isFootballFocusEnabled } from '~/config/footballFocus';
import { seedMarketToLiveMarket } from '~/utils/seedMarketToLiveMarket';
import { fetchCuratedMarketsFromApi } from '~/utils/curatedMarketsApi';
import type { Market } from '~/data/mockMarkets';

/** Match curated cap (12) / football grid expectations — same pool as `/markets`. */
const HOME_MARKET_CARD_COUNT = 12;

export function LiveMarkets() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    isFootballFocusEnabled() ? 'football' : 'all'
  );
  const [sortBy, setSortBy] = useState<'volume' | 'trending' | 'ending-soon'>('trending');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '24h' | 'week'>('all');
  const marketsQuery = useQuery({
    queryKey: ["curatedMarkets", "home"],
    queryFn: fetchCuratedMarketsFromApi,
    staleTime: 50_000,
  });

  const baseSeeds = useMemo(() => {
    if (marketsQuery.isPending && !marketsQuery.data) {
      return [];
    }
    const rows = marketsQuery.data?.markets;
    if (rows && rows.length > 0) {
      return rows;
    }
    return SEED_MARKETS.filter((s) => s.sport === "football").slice(0, HOME_MARKET_CARD_COUNT);
  }, [marketsQuery.isPending, marketsQuery.data]);

  const allMarketsLive = useMemo(
    () => baseSeeds.map(seedMarketToLiveMarket),
    [baseSeeds],
  );

  // Same IDs as /markets — exclude featured seeds when flagged
  const allMarkets = useMemo(
    () => allMarketsLive.filter((m) => !m.isFeatured),
    [allMarketsLive],
  );
  
  // Filter by category (copy before sort to avoid mutating memoized arrays)
  let filteredMarkets =
    selectedCategory === "all"
      ? [...allMarkets]
      : allMarkets.filter((m) => m.sport === selectedCategory);
  
  // Filter by date
  if (dateFilter !== 'all') {
    const now = new Date();
    filteredMarkets = filteredMarkets.filter((m) => {
      const hoursUntilClose = (m.closesAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (dateFilter === 'today') {
        return hoursUntilClose <= 24;
      } else if (dateFilter === '24h') {
        return hoursUntilClose <= 24;
      } else if (dateFilter === 'week') {
        return hoursUntilClose <= 168; // 7 days
      }
      return true;
    });
  }
  
  // Sort by popularity/trending
  if (sortBy === 'trending') {
    filteredMarkets.sort((a, b) => {
      const scoreA = a.volume * a.traders;
      const scoreB = b.volume * b.traders;
      return scoreB - scoreA;
    });
  } else if (sortBy === 'volume') {
    filteredMarkets.sort((a, b) => b.volume - a.volume);
  } else if (sortBy === 'ending-soon') {
    filteredMarkets.sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
  }
  
  const displayedMarkets = filteredMarkets.slice(0, HOME_MARKET_CARD_COUNT);

  // Calculate stats
  const totalVolume = allMarkets.reduce((sum, m) => sum + m.volume, 0);
  const totalPredictions = allMarkets.reduce((sum, m) => sum + (m.predictions ?? 0), 0);
  const activeMarkets = allMarkets.length;

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  const categories = [
    { id: 'all', label: 'All Sports', emoji: '🎯' },
    { id: 'football', label: 'Football', emoji: '⚽' },
    { id: 'basketball', label: 'Basketball', emoji: '🏀' },
    { id: 'mma', label: 'MMA', emoji: '🥊' },
    { id: 'cricket', label: 'Cricket', emoji: '🏏' },
  ];

  const handleViewAllMarkets = () => {
    navigate({ to: '/markets' });
  };

  const handleMarketClick = (marketId: string) => {
    navigate({ to: '/markets/$marketId', params: { marketId } });
  };

  return (
    <section id="markets" className="py-20 lg:py-32 bg-gradient-to-b from-brand-navy to-brand-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-green/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-green/20 to-brand-cyan/20 border border-brand-green/40 rounded-full mb-6 animate-pulse-demo shadow-lg shadow-brand-green/20">
            <Activity className="w-4 h-4 text-brand-green" />
            <span className="text-sm font-bold text-brand-green">LIVE MARKETS</span>
            <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
          </div>
          
          <h2 className="font-syne font-bold text-4xl sm:text-5xl lg:text-6xl mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            {isFootballFocusEnabled() ? 'Live Matches You Can Trade Right Now' : 'Trade Live Sports Markets'}
          </h2>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            {isFootballFocusEnabled() 
              ? 'Odds move in real time as the match unfolds. Trade on Champions League, Serie A, and top European competitions.'
              : 'Real-time odds on every major sporting event. Trade your predictions and earn from your sports knowledge.'
            }
          </p>

          {/* Enhanced Stats Bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-12 mb-12">
            <div className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-brand-green/10 to-brand-green/5 border border-brand-green/20 rounded-xl hover:border-brand-green/40 transition-all">
              <div className="p-3 bg-brand-green/20 rounded-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5 text-brand-green" />
              </div>
              <div className="text-left">
                <div className="font-mono text-2xl font-bold text-brand-green">
                  {formatVolume(totalVolume)}
                </div>
                <div className="text-xs text-gray-400 font-medium">Trading Volume</div>
              </div>
            </div>

            <div className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-brand-cyan/10 to-brand-cyan/5 border border-brand-cyan/20 rounded-xl hover:border-brand-cyan/40 transition-all">
              <div className="p-3 bg-brand-cyan/20 rounded-lg group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5 text-brand-cyan" />
              </div>
              <div className="text-left">
                <div className="font-mono text-2xl font-bold text-brand-cyan">
                  {activeMarkets}+
                </div>
                <div className="text-xs text-gray-400 font-medium">Active Markets</div>
              </div>
            </div>

            <div className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl hover:border-purple-500/40 transition-all">
              <div className="p-3 bg-purple-500/20 rounded-lg group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <div className="font-mono text-2xl font-bold text-purple-400">
                  {(totalPredictions / 1000).toFixed(1)}K+
                </div>
                <div className="text-xs text-gray-400 font-medium">Predictions</div>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="max-w-4xl mx-auto mb-8">
            {/* Quick Filters Row */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              {/* Sort/Popularity Filter */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setSortBy('trending')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    sortBy === 'trending'
                      ? 'bg-brand-green text-brand-bg shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Trending</span>
                </button>
                <button
                  onClick={() => setSortBy('volume')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    sortBy === 'volume'
                      ? 'bg-brand-green text-brand-bg shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Volume</span>
                </button>
                <button
                  onClick={() => setSortBy('ending-soon')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    sortBy === 'ending-soon'
                      ? 'bg-brand-green text-brand-bg shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Ending Soon</span>
                </button>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    dateFilter === 'all'
                      ? 'bg-brand-cyan text-brand-bg shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>All Time</span>
                </button>
                <button
                  onClick={() => setDateFilter('24h')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    dateFilter === '24h'
                      ? 'bg-brand-cyan text-brand-bg shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  24 Hours
                </button>
                <button
                  onClick={() => setDateFilter('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    dateFilter === 'week'
                      ? 'bg-brand-cyan text-brand-bg shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  This Week
                </button>
              </div>
            </div>

            {/* Category Filter - Hidden in Football Focus mode */}
            {!isFootballFocusEnabled() && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      selectedCategory === category.id
                        ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg shadow-xl shadow-brand-green/30 scale-105'
                        : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-brand-green/30 hover:text-white hover:scale-105'
                    }`}
                  >
                    <span className="text-lg">{category.emoji}</span>
                    <span>{category.label}</span>
                    {selectedCategory === category.id && (
                      <span className="ml-1 px-2 py-0.5 bg-brand-bg/30 rounded-full text-xs font-bold">
                        {filteredMarkets.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Filters Indicator */}
          {(sortBy !== 'trending' || dateFilter !== 'all' || selectedCategory !== (isFootballFocusEnabled() ? 'football' : 'all')) && (
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-sm text-gray-400">Showing {displayedMarkets.length} filtered markets</span>
              <button
                onClick={() => {
                  setSortBy('trending');
                  setDateFilter('all');
                  setSelectedCategory(isFootballFocusEnabled() ? 'football' : 'all');
                }}
                className="text-sm text-brand-green hover:text-brand-cyan transition-colors font-semibold"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Markets Grid — Azuro-backed (aligned with /markets); skeleton on first load */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {marketsQuery.isPending && !marketsQuery.data
            ? Array.from({ length: HOME_MARKET_CARD_COUNT }).map((_, index) => (
                <div
                  key={`sk-${index}`}
                  className="h-[280px] rounded-xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))
            : displayedMarkets.map((market: Market, index: number) => (
                <div
                  key={market.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <LiveMarketCard market={market} onClick={() => handleMarketClick(market.id)} />
                </div>
              ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={handleViewAllMarkets}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold text-lg rounded-xl hover:shadow-2xl hover:shadow-brand-green/40 hover:scale-105 transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-cyan to-brand-green opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">Explore All {activeMarkets} Markets</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm text-gray-400 mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
              New markets added daily
            </span>
            <span>•</span>
            <span>Trade 24/7</span>
            <span>•</span>
            <span>Instant settlements</span>
          </p>
        </div>
      </div>
    </section>
  );
}
