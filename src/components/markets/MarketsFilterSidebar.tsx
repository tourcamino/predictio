import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, TrendingUp, Clock, Zap, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { SPORT_METADATA } from '~/data/mockMarkets';
import { useMarketsUIStore } from '~/store/useMarketsUIStore';
import { isFootballFocusEnabled, isSportAllowed } from '~/config/footballFocus';

interface MarketsFilterSidebarProps {
  selectedSport: string;
  selectedRegion: string;
  selectedStatus: string;
  sortBy: string;
  minOdds?: number;
  maxOdds?: number;
  analystRecommended?: boolean;
  onSportChange: (sport: string) => void;
  onRegionChange: (region: string) => void;
  onStatusChange: (status: string) => void;
  onSortChange: (sort: string) => void;
  onOddsRangeChange: (minOdds?: number, maxOdds?: number) => void;
  onAnalystRecommendedChange: (recommended?: boolean) => void;
  onClearAll: () => void;
}

type AccordionSection = 'sports' | 'status' | 'regions' | 'odds' | 'sorting' | 'featured';

export function MarketsFilterSidebar({
  selectedSport,
  selectedRegion,
  selectedStatus,
  sortBy,
  minOdds,
  maxOdds,
  analystRecommended,
  onSportChange,
  onRegionChange,
  onStatusChange,
  onSortChange,
  onOddsRangeChange,
  onAnalystRecommendedChange,
  onClearAll,
}: MarketsFilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<AccordionSection>>(
    new Set(['sports', 'status', 'sorting'])
  );
  const { isSidebarCollapsed, toggleSidebar } = useMarketsUIStore();

  const toggleSection = (section: AccordionSection) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const sports = [
    ...(isFootballFocusEnabled() ? [] : [{ id: 'all', name: 'All Sports', emoji: '🏆' }]),
    { id: 'football', name: 'Football', emoji: '⚽' },
    ...(isFootballFocusEnabled() ? [] : [
      { id: 'basketball', name: 'Basketball', emoji: '🏀' },
      { id: 'tennis', name: 'Tennis', emoji: '🎾' },
      { id: 'mma', name: 'MMA', emoji: '🥊' },
      { id: 'american-football', name: 'American Football', emoji: '🏈' },
      { id: 'hockey', name: 'Hockey', emoji: '🏒' },
      { id: 'baseball', name: 'Baseball', emoji: '⚾' },
      { id: 'cricket', name: 'Cricket', emoji: '🏏' },
      { id: 'esports', name: 'Esports', emoji: '🎮' },
    ]),
  ];

  const statuses = [
    { id: 'all', name: 'All Status', icon: null },
    { id: 'live', name: 'Live', icon: '🔴' },
    { id: 'ending-soon', name: 'Closing Soon', icon: '⏰' },
    { id: 'upcoming', name: 'Active', icon: '✅' },
    { id: 'locked', name: 'Closed', icon: '🔒' },
  ];

  const regions = [
    { id: 'all', name: 'All Regions', emoji: '🌍' },
    { id: 'Europe', name: 'Europe', emoji: '🇪🇺' },
    { id: 'Americas', name: 'Americas', emoji: '🌎' },
    { id: 'Asia-Pacific', name: 'Asia-Pacific', emoji: '🌏' },
    { id: 'Africa', name: 'Africa', emoji: '🌍' },
    { id: 'Middle East', name: 'Middle East', emoji: '🏜️' },
  ];

  const oddsRanges = [
    { id: 'all', name: 'All Odds', min: undefined, max: undefined },
    { id: 'low', name: 'Low (0.0-0.3)', min: 0, max: 0.3 },
    { id: 'medium', name: 'Medium (0.3-0.7)', min: 0.3, max: 0.7 },
    { id: 'high', name: 'High (0.7-1.0)', min: 0.7, max: 1.0 },
  ];

  const sortOptions = [
    { id: 'volume', name: 'Volume', icon: TrendingUp },
    { id: 'closing-soon', name: 'Closing Soon', icon: Clock },
    { id: 'newest', name: 'Newest', icon: Zap },
    { id: 'most-predicted', name: 'Most Predicted', icon: TrendingUp },
    { id: 'most-popular', name: 'Most Popular', icon: Star },
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

  const hasActiveFilters = 
    selectedSport !== 'all' || 
    selectedRegion !== 'all' || 
    selectedStatus !== 'all' || 
    minOdds !== undefined || 
    maxOdds !== undefined ||
    analystRecommended;

  // If collapsed, show only the toggle button
  if (isSidebarCollapsed) {
    return (
      <div className="sticky top-24">
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl hover:border-brand-green/50 hover:shadow-lg hover:shadow-brand-green/10 transition-all group backdrop-blur-sm"
          title="Show filters"
        >
          <ChevronRight className="w-5 h-5 text-brand-green group-hover:translate-x-0.5 transition-transform" />
          <Filter className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-brand-green" />
          <h3 className="font-syne font-bold text-lg">Filters</h3>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold px-3 py-1.5 bg-red-500/10 rounded-lg hover:bg-red-500/20"
            >
              Clear All
            </button>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
            title="Hide filters"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-brand-green group-hover:-translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
        {/* Sports Section */}
        <div className="border-b border-white/10">
          <button
            onClick={() => toggleSection('sports')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
          >
            <span className="font-semibold group-hover:text-brand-green transition-colors">Sports</span>
            {expandedSections.has('sports') ? (
              <ChevronUp className="w-4 h-4 text-brand-green" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" />
            )}
          </button>
          {expandedSections.has('sports') && (
            <div className="px-4 pb-4 space-y-1">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => onSportChange(sport.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                    selectedSport === sport.id
                      ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{sport.emoji}</span>
                  <span className="text-sm">{sport.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="border-b border-white/10">
          <button
            onClick={() => toggleSection('status')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
          >
            <span className="font-semibold group-hover:text-brand-green transition-colors">Status</span>
            {expandedSections.has('status') ? (
              <ChevronUp className="w-4 h-4 text-brand-green" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" />
            )}
          </button>
          {expandedSections.has('status') && (
            <div className="px-4 pb-4 space-y-1">
              {statuses.map((status) => (
                <button
                  key={status.id}
                  onClick={() => onStatusChange(status.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                    selectedStatus === status.id
                      ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  {status.icon && <span className="text-lg">{status.icon}</span>}
                  <span className="text-sm">{status.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Regions Section */}
        <div className="border-b border-white/10">
          <button
            onClick={() => toggleSection('regions')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
          >
            <span className="font-semibold group-hover:text-brand-green transition-colors">Regions</span>
            {expandedSections.has('regions') ? (
              <ChevronUp className="w-4 h-4 text-brand-green" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" />
            )}
          </button>
          {expandedSections.has('regions') && (
            <div className="px-4 pb-4 space-y-1">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => onRegionChange(region.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                    selectedRegion === region.id
                      ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{region.emoji}</span>
                  <span className="text-sm">{region.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Odds Range Section */}
        <div className="border-b border-white/10">
          <button
            onClick={() => toggleSection('odds')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
          >
            <span className="font-semibold group-hover:text-brand-green transition-colors">Odds Range</span>
            {expandedSections.has('odds') ? (
              <ChevronUp className="w-4 h-4 text-brand-green" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" />
            )}
          </button>
          {expandedSections.has('odds') && (
            <div className="px-4 pb-4 space-y-1">
              {oddsRanges.map((range) => (
                <button
                  key={range.id}
                  onClick={() => handleOddsChange(range.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                    getCurrentOddsId() === range.id
                      ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{range.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sorting Section */}
        <div className="border-b border-white/10">
          <button
            onClick={() => toggleSection('sorting')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
          >
            <span className="font-semibold group-hover:text-brand-green transition-colors">Sort By</span>
            {expandedSections.has('sorting') ? (
              <ChevronUp className="w-4 h-4 text-brand-green" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" />
            )}
          </button>
          {expandedSections.has('sorting') && (
            <div className="px-4 pb-4 space-y-1">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => onSortChange(option.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                      sortBy === option.id
                        ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{option.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Featured Section */}
        <div>
          <button
            onClick={() => toggleSection('featured')}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
          >
            <span className="font-semibold group-hover:text-brand-green transition-colors">Featured</span>
            {expandedSections.has('featured') ? (
              <ChevronUp className="w-4 h-4 text-brand-green" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-brand-green transition-colors" />
            )}
          </button>
          {expandedSections.has('featured') && (
            <div className="px-4 pb-4">
              <button
                onClick={() => onAnalystRecommendedChange(analystRecommended ? undefined : true)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                  analystRecommended
                    ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                    : 'hover:bg-white/5 text-gray-300 hover:text-white'
                }`}
              >
                <Star className={`w-4 h-4 ${analystRecommended ? 'fill-current' : ''}`} />
                <span className="text-sm">Analyst Picks</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
