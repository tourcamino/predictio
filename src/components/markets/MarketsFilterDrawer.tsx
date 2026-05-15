import { useEffect, useMemo, useState } from 'react';
import { X, ChevronDown, ChevronUp, Filter, TrendingUp, Clock, Zap, Star } from 'lucide-react';
import { isFootballFocusEnabled } from '~/config/footballFocus';
import { useUserCountry } from '~/hooks/useUserCountry';
import { COUNTRY_FLAG, COUNTRY_LABEL, COUNTRY_OPTIONS } from '~/config/marketGeo';

type AccordionSection = 'sports' | 'status' | 'regions' | 'odds' | 'sorting' | 'featured';

interface MarketsFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
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

export function MarketsFilterDrawer(props: MarketsFilterDrawerProps) {
  const {
    open,
    onClose,
    onApply,
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
  } = props;

  const userCountry = useUserCountry();
  const [expanded, setExpanded] = useState<Set<AccordionSection>>(
    () => new Set(['regions', 'status', 'sorting']),
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toggle = (s: AccordionSection) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const sports = useMemo(() => {
    return [
      ...(isFootballFocusEnabled() ? [] : [{ id: 'all', name: 'All Sports', emoji: '🏆' }]),
      { id: 'football', name: 'Soccer', emoji: '⚽' },
      ...(isFootballFocusEnabled()
        ? []
        : [
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
  }, []);

  const statuses = [
    { id: 'all', name: 'All Status', icon: null as string | null },
    { id: 'live', name: 'Match live (trading locked)', icon: '🔴' },
    { id: 'ending-soon', name: 'Locks soon (pre-kickoff)', icon: '⏰' },
    { id: 'upcoming', name: 'Open for trading', icon: '✅' },
    { id: 'locked', name: 'Closed', icon: '🔒' },
  ];

  const regions = [
    { id: 'all', name: 'All Regions', emoji: '🌍' },
    { id: userCountry.countryCode, name: 'Your Nation', emoji: userCountry.flag },
    { id: 'elite', name: 'Top Leagues', emoji: '🌍' },
    ...COUNTRY_OPTIONS.map((cc) => ({
      id: cc,
      name: COUNTRY_LABEL[cc],
      emoji: COUNTRY_FLAG[cc],
    })),
  ];

  const oddsRanges = [
    { id: 'all', name: 'All Odds', min: undefined, max: undefined },
    { id: 'low', name: 'Low (0.0-0.3)', min: 0, max: 0.3 },
    { id: 'medium', name: 'Medium (0.3-0.7)', min: 0.3, max: 0.7 },
    { id: 'high', name: 'High (0.7-1.0)', min: 0.7, max: 1.0 },
  ];

  const sortOptions = [
    { id: 'featured', name: 'Featured', icon: Star },
    { id: 'trending', name: 'Trending', icon: TrendingUp },
    { id: 'volume', name: 'Volume', icon: TrendingUp },
    { id: 'closing-soon', name: 'Kickoff / lock soon', icon: Clock },
    { id: 'newest', name: 'Newest', icon: Zap },
    { id: 'most-popular', name: 'Most traders', icon: Star },
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
    if (range) onOddsRangeChange(range.min, range.max);
  };

  const hasActive =
    selectedSport !== (isFootballFocusEnabled() ? 'football' : 'all') ||
    selectedRegion !== 'all' ||
    selectedStatus !== 'all' ||
    minOdds !== undefined ||
    maxOdds !== undefined ||
    analystRecommended;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      <div
        className="absolute left-0 right-0 bottom-0 bg-brand-bg border-t border-white/10 rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ top: 'var(--top-stack-height)' }}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-green" />
            <span className="font-syne font-bold text-lg">Filters</span>
          </div>
          <div className="flex items-center gap-2">
            {hasActive && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-red-300 hover:text-red-200 font-semibold px-3 py-1.5 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Regions */}
          <div className="border-b border-white/10">
            <button
              type="button"
              onClick={() => toggle('regions')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <span className="font-semibold">Region / Country</span>
              {expanded.has('regions') ? (
                <ChevronUp className="w-4 h-4 text-brand-green" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expanded.has('regions') && (
              <div className="px-4 pb-4 space-y-1">
                {regions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onRegionChange(r.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                      selectedRegion === r.id
                        ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{r.emoji}</span>
                    <span className="text-sm">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="border-b border-white/10">
            <button
              type="button"
              onClick={() => toggle('status')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <span className="font-semibold">Status</span>
              {expanded.has('status') ? (
                <ChevronUp className="w-4 h-4 text-brand-green" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expanded.has('status') && (
              <div className="px-4 pb-4 space-y-1">
                {statuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onStatusChange(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                      selectedStatus === s.id
                        ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    }`}
                  >
                    {s.icon && <span className="text-lg">{s.icon}</span>}
                    <span className="text-sm">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sports */}
          <div className="border-b border-white/10">
            <button
              type="button"
              onClick={() => toggle('sports')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <span className="font-semibold">Sports</span>
              {expanded.has('sports') ? (
                <ChevronUp className="w-4 h-4 text-brand-green" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expanded.has('sports') && (
              <div className="px-4 pb-4 space-y-1">
                {sports.map((sp: any) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => onSportChange(sp.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                      selectedSport === sp.id
                        ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{sp.emoji}</span>
                    <span className="text-sm">{sp.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Odds */}
          <div className="border-b border-white/10">
            <button
              type="button"
              onClick={() => toggle('odds')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <span className="font-semibold">Odds Range</span>
              {expanded.has('odds') ? (
                <ChevronUp className="w-4 h-4 text-brand-green" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expanded.has('odds') && (
              <div className="px-4 pb-4 space-y-1">
                {oddsRanges.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleOddsChange(r.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                      getCurrentOddsId() === r.id
                        ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sorting */}
          <div className="border-b border-white/10">
            <button
              type="button"
              onClick={() => toggle('sorting')}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <span className="font-semibold">Sort By</span>
              {expanded.has('sorting') ? (
                <ChevronUp className="w-4 h-4 text-brand-green" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expanded.has('sorting') && (
              <div className="px-4 pb-4 space-y-1">
                {sortOptions.map((o) => {
                  const Icon = o.icon;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onSortChange(o.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                        sortBy === o.id
                          ? 'bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold shadow-lg'
                          : 'hover:bg-white/5 text-gray-300 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{o.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Featured */}
          <div className="p-4">
            <button
              type="button"
              onClick={() => onAnalystRecommendedChange(!analystRecommended)}
              className={`w-full px-4 py-3 rounded-xl border transition-colors text-left ${
                analystRecommended
                  ? 'bg-brand-green/15 border-brand-green/40 text-brand-green'
                  : 'bg-white/5 border-white/10 text-white/80 hover:border-brand-green/30'
              }`}
            >
              <div className="font-semibold">Analyst Recommended</div>
              <div className="text-xs text-white/60 mt-1">Show picks highlighted by analysts</div>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-white/[0.03] flex items-center gap-3">
          <button
            type="button"
            onClick={onApply}
            className="flex-1 h-11 bg-brand-green text-brand-bg font-bold rounded-xl hover:bg-brand-green/90 transition-colors"
          >
            Apply
          </button>
          {hasActive && (
            <button
              type="button"
              onClick={onClearAll}
              className="h-11 px-4 bg-white/5 border border-white/10 text-white/80 font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

