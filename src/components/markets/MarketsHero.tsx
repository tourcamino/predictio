import { Search } from 'lucide-react';
import { isFootballFocusEnabled, FOOTBALL_FOCUS_CONFIG } from '~/config/footballFocus';

interface MarketsHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchFocus?: () => void;
}

export function MarketsHero({ searchQuery, onSearchChange, onSearchFocus }: MarketsHeroProps) {
  const isFootballFocus = isFootballFocusEnabled();
  
  return (
    <div className="relative bg-gradient-to-b from-brand-navy via-brand-bg to-transparent py-12 sm:py-16 px-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-green/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Headline */}
        <div className="mb-4 sm:mb-6">
          <h1 className="font-syne font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4 leading-tight">
            {isFootballFocus ? (
              <>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-brand-cyan">
                  Trade Football Markets
                </span>
              </>
            ) : (
              <>
                Predict outcomes.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-brand-cyan">
                  Trade sports events.
                </span>
              </>
            )}
          </h1>
        </div>
        
        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 sm:mb-8 max-w-3xl mx-auto font-medium">
          {isFootballFocus ? (
            <>
              Predict outcomes. Trade live matches. Profit from your football knowledge.
            </>
          ) : (
            <>
              Real markets, real liquidity, real-time pricing powered by{' '}
              <span className="text-brand-green font-semibold">Azuro Protocol</span>
            </>
          )}
        </p>
        
        {/* Search Bar - Less dominant */}
        <div className="relative max-w-2xl mx-auto mb-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-green transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={onSearchFocus}
              placeholder={isFootballFocus ? "Search matches or teams…" : "Search markets, teams, events..."}
              className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all backdrop-blur-sm"
            />
          </div>
        </div>
        
        {/* Popular Searches / Supporting Line */}
        {isFootballFocus ? (
          <div className="text-sm text-gray-400">
            <span className="text-brand-green font-semibold">⚽</span> {FOOTBALL_FOCUS_CONFIG.HERO.supportingLine}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm">
            <span className="text-gray-500 font-semibold">Trending:</span>
            <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-brand-green hover:border-brand-green/50 transition-all hover:scale-105">
              ⚽ Serie A
            </button>
            <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-brand-green hover:border-brand-green/50 transition-all hover:scale-105">
              🏀 NBA Finals
            </button>
            <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-brand-green hover:border-brand-green/50 transition-all hover:scale-105">
              ⚽ Champions League
            </button>
            <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-brand-green hover:border-brand-green/50 transition-all hover:scale-105">
              🥊 UFC
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
