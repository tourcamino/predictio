import { Market } from '~/data/mockMarkets';
import { TrendingUp } from 'lucide-react';

interface DecisionBlockProps {
  market: Market;
  onSelectOutcome: (outcome: 'YES' | 'NO') => void;
}

export function DecisionBlock({ market, onSelectOutcome }: DecisionBlockProps) {
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatProbability = (price: number) => `${Math.round(price * 100)}%`;

  return (
    <div className="bg-gradient-to-br from-brand-green/5 to-transparent border-2 border-brand-green/30 rounded-xl p-4 sm:p-6">
      {/* Main Question */}
      <h2 className="font-syne font-bold text-xl sm:text-2xl md:text-3xl text-center mb-4 sm:mb-6">
        Who will win?
      </h2>

      {/* Outcome Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Team A Button */}
        <button
          onClick={() => onSelectOutcome('YES')}
          className="group relative rounded-xl border-2 border-green-500/40 bg-gradient-to-br from-green-500/15 to-green-500/5 hover:from-green-500/25 hover:to-green-500/10 hover:border-green-500/60 transition-all duration-300 hover:scale-[1.02] active:scale-100 shadow-lg hover:shadow-green-500/20 overflow-hidden min-h-[120px] touch-manipulation"
        >
          <div className="p-4 sm:p-5">
            {/* Team Name - Fixed height to prevent overflow */}
            <div className="font-syne font-bold text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3 text-white group-hover:text-green-400 transition-colors line-clamp-2 min-h-[3rem] flex items-center justify-center">
              {market.teamA}
            </div>
            
            {/* Price - Constrained size */}
            <div className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-green-500 mb-1 sm:mb-2">
              {formatPrice(market.yesPrice)}
            </div>
            
            {/* Probability */}
            <div className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
              {formatProbability(market.yesPrice)} probability
            </div>

            {/* CTA Text */}
            <div className="flex items-center justify-center gap-2 text-green-400 font-semibold text-xs sm:text-sm">
              <span>Trade now</span>
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
        </button>

        {/* Team B Button */}
        <button
          onClick={() => onSelectOutcome('NO')}
          className="group relative rounded-xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 hover:from-cyan-500/25 hover:to-cyan-500/10 hover:border-cyan-500/60 transition-all duration-300 hover:scale-[1.02] active:scale-100 shadow-lg hover:shadow-cyan-500/20 overflow-hidden min-h-[120px] touch-manipulation"
        >
          <div className="p-4 sm:p-5">
            {/* Team Name - Fixed height to prevent overflow */}
            <div className="font-syne font-bold text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3 text-white group-hover:text-cyan-400 transition-colors line-clamp-2 min-h-[3rem] flex items-center justify-center">
              {market.teamB}
            </div>
            
            {/* Price - Constrained size */}
            <div className="font-mono text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-500 mb-1 sm:mb-2">
              {formatPrice(market.noPrice)}
            </div>
            
            {/* Probability */}
            <div className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
              {formatProbability(market.noPrice)} probability
            </div>

            {/* CTA Text */}
            <div className="flex items-center justify-center gap-2 text-cyan-400 font-semibold text-xs sm:text-sm">
              <span>Trade now</span>
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
