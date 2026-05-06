import { TrendingUp, TrendingDown, Trophy, Target, BarChart3 } from 'lucide-react';
import { formatCurrency } from '~/utils/marketUtils';

interface MarketTypeBreakdown {
  marketType: string;
  volume: number;
  pnl: number;
  roi: number;
  winRate: number;
  totalPositions: number;
  resolvedPositions: number;
}

interface MarketTypeROIBreakdownProps {
  marketTypeBreakdown: MarketTypeBreakdown[];
}

// Market type emoji and label mapping
const MARKET_TYPE_INFO: Record<string, { emoji: string; label: string; description: string }> = {
  'moneyline': {
    emoji: '🎯',
    label: 'Moneyline',
    description: 'Straight win/loss predictions',
  },
  'spread': {
    emoji: '📊',
    label: 'Spread',
    description: 'Point spread bets',
  },
  'over/under': {
    emoji: '⚖️',
    label: 'Over/Under',
    description: 'Total points/goals betting',
  },
  'props': {
    emoji: '🎲',
    label: 'Props',
    description: 'Player & game props',
  },
};

export function MarketTypeROIBreakdown({ marketTypeBreakdown }: MarketTypeROIBreakdownProps) {
  if (marketTypeBreakdown.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <h2 className="font-syne font-bold text-xl mb-4">Performance by Market Type</h2>
        <div className="text-center py-8 text-gray-400">
          No data available yet
        </div>
      </div>
    );
  }

  // Find best and worst performing market types
  const bestMarketType = marketTypeBreakdown[0]; // Already sorted by ROI descending
  const worstMarketType = marketTypeBreakdown[marketTypeBreakdown.length - 1];

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="font-syne font-bold text-xl mb-2">Performance by Market Type</h2>
        <p className="text-sm text-gray-400">
          Identify which bet types you're most successful with
        </p>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-brand-green" />
            <span className="text-sm text-gray-400">Best Performing Type</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {MARKET_TYPE_INFO[bestMarketType.marketType]?.emoji || '🎯'}
            </span>
            <div>
              <div className="font-semibold">
                {MARKET_TYPE_INFO[bestMarketType.marketType]?.label || bestMarketType.marketType}
              </div>
              <div className="text-sm text-brand-green font-mono font-bold">
                +{bestMarketType.roi.toFixed(1)}% ROI
              </div>
            </div>
          </div>
        </div>

        {worstMarketType.roi < 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-red-500" />
              <span className="text-sm text-gray-400">Needs Improvement</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {MARKET_TYPE_INFO[worstMarketType.marketType]?.emoji || '🎯'}
              </span>
              <div>
                <div className="font-semibold">
                  {MARKET_TYPE_INFO[worstMarketType.marketType]?.label || worstMarketType.marketType}
                </div>
                <div className="text-sm text-red-500 font-mono font-bold">
                  {worstMarketType.roi.toFixed(1)}% ROI
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Market Type Breakdown List */}
      <div className="space-y-3">
        {marketTypeBreakdown.map((marketType) => {
          const isPositive = marketType.roi >= 0;
          const maxROI = Math.max(...marketTypeBreakdown.map(m => Math.abs(m.roi)));
          const barWidth = maxROI > 0 ? (Math.abs(marketType.roi) / maxROI) * 100 : 0;
          const typeInfo = MARKET_TYPE_INFO[marketType.marketType] || {
            emoji: '🎯',
            label: marketType.marketType,
            description: '',
          };

          return (
            <div
              key={marketType.marketType}
              className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{typeInfo.emoji}</span>
                  <div>
                    <div className="font-semibold">{typeInfo.label}</div>
                    <div className="text-xs text-gray-400">
                      {marketType.totalPositions} position{marketType.totalPositions !== 1 ? 's' : ''} · {formatCurrency(marketType.volume)} volume
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
                    {isPositive ? '+' : ''}{marketType.roi.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {marketType.winRate.toFixed(0)}% win rate
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
                    marketType.pnl >= 0 ? 'text-brand-green' : 'text-red-500'
                  }`}>
                    {marketType.pnl >= 0 ? '+' : ''}{formatCurrency(marketType.pnl)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Resolved</div>
                  <div className="font-mono text-sm font-semibold">
                    {marketType.resolvedPositions}/{marketType.totalPositions}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Avg Stake</div>
                  <div className="font-mono text-sm font-semibold">
                    {formatCurrency(marketType.volume / marketType.totalPositions)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Strategy Tip */}
      {bestMarketType.roi > 10 && (
        <div className="mt-6 bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <div className="font-semibold text-brand-cyan mb-1">Strategy Tip</div>
              <div className="text-sm text-gray-300">
                You're performing exceptionally well in {MARKET_TYPE_INFO[bestMarketType.marketType]?.label || bestMarketType.marketType} bets with a {bestMarketType.roi.toFixed(1)}% ROI. 
                Consider focusing more on this bet type to maximize returns.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
