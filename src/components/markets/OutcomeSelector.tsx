import { Check } from 'lucide-react';
import { Market } from '~/data/mockMarkets';

interface OutcomeSelectorProps {
  market: Market;
  selectedOutcome: string | null;
  onSelectOutcome: (outcome: string) => void;
}

export function OutcomeSelector({ market, selectedOutcome, onSelectOutcome }: OutcomeSelectorProps) {
  const outcomes = [
    {
      id: 'YES',
      label: `${market.teamA} to win`,
      shortLabel: 'YES',
      price: market.yesPrice,
      probability: market.yesPrice * 100,
      volume: market.volume * market.yesPrice,
    },
    {
      id: 'NO',
      label: `${market.teamA} NOT to win`,
      shortLabel: 'NO',
      price: market.noPrice,
      probability: market.noPrice * 100,
      volume: market.volume * market.noPrice,
    },
  ];

  const leadingOutcome = outcomes.reduce((max, outcome) =>
    outcome.probability > max.probability ? outcome : max
  );

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toFixed(0)}`;
  };

  return (
    <div className="mb-6">
      <h2 className="font-syne font-bold text-xl mb-4">Select Outcome</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {outcomes.map((outcome) => {
          const isLeading = outcome.id === leadingOutcome.id;
          const isSelected = selectedOutcome === outcome.id;
          const isYes = outcome.id === 'YES';

          return (
            <button
              key={outcome.id}
              onClick={() => onSelectOutcome(outcome.id)}
              className={`relative p-6 sm:p-6 rounded-lg border-2 transition-all text-center min-h-[200px] sm:min-h-0 active:scale-95 ${
                isSelected
                  ? isYes
                    ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20'
                    : 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/20'
                  : isYes
                  ? 'border-white/10 bg-white/5 hover:border-green-500/50 hover:bg-green-500/10'
                  : 'border-white/10 bg-white/5 hover:border-red-500/50 hover:bg-red-500/10'
              }`}
            >
              {/* Checkmark for selected */}
              {isSelected && (
                <div className={`absolute top-3 right-3 w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                  isYes ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <Check className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                </div>
              )}

              {/* Favorite badge */}
              {isLeading && (
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs font-bold rounded uppercase ${
                    isYes ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    Leading
                  </span>
                </div>
              )}

              {/* Outcome name with explicit team/event */}
              <div className="mb-3 sm:mb-2 mt-6 sm:mt-4">
                <div className={`font-syne font-bold text-3xl sm:text-2xl mb-3 sm:mb-2 ${
                  isYes ? 'text-green-500' : 'text-red-500'
                }`}>
                  {outcome.shortLabel}
                </div>
                <div className={`text-base sm:text-base font-semibold mb-1 px-2 leading-snug ${
                  isYes ? 'text-green-400' : 'text-red-400'
                }`}>
                  {outcome.label}
                </div>
              </div>

              {/* Price */}
              <div className="mb-5 sm:mb-4">
                <div className={`font-mono text-6xl sm:text-5xl font-bold ${
                  isYes ? 'text-green-500' : 'text-red-500'
                }`}>
                  {Math.round(outcome.price * 100)}¢
                </div>
                <div className="text-sm sm:text-xs text-gray-400 mt-2 sm:mt-1">
                  {outcome.probability.toFixed(0)}% probability
                </div>
              </div>

              {/* Volume */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between items-center px-2">
                  <span className="text-gray-400">Volume:</span>
                  <span className="font-mono font-semibold">{formatVolume(outcome.volume)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
