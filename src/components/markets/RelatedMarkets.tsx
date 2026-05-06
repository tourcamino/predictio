import { useNavigate } from '@tanstack/react-router';
import { Market, mockMarkets } from '~/data/mockMarkets';
import { MarketCard } from './MarketCard';

interface RelatedMarketsProps {
  currentMarket: Market;
}

export function RelatedMarkets({ currentMarket }: RelatedMarketsProps) {
  const navigate = useNavigate();
  
  // Find related markets - same sport or league, excluding current market
  const relatedMarkets = mockMarkets
    .filter(
      (m) =>
        m.id !== currentMarket.id &&
        (m.sport === currentMarket.sport || m.league === currentMarket.league)
    )
    .slice(0, 3);

  if (relatedMarkets.length === 0) {
    return null;
  }

  const handleMarketClick = (marketId: string) => {
    navigate({ to: '/markets/$marketId', params: { marketId } });
  };

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-2xl mb-6">Related Markets</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {relatedMarkets.map((market) => (
          <MarketCard 
            key={market.id} 
            market={market} 
            onClick={() => handleMarketClick(market.id)}
          />
        ))}
      </div>
    </div>
  );
}
