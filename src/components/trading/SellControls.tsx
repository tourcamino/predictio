import { useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { calculateAmountFromShares, formatPnL, formatPctChange } from '~/lib/trading/calculations';
import type { Position } from '~/store/tradingStore';

interface SellControlsProps {
  position: Position;
  currentPrice: number;
  onSell: (shares: number, proceeds: number, realizedPnL: number, realizedPnLPct: number) => void;
}

export function SellControls({ position, currentPrice, onSell }: SellControlsProps) {
  const [sellPercentage, setSellPercentage] = useState(100);
  
  // Calculate shares to sell
  const sharesToSell = Math.floor((position.shares * sellPercentage) / 100);
  
  // Calculate proceeds
  const { net: proceeds } = calculateAmountFromShares(sharesToSell, currentPrice, false);
  
  // Calculate realized P&L for this portion
  const costBasisForPortion = (position.costBasis * sellPercentage) / 100;
  const realizedPnL = proceeds - costBasisForPortion;
  const realizedPnLPct = costBasisForPortion > 0 ? (realizedPnL / costBasisForPortion) * 100 : 0;
  
  const pnlFormatted = formatPnL(realizedPnL);
  const pctFormatted = formatPctChange(realizedPnLPct);
  
  const handleSell = () => {
    if (sharesToSell > 0) {
      onSell(sharesToSell, proceeds, realizedPnL, realizedPnLPct);
    }
  };
  
  const setPercentage = (pct: number) => {
    setSellPercentage(pct);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <TrendingDown className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h3 className="font-syne font-bold text-lg">Sell Position</h3>
          <p className="text-sm text-gray-400">Close part or all of your position</p>
        </div>
      </div>

      {/* Percentage Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            onClick={() => setPercentage(pct)}
            className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
              sellPercentage === pct
                ? 'bg-red-500 text-white'
                : 'bg-white/5 border border-white/10 hover:border-red-500/50'
            }`}
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="mb-6">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={sellPercentage}
          onChange={(e) => setSellPercentage(Number(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-red"
        />
        <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
          <span>0%</span>
          <span className="font-bold text-white">{sellPercentage}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Shares to sell</span>
          <span className="font-mono font-semibold">{sharesToSell.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Exit price</span>
          <span className="font-mono">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm pt-3 border-t border-white/10">
          <span className="text-gray-400">You'll receive</span>
          <span className="font-mono font-bold text-brand-green">${proceeds.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Realized P&L</span>
          <div className="text-right">
            <div className={`font-mono font-bold ${pnlFormatted.colorClass}`}>
              {pnlFormatted.text}
            </div>
            <div className={`text-xs ${pctFormatted.colorClass}`}>
              {pctFormatted.text}
            </div>
          </div>
        </div>
      </div>

      {/* Sell Button */}
      <button
        onClick={handleSell}
        disabled={sharesToSell === 0}
        className="w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sellPercentage === 100 ? 'Close Position' : `Sell ${sellPercentage}%`}
      </button>

      {sellPercentage === 100 && (
        <p className="text-xs text-gray-500 text-center mt-2">
          This will close your entire position
        </p>
      )}
    </div>
  );
}
