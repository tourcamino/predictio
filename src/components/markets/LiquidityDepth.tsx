import { useState } from 'react';
import { ChevronDown, Activity } from 'lucide-react';
import { Market } from '~/data/mockMarkets';
import { formatCurrency } from '~/utils/marketUtils';

interface LiquidityDepthProps {
  market: Market;
}

export function LiquidityDepth({ market }: LiquidityDepthProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!market.liquidity) {
    return null;
  }

  const { 
    totalPool, 
    yesSide, 
    noSide, 
    volume24h, 
    trades24h, 
    botActive, 
    lastRebalance,
    bidPrice,
    askPrice
  } = market.liquidity;

  const yesSidePercent = (yesSide / totalPool) * 100;
  const noSidePercent = (noSide / totalPool) * 100;

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-brand-cyan" />
          <h2 className="font-syne font-bold text-xl">Liquidity Depth</h2>
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
          <div className="space-y-4">
            {/* Total Pool */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total pool</span>
                <span className="font-mono font-bold text-xl text-brand-green">
                  {formatCurrency(totalPool)} USDC
                </span>
              </div>
              
              {/* Pool Distribution */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">YES side</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(yesSide)} ({yesSidePercent.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">NO side</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(noSide)} ({noSidePercent.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Visual Distribution Bar */}
              <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-brand-green"
                  style={{ width: `${yesSidePercent}%` }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${noSidePercent}%` }}
                />
              </div>
            </div>

            {/* 24h Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">24h volume</div>
                <div className="font-mono font-bold text-lg">
                  {formatCurrency(volume24h)}
                </div>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Trades today</div>
                <div className="font-mono font-bold text-lg">
                  {trades24h}
                </div>
              </div>
            </div>

            {/* Market Maker Status */}
            <div className="p-4 bg-gradient-to-r from-brand-cyan/10 to-brand-cyan/5 border border-brand-cyan/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Market maker</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${botActive ? 'text-brand-cyan' : 'text-red-500'}`}>
                    {botActive ? 'Active' : 'Offline'}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${botActive ? 'bg-brand-cyan animate-pulse' : 'bg-red-500'}`} />
                </div>
              </div>
              
              {botActive && (
                <>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Last rebalance</span>
                    <span className="font-mono text-brand-cyan">{lastRebalance}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Bot spread</span>
                    <span className="font-mono text-brand-cyan">
                      ${bidPrice.toFixed(2)} / ${askPrice.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Info Footer */}
            <div className="text-xs text-gray-500 text-center pt-2">
              Liquidity provided by automated market maker
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
