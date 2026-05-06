import { SPORT_METADATA } from '~/data/mockMarkets';
import { formatCurrency } from '~/utils/marketUtils';
import { MiniSparkline } from './MiniSparkline';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface SportCategory {
  id: string;
  name: string;
  emoji: string;
  marketCount: number;
  volume24h: number;
}

interface SportCategoriesRailProps {
  categories: SportCategory[];
  selectedSport: string;
  onSelectSport: (sportId: string) => void;
}

/**
 * SportCategoriesRail Component
 * 
 * Displays a horizontal scrollable rail of sport categories with stats.
 * 
 * NOTE: This component is hidden when FOOTBALL_FOCUS mode is enabled in
 * src/config/footballFocus.ts. See src/routes/markets/index.tsx for the
 * conditional rendering logic.
 * 
 * To restore multi-sport view, set FOOTBALL_FOCUS_CONFIG.ENABLED to false.
 */
export function SportCategoriesRail({
  categories,
  selectedSport,
  onSelectSport,
}: SportCategoriesRailProps) {
  return (
    <div className="bg-brand-bg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Browse by Sport
        </h2>
        
        {/* Horizontal Scroll Container */}
        <div className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4">
          <div className="flex gap-3 min-w-max pb-2 touch-pan-x">
            {categories.map((category) => {
              // Calculate trend indicator (mock data - in production would be real)
              const trendPercent = category.id === 'all' ? 0 : (Math.random() * 20 - 5);
              const isPositive = trendPercent >= 0;
              
              return (
                <button
                  key={category.id}
                  onClick={() => onSelectSport(category.id)}
                  className={`group flex-shrink-0 w-56 p-4 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                    selectedSport === category.id
                      ? 'border-brand-green bg-gradient-to-br from-brand-green/20 to-brand-green/5 shadow-lg shadow-brand-green/20'
                      : 'border-white/10 bg-gradient-to-br from-white/5 to-transparent hover:border-brand-green/50 hover:shadow-md'
                  }`}
                >
                  {/* Header: Icon, Name & Trend */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.emoji}</span>
                      <div className="text-left">
                        <div className={`font-bold text-sm ${selectedSport === category.id ? 'text-brand-green' : 'text-white'}`}>
                          {category.name}
                        </div>
                      </div>
                    </div>
                    {category.id !== 'all' && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        isPositive 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trendPercent).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  
                  {/* Sparkline - Volume Trend */}
                  {category.id !== 'all' && (
                    <div className="mb-3 h-8">
                      <MiniSparkline
                        percentA={50 + trendPercent}
                        className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity"
                        color={selectedSport === category.id ? "#00FF87" : "#4B5563"}
                      />
                    </div>
                  )}
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Markets</div>
                      <div className={`font-mono font-bold text-sm ${selectedSport === category.id ? 'text-brand-green' : 'text-white'}`}>
                        {category.marketCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Volume</div>
                      <div className={`font-mono font-bold text-sm ${selectedSport === category.id ? 'text-brand-green' : 'text-white'}`}>
                        {formatCurrency(category.volume24h, true)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Activity Indicator */}
                  {category.id !== 'all' && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                      <Activity className={`w-3 h-3 ${selectedSport === category.id ? 'text-brand-green' : 'text-gray-500'}`} />
                      <span className="text-xs text-gray-500">
                        {Math.floor(Math.random() * 50 + 10)} active traders
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
