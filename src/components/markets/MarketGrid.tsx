import { useState, useEffect, useRef } from 'react';
import { Market } from '~/data/mockMarkets';
import { TrendingMarketCard } from './TrendingMarketCard';

interface MarketGridProps {
  markets: Market[];
  viewMode: 'grid' | 'list';
  onMarketClick: (marketId: string) => void;
}

export function MarketGrid({ markets, viewMode, onMarketClick }: MarketGridProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayMarkets, setDisplayMarkets] = useState(markets);
  const prevMarketsRef = useRef<string[]>([]);

  useEffect(() => {
    const currentIds = markets.map(m => m.id);
    const prevIds = prevMarketsRef.current;

    // Only trigger animation if markets actually changed
    if (JSON.stringify(currentIds) === JSON.stringify(prevIds)) {
      return;
    }

    prevMarketsRef.current = currentIds;
    setIsAnimating(true);
    const timeout = setTimeout(() => {
      setDisplayMarkets(markets);
      setIsAnimating(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [markets]);

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-syne font-bold text-2xl sm:text-3xl">
          All Markets{' '}
          <span className="text-gray-500 font-normal">({markets.length})</span>
        </h2>
      </div>

      {/* Grid */}
      <div
        className={`grid gap-6 transition-opacity duration-200 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        } ${
          viewMode === 'grid'
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {displayMarkets.map((market, index) => (
          <div
            key={market.id}
            className="animate-fade-in"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'backwards',
            }}
          >
            <TrendingMarketCard market={market} onClick={() => onMarketClick(market.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
