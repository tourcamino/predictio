import { useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Market } from '~/data/mockMarkets';

interface OrderBookProps {
  market: Market;
}

interface Order {
  price: number;
  shares: number;
}

// Generate mock order book data
function generateMockOrderBook(market: Market): {
  bids: Order[];
  asks: Order[];
} {
  const currentPrice = market.yesPrice;
  const spread = 0.02;
  
  // Generate bids (buy orders) below current price
  const bids: Order[] = [];
  for (let i = 0; i < 5; i++) {
    bids.push({
      price: currentPrice - spread / 2 - i * 0.01,
      shares: Math.floor(Math.random() * 500) + 100,
    });
  }
  
  // Generate asks (sell orders) above current price
  const asks: Order[] = [];
  for (let i = 0; i < 5; i++) {
    asks.push({
      price: currentPrice + spread / 2 + i * 0.01,
      shares: Math.floor(Math.random() * 400) + 80,
    });
  }
  
  return { bids, asks };
}

export function OrderBook({ market }: OrderBookProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { bids, asks } = generateMockOrderBook(market);
  
  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spread = bestAsk - bestBid;
  const spreadPercent = ((spread / bestBid) * 100);

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-syne font-bold text-xl">Order Book</h2>
          <span className="text-xs text-gray-400 font-mono">
            Spread: ${spread.toFixed(2)} ({spreadPercent.toFixed(2)}%)
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-6 pb-6 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bids (Buy Orders) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-brand-green" />
                <h3 className="font-semibold text-sm text-brand-green">BIDS (Buy)</h3>
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 font-semibold mb-2">
                  <div>Price</div>
                  <div className="text-right">Shares</div>
                </div>
                {bids.map((bid, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-2 text-sm font-mono py-2 px-3 bg-brand-green/5 rounded hover:bg-brand-green/10 transition-all"
                  >
                    <div className="text-brand-green font-semibold">
                      ${bid.price.toFixed(2)}
                    </div>
                    <div className="text-right text-gray-300">
                      {bid.shares.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Asks (Sell Orders) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-sm text-red-500">ASKS (Sell)</h3>
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 font-semibold mb-2">
                  <div>Price</div>
                  <div className="text-right">Shares</div>
                </div>
                {asks.map((ask, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-2 text-sm font-mono py-2 px-3 bg-red-500/5 rounded hover:bg-red-500/10 transition-all"
                  >
                    <div className="text-red-500 font-semibold">
                      ${ask.price.toFixed(2)}
                    </div>
                    <div className="text-right text-gray-300">
                      {ask.shares.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Spread Info */}
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Best Bid</span>
              <span className="font-mono font-semibold text-brand-green">
                ${bestBid.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">Best Ask</span>
              <span className="font-mono font-semibold text-red-500">
                ${bestAsk.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-white/10">
              <span className="text-gray-400">Spread</span>
              <span className="font-mono font-semibold">
                ${spread.toFixed(2)} ({spreadPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            Order book updates in real-time based on market activity
          </div>
        </div>
      )}
    </div>
  );
}
