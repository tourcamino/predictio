import { TrendingUp, TrendingDown, Trophy, Target } from 'lucide-react';
import { formatCurrency } from '~/utils/marketUtils';

interface SportBreakdown {
  sport: string;
  volume: number;
  pnl: number;
  roi: number;
  winRate: number;
  totalPositions: number;
  resolvedPositions: number;
}

interface SportROIBreakdownProps {
  sportBreakdown: SportBreakdown[];
}

// Sport emoji mapping
const SPORT_EMOJIS: Record<string, string> = {
  'NFL': '🏈',
  'NBA': '🏀',
  'MLB': '⚾',
  'NHL': '🏒',
  'Soccer': '⚽',
  'MMA': '🥊',
  'Boxing': '🥊',
  'Tennis': '🎾',
  'Golf': '⛳',
  'F1': '🏎️',
  'Cricket': '🏏',
  'Rugby': '🏉',
};

export function SportROIBreakdown({ sportBreakdown }: SportROIBreakdownProps) {
  if (sportBreakdown.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="font-syne font-bold text-xl mb-4">Performance by Sport</h2>
        <div className="text-center py-8 text-gray-400">
          No data available yet
        </div>
      </div>
    );
  }

  // Find best and worst performing sports
  const bestSport = sportBreakdown[0];
  const worstSport = sportBreakdown[sportBreakdown.length - 1];
  if (bestSport === undefined || worstSport === undefined) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="font-syne font-bold text-xl mb-4">Performance by Sport</h2>
        <div className="text-center py-8 text-gray-400">
          No data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="font-syne font-bold text-xl mb-2">Performance by Sport</h2>
        <p className="text-sm text-gray-400">
          Analyze which sports and market categories you perform best in
        </p>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-brand-green" />
            <span className="text-sm text-gray-400">Best Performing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{SPORT_EMOJIS[bestSport.sport] || '🎯'}</span>
            <div>
              <div className="font-semibold">{bestSport.sport}</div>
              <div className="text-sm text-brand-green font-mono font-bold">
                +{bestSport.roi.toFixed(1)}% ROI
              </div>
            </div>
          </div>
        </div>

        {worstSport.roi < 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-red-500" />
              <span className="text-sm text-gray-400">Needs Improvement</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{SPORT_EMOJIS[worstSport.sport] || '🎯'}</span>
              <div>
                <div className="font-semibold">{worstSport.sport}</div>
                <div className="text-sm text-red-500 font-mono font-bold">
                  {worstSport.roi.toFixed(1)}% ROI
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sport Breakdown List */}
      <div className="space-y-3">
        {sportBreakdown.map((sport, index) => {
          const isPositive = sport.roi >= 0;
          const maxROI = Math.max(...sportBreakdown.map(s => Math.abs(s.roi)));
          const barWidth = maxROI > 0 ? (Math.abs(sport.roi) / maxROI) * 100 : 0;

          return (
            <div
              key={sport.sport}
              className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{SPORT_EMOJIS[sport.sport] || '🎯'}</span>
                  <div>
                    <div className="font-semibold">{sport.sport}</div>
                    <div className="text-xs text-gray-400">
                      {sport.totalPositions} position{sport.totalPositions !== 1 ? 's' : ''} · {formatCurrency(sport.volume)} volume
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 font-mono font-bold text-lg ${
                    isPositive ? 'text-brand-green' : 'text-red-500'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {isPositive ? '+' : ''}{sport.roi.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {sport.winRate.toFixed(0)}% win rate
                  </div>
                </div>
              </div>

              {/* ROI Bar */}
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                    isPositive ? 'bg-brand-green' : 'bg-red-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-white/10">
                <div>
                  <div className="text-xs text-gray-400">P&L</div>
                  <div className={`font-mono text-sm font-semibold ${
                    sport.pnl >= 0 ? 'text-brand-green' : 'text-red-500'
                  }`}>
                    {sport.pnl >= 0 ? '+' : ''}{formatCurrency(sport.pnl)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Resolved</div>
                  <div className="font-mono text-sm font-semibold">
                    {sport.resolvedPositions}/{sport.totalPositions}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Avg Stake</div>
                  <div className="font-mono text-sm font-semibold">
                    {formatCurrency(sport.volume / sport.totalPositions)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Strategy Tip */}
      {bestSport.roi > 10 && (
        <div className="mt-6 bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <div className="font-semibold text-brand-cyan mb-1">Strategy Tip</div>
              <div className="text-sm text-gray-300">
                You're performing exceptionally well in {bestSport.sport} with a {bestSport.roi.toFixed(1)}% ROI. 
                Consider focusing more of your portfolio on this sport to maximize returns.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
