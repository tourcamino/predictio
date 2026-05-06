import { SeedMarket } from '~/data/seedMarkets';
import { MarketCardCompact } from './MarketCardCompact';

interface MarketsGridProps {
  markets: SeedMarket[];
  viewMode: 'grid' | 'list';
  onMarketClick: (marketId: string) => void;
}

export function MarketsGrid({ markets, viewMode, onMarketClick }: MarketsGridProps) {
  if (markets.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="font-syne text-2xl font-bold mb-2">No markets found</h3>
        <p className="text-gray-400">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {markets.map((market) => (
          <MarketCardCompact
            key={market.id}
            market={market}
            onClick={() => onMarketClick(market.id)}
            variant="list"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCardCompact
          key={market.id}
          market={market}
          onClick={() => onMarketClick(market.id)}
          variant="card"
        />
      ))}
    </div>
  );
}
