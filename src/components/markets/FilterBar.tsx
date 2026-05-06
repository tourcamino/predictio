import { Search, Grid, List, X, ChevronDown, Calendar, Star } from 'lucide-react';
import { SPORT_METADATA } from '~/data/mockMarkets';
import { isFootballFocusEnabled, isSportAllowed } from '~/config/footballFocus';

interface FilterBarProps {
  selectedSport: string;
  selectedRegion: string;
  sortBy: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  selectedStatus: string;
  minVolume?: number;
  maxVolume?: number;
  startDate?: string;
  endDate?: string;
  minOdds?: number;
  maxOdds?: number;
  analystRecommended?: boolean;
  onSportChange: (sport: string) => void;
  onRegionChange: (region: string) => void;
  onSortChange: (sort: string) => void;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onStatusChange: (status: string) => void;
  onVolumeChange: (minVolume?: number, maxVolume?: number) => void;
  onDateRangeChange: (startDate?: string, endDate?: string) => void;
  onOddsRangeChange: (minOdds?: number, maxOdds?: number) => void;
  onAnalystRecommendedChange: (recommended?: boolean) => void;
}

export function FilterBar({
  selectedSport,
  selectedRegion,
  sortBy,
  searchQuery,
  viewMode,
  selectedStatus,
  minVolume,
  maxVolume,
  startDate,
  endDate,
  minOdds,
  maxOdds,
  analystRecommended,
  onSportChange,
  onRegionChange,
  onSortChange,
  onSearchChange,
  onViewModeChange,
  onStatusChange,
  onVolumeChange,
  onDateRangeChange,
  onOddsRangeChange,
  onAnalystRecommendedChange,
}: FilterBarProps) {
  const sports = [
    { id: 'all', name: 'All', emoji: '' },
    { id: 'football', name: 'Football', emoji: '⚽' },
    { id: 'basketball', name: 'Basketball', emoji: '🏀' },
    { id: 'tennis', name: 'Tennis', emoji: '🎾' },
    { id: 'mma', name: 'MMA', emoji: '🥊' },
    { id: 'cricket', name: 'Cricket', emoji: '🏏' },
    { id: 'baseball', name: 'Baseball', emoji: '⚾' },
    { id: 'rugby', name: 'Rugby', emoji: '🏉' },
    { id: 'hockey', name: 'Hockey', emoji: '🏒' },
    { id: 'f1', name: 'F1', emoji: '🏎️' },
    { id: 'esports', name: 'Esports', emoji: '🎮' },
  ].filter(sport => !isFootballFocusEnabled() || isSportAllowed(sport.id));

  const regions = [
    { id: 'all', name: 'All Regions', emoji: '🌍' },
    { id: 'Europe', name: 'Europe', emoji: '🇪🇺' },
    { id: 'Americas', name: 'Americas', emoji: '🌎' },
    { id: 'Asia-Pacific', name: 'Asia-Pacific', emoji: '🌏' },
    { id: 'Africa', name: 'Africa', emoji: '🌍' },
    { id: 'Middle East', name: 'Middle East', emoji: '🌍' },
  ];

  const sortOptions = [
    { id: 'volume', name: 'Volume ↓' },
    { id: 'closing-soon', name: 'Closing Soon' },
    { id: 'newest', name: 'Newest' },
    { id: 'most-predicted', name: 'Most Predicted' },
    { id: 'most-popular', name: 'Most Popular' },
  ];

  const statusOptions = [
    { id: 'all', name: 'All Status' },
    { id: 'active', name: 'Active' },
    { id: 'closing-soon', name: 'Closing Soon' },
    { id: 'closed', name: 'Closed' },
  ];

  const volumeRanges = [
    { id: 'all', name: 'All Volume', min: undefined, max: undefined },
    { id: 'low', name: '< $50K', min: 0, max: 50000 },
    { id: 'medium', name: '$50K - $100K', min: 50000, max: 100000 },
    { id: 'high', name: '> $100K', min: 100000, max: undefined },
  ];

  const getCurrentVolumeId = () => {
    if (!minVolume && !maxVolume) return 'all';
    if (maxVolume === 50000) return 'low';
    if (minVolume === 50000 && maxVolume === 100000) return 'medium';
    if (minVolume === 100000) return 'high';
    return 'all';
  };

  const handleVolumeChange = (rangeId: string) => {
    const range = volumeRanges.find((r) => r.id === rangeId);
    if (range) {
      onVolumeChange(range.min, range.max);
    }
  };

  const oddsRanges = [
    { id: 'all', name: 'All Odds', min: undefined, max: undefined },
    { id: 'low', name: 'Low Odds (0.0-0.3)', min: 0, max: 0.3 },
    { id: 'medium', name: 'Medium Odds (0.3-0.7)', min: 0.3, max: 0.7 },
    { id: 'high', name: 'High Odds (0.7-1.0)', min: 0.7, max: 1.0 },
  ];

  const getCurrentOddsId = () => {
    if (!minOdds && !maxOdds) return 'all';
    if (minOdds === 0 && maxOdds === 0.3) return 'low';
    if (minOdds === 0.3 && maxOdds === 0.7) return 'medium';
    if (minOdds === 0.7 && maxOdds === 1.0) return 'high';
    return 'all';
  };

  const handleOddsChange = (rangeId: string) => {
    const range = oddsRanges.find((r) => r.id === rangeId);
    if (range) {
      onOddsRangeChange(range.min, range.max);
    }
  };

  return (
    <div className="sticky top-16 lg:top-20 z-40 bg-brand-bg/95 backdrop-blur-xl border-b border-white/10 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search events, teams, athletes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-colors"
          />
        </div>

        {/* Filters Section - Three Rows */}
        <div className="space-y-3">
          {/* Row 1: Sport Pills */}
          <div className="overflow-x-auto scrollbar-hide scroll-smooth">
            <div className="flex gap-2 min-w-max pb-1 touch-pan-x">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => onSportChange(sport.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedSport === sport.id
                      ? 'bg-brand-green text-brand-bg'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {sport.emoji && <span>{sport.emoji}</span>}
                  <span>{sport.name}</span>
                  {selectedSport === sport.id && sport.id !== 'all' && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Control Dropdowns and View Toggle */}
          <div className="flex gap-2 flex-wrap items-center">
            {/* Status Dropdown */}
            <div className="relative flex-1 min-w-[140px] max-w-[180px]">
              <select
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green cursor-pointer transition-colors"
              >
                {statusOptions.map((status) => (
                  <option key={status.id} value={status.id} className="bg-brand-navy">
                    {status.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Volume Dropdown */}
            <div className="relative flex-1 min-w-[140px] max-w-[180px]">
              <select
                value={getCurrentVolumeId()}
                onChange={(e) => handleVolumeChange(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green cursor-pointer transition-colors"
              >
                {volumeRanges.map((range) => (
                  <option key={range.id} value={range.id} className="bg-brand-navy">
                    {range.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Region Dropdown */}
            <div className="relative flex-1 min-w-[140px] max-w-[180px]">
              <select
                value={selectedRegion}
                onChange={(e) => onRegionChange(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green cursor-pointer transition-colors"
              >
                {regions.map((region) => (
                  <option key={region.id} value={region.id} className="bg-brand-navy">
                    {region.emoji} {region.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-1 min-w-[140px] max-w-[180px]">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green cursor-pointer transition-colors"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id} className="bg-brand-navy">
                    {option.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1 ml-auto">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-brand-green text-brand-bg'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                aria-label="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-brand-green text-brand-bg'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 3: Advanced Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            {/* Date Range Filter */}
            <div className="relative flex gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={startDate || ''}
                  onChange={(e) => onDateRangeChange(e.target.value || undefined, endDate)}
                  max={endDate || new Date().toISOString().split('T')[0]}
                  placeholder="Start Date"
                  className="appearance-none pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green cursor-pointer transition-colors"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              <span className="text-gray-500 self-center">to</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => onDateRangeChange(startDate, e.target.value || undefined)}
                  min={startDate}
                  max={new Date().toISOString().split('T')[0]}
                  placeholder="End Date"
                  className="appearance-none pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green cursor-pointer transition-colors"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => onDateRangeChange(undefined, undefined)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Clear date range"
                  aria-label="Clear date range"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Odds Range Dropdown */}
            <div className="relative flex-1 min-w-[180px] max-w-[220px]">
              <select
                value={getCurrentOddsId()}
                onChange={(e) => handleOddsChange(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green cursor-pointer transition-colors"
              >
                {oddsRanges.map((range) => (
                  <option key={range.id} value={range.id} className="bg-brand-navy">
                    {range.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Analyst Recommended Toggle */}
            <button
              onClick={() => onAnalystRecommendedChange(analystRecommended ? undefined : true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                analystRecommended
                  ? 'bg-brand-green text-brand-bg'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <Star className={`w-4 h-4 ${analystRecommended ? 'fill-current' : ''}`} />
              <span>Analyst Picks</span>
            </button>

            {/* Clear All Filters Button */}
            {(selectedSport !== 'all' || 
              selectedRegion !== 'all' || 
              selectedStatus !== 'all' || 
              searchQuery !== '' ||
              (minVolume !== undefined && minVolume > 0) ||
              maxVolume !== undefined ||
              startDate ||
              endDate ||
              minOdds !== undefined ||
              maxOdds !== undefined ||
              analystRecommended) && (
              <button
                onClick={() => {
                  onSportChange('all');
                  onRegionChange('all');
                  onStatusChange('all');
                  onSearchChange('');
                  onVolumeChange(0, undefined);
                  onDateRangeChange(undefined, undefined);
                  onOddsRangeChange(undefined, undefined);
                  onAnalystRecommendedChange(undefined);
                }}
                className="ml-auto px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
