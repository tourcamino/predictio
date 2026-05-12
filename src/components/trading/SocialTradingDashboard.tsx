import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import {
  Search,
  Filter,
  TrendingUp,
  Users,
  Target,
  Award,
  Copy,
  Eye,
  ArrowUpDown,
  Star,
} from 'lucide-react';
import { AnalystCard } from '~/components/affiliate/AnalystCard';
import { CopyingAnalystsSection } from './CopyingAnalystsSection';

interface SocialTradingDashboardProps {
  userWallet: string;
}

type SortOption = 'roi' | 'winRate' | 'followers' | 'earned';

export function SocialTradingDashboard({ userWallet }: SocialTradingDashboardProps) {
  const trpc = useTRPC();
  const [activeView, setActiveView] = useState<'discover' | 'following'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('roi');
  const [minWinRate, setMinWinRate] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch analyst leaderboard
  const leaderboardQuery = useQuery({
    ...trpc.getAnalystLeaderboard.queryOptions({
      limit: 50,
      sortBy,
      currentUserWallet: userWallet,
    }),
    enabled: activeView === 'discover',
  });

  // Fetch followed analysts
  const followedQuery = useQuery({
    ...trpc.getFollowedAnalysts.queryOptions({ userWallet }),
    enabled: !!userWallet,
  });

  const analysts = leaderboardQuery.data?.leaderboard || [];
  const followedAnalysts = followedQuery.data?.analysts || [];

  // Filter analysts
  const filteredAnalysts = analysts.filter((analyst) => {
    const sports = Array.isArray(analyst.sport) ? analyst.sport : [];
    const matchesSearch =
      searchQuery === '' ||
      analyst.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport =
      sportFilter === 'all' ||
      sports.some(
        (s) =>
          s === sportFilter ||
          s.toLowerCase() === sportFilter.toLowerCase(),
      );
    const matchesWinRate = analyst.winRate >= minWinRate;
    return matchesSearch && matchesSport && matchesWinRate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-syne font-bold text-2xl mb-2">Social Trading</h2>
          <p className="text-gray-400">
            Discover and copy top-performing traders
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setActiveView('discover')}
            className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
              activeView === 'discover'
                ? 'bg-brand-green text-brand-bg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Discover
          </button>
          <button
            onClick={() => setActiveView('following')}
            className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
              activeView === 'following'
                ? 'bg-brand-green text-brand-bg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Following ({followedAnalysts.length})
          </button>
        </div>
      </div>

      {/* Discover View */}
      {activeView === 'discover' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search traders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
              >
                <option value="roi">Sort by ROI</option>
                <option value="winRate">Sort by Win Rate</option>
                <option value="followers">Sort by Followers</option>
                <option value="earned">Sort by Earnings</option>
              </select>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  showFilters
                    ? 'bg-brand-green text-brand-bg'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sport Filter */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Sport</label>
                    <select
                      value={sportFilter}
                      onChange={(e) => setSportFilter(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
                    >
                      <option value="all">All Sports</option>
                      <option value="Football">⚽ Football</option>
                      <option value="MMA">🥊 MMA</option>
                      <option value="Cricket">🏏 Cricket</option>
                      <option value="Basketball">🏀 Basketball</option>
                      <option value="Tennis">🎾 Tennis</option>
                    </select>
                  </div>

                  {/* Min Win Rate */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Min Win Rate: {minWinRate}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={minWinRate}
                      onChange={(e) => setMinWinRate(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Traders</div>
              <div className="font-mono font-bold text-2xl">{analysts.length}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Avg ROI</div>
              <div className="font-mono font-bold text-2xl text-brand-green">
                +
                {analysts.length > 0
                  ? (analysts.reduce((sum, a) => sum + a.roi, 0) / analysts.length).toFixed(1)
                  : '0'}
                %
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Avg Win Rate</div>
              <div className="font-mono font-bold text-2xl text-brand-cyan">
                {analysts.length > 0
                  ? (analysts.reduce((sum, a) => sum + a.winRate, 0) / analysts.length).toFixed(1)
                  : '0'}
                %
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">You're Following</div>
              <div className="font-mono font-bold text-2xl">{followedAnalysts.length}</div>
            </div>
          </div>

          {/* Traders Grid */}
          {leaderboardQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading traders...</p>
            </div>
          ) : filteredAnalysts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Note: AnalystCard component already includes VerificationBadge display,
                  so verification status will automatically be shown in the traders grid */}
              {filteredAnalysts.map((analyst) => (
                <AnalystCard key={analyst.id} analyst={analyst} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-lg">
              <Target className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-4">No traders found</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSportFilter('all');
                  setMinWinRate(0);
                }}
                className="px-6 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Following View */}
      {activeView === 'following' && (
        <CopyingAnalystsSection userWallet={userWallet} />
      )}
    </div>
  );
}
