import { useState, useEffect, useRef } from 'react';
import { Market } from '~/data/mockMarkets';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketOddsProps {
  market: Market;
  selectedOutcome: string | null;
  onSelectOutcome: (outcome: string) => void;
}

export function MarketOdds({ market, selectedOutcome, onSelectOutcome }: MarketOddsProps) {
  const [animatingOutcomes, setAnimatingOutcomes] = useState<Set<string>>(new Set());
  const prevPercentsRef = useRef<Record<string, number>>({});
  const isLive = market.status === 'closing-soon';

  const outcomes = [
    { id: 'teamA', label: market.teamA, percent: market.percentA ?? 0 },
    ...(market.percentDraw != null
      ? [{ id: 'draw', label: 'Draw', percent: market.percentDraw }]
      : []),
    { id: 'teamB', label: market.teamB, percent: market.percentB ?? 0 },
  ];

  const leadingOutcome = outcomes.reduce(
    (max, outcome) => (outcome.percent > max.percent ? outcome : max),
    outcomes[0]!
  );

  // Detect odds changes and trigger animations
  useEffect(() => {
    const changedOutcomes = new Set<string>();
    
    outcomes.forEach((outcome) => {
      const prevPercent = prevPercentsRef.current[outcome.id];
      if (prevPercent !== undefined && prevPercent !== outcome.percent) {
        changedOutcomes.add(outcome.id);
      }
      prevPercentsRef.current[outcome.id] = outcome.percent;
    });

    if (changedOutcomes.size > 0) {
      setAnimatingOutcomes(changedOutcomes);
      
      // Clear animation state after animation completes
      const timer = setTimeout(() => {
        setAnimatingOutcomes(new Set());
      }, 600);
      
      return () => clearTimeout(timer);
    }
  }, [market.percentA, market.percentB, market.percentDraw]);

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-syne font-bold text-xl">Current Odds</h2>
        {isLive && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-500 font-semibold text-xs uppercase">LIVE</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {outcomes.map((outcome) => {
          const isLeading = outcome.percent === leadingOutcome.percent && outcome.percent > 0;
          const isSelected = selectedOutcome === outcome.id;
          const isAnimating = animatingOutcomes.has(outcome.id);
          const prevPercent = prevPercentsRef.current[outcome.id];
          const isIncreasing = prevPercent !== undefined && outcome.percent > prevPercent;
          const isDecreasing = prevPercent !== undefined && outcome.percent < prevPercent;

          return (
            <button
              key={outcome.id}
              onClick={() => onSelectOutcome(outcome.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-brand-green bg-brand-green/10'
                  : 'border-white/10 bg-white/5 hover:border-brand-green/50 hover:bg-brand-green/5'
              } ${isLive ? 'hover:scale-[1.02]' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{outcome.label}</span>
                  {isLeading && (
                    <span className="px-2 py-0.5 bg-brand-green text-brand-bg text-xs font-semibold rounded">
                      LEADING
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isIncreasing && (
                    <TrendingUp className={`w-4 h-4 text-brand-green ${isAnimating ? 'animate-pulse' : ''}`} />
                  )}
                  {isDecreasing && (
                    <TrendingDown className={`w-4 h-4 text-red-500 ${isAnimating ? 'animate-pulse' : ''}`} />
                  )}
                  <span 
                    className={`font-mono text-2xl font-bold transition-all duration-300 ${
                      isAnimating && isIncreasing ? 'text-brand-green scale-110' : 
                      isAnimating && isDecreasing ? 'text-red-500 scale-110' : ''
                    } ${isAnimating ? 'odds-flash' : ''}`}
                  >
                    {outcome.percent}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isSelected ? 'bg-brand-green' : 'bg-white/20'
                  } ${isLive && isAnimating ? 'animate-pulse' : ''}`}
                  style={{ width: `${outcome.percent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Total Check */}
      <div className="mt-4 pt-4 border-t border-white/10 font-mono text-xs text-gray-500">
        Total: {outcomes.reduce((sum, o) => sum + o.percent, 0)}%
      </div>
    </div>
  );
}
