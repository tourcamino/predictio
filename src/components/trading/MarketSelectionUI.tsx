import { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface Market {
  id: string;
  event: string;
  sport: string;
  sportEmoji: string;
  yesPrice: number;
  noPrice: number;
  analystVolume: number;
}

interface MarketSelectionUIProps {
  markets: Market[];
  initialSelected?: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function MarketSelectionUI({ 
  markets, 
  initialSelected = [], 
  onSelectionChange 
}: MarketSelectionUIProps) {
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(
    new Set(initialSelected)
  );
  const [sportFilter, setSportFilter] = useState<string>('all');

  useEffect(() => {
    onSelectionChange(Array.from(selectedMarkets));
  }, [selectedMarkets, onSelectionChange]);

  const toggleMarket = (marketId: string) => {
    const newSelected = new Set(selectedMarkets);
    if (newSelected.has(marketId)) {
      newSelected.delete(marketId);
    } else {
      newSelected.add(marketId);
    }
    setSelectedMarkets(newSelected);
  };

  // Get unique sports from markets
  const availableSports = Array.from(new Set(markets.map(m => m.sport)));
  
  const normSport = (s: string) => s.trim().toLowerCase();

  // Filter markets by sport
  const filteredMarkets = sportFilter === 'all' 
    ? markets 
    : markets.filter(m => normSport(m.sport) === sportFilter);

  const toggleAll = () => {
    if (selectedMarkets.size === filteredMarkets.length) {
      setSelectedMarkets(new Set());
    } else {
      setSelectedMarkets(new Set(filteredMarkets.map(m => m.id)));
    }
  };

  // Sport filter buttons
  const sportFilters = [
    { key: 'all', label: 'All', count: markets.length },
    { key: 'football', label: 'Soccer', count: markets.filter(m => normSport(m.sport) === 'football').length },
    { key: 'basketball', label: 'Basketball', count: markets.filter(m => normSport(m.sport) === 'basketball').length },
    { key: 'mma', label: 'MMA', count: markets.filter(m => normSport(m.sport) === 'mma').length },
    { key: 'tennis', label: 'Tennis', count: markets.filter(m => normSport(m.sport) === 'tennis').length },
    { key: 'other', label: 'Other', count: markets.filter(m => !['football', 'basketball', 'mma', 'tennis'].includes(normSport(m.sport))).length },
  ].filter(f => f.count > 0 || f.key === 'all');

  return (
    <div className="space-y-4">
      {/* Sport Filters */}
      <div className="flex flex-wrap gap-2">
        {sportFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setSportFilter(filter.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sportFilter === filter.key
                ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Select All Toggle */}
      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
        <span className="text-sm font-medium">
          {selectedMarkets.size} of {filteredMarkets.length} markets selected
        </span>
        <button
          onClick={toggleAll}
          className="text-sm text-brand-green hover:text-brand-green/80 font-semibold"
        >
          {selectedMarkets.size === filteredMarkets.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Validation Message */}
      {selectedMarkets.size === 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-500">
            Please select at least 1 market to copy
          </span>
        </div>
      )}

      {/* Markets List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredMarkets.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No markets available for this sport
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const isSelected = selectedMarkets.has(market.id);
            return (
              <label
                key={market.id}
                className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-brand-green/10 border border-brand-green/30'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMarket(market.id)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
                  />
                </div>

                {/* Market Info */}
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">{market.sportEmoji}</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                      {market.event}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[10px] text-gray-400 sm:text-xs">YES</div>
                      <div className="truncate font-mono text-xs font-bold text-brand-green sm:text-sm">
                        ${market.yesPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[10px] text-gray-400 sm:text-xs">NO</div>
                      <div className="truncate font-mono text-xs font-bold text-red-400 sm:text-sm">
                        ${market.noPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[10px] text-gray-400 sm:text-xs">Vol</div>
                      <div className="truncate font-mono text-xs font-bold text-brand-cyan sm:text-sm">
                        ${market.analystVolume.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-brand-green flex items-center justify-center">
                      <Check className="w-4 h-4 text-brand-bg" />
                    </div>
                  </div>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
