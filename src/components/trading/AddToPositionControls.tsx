import { useState } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { calculateNewAvgEntry, calculateSharesFromAmount, formatPnL } from '~/lib/trading/calculations';
import type { Position } from '~/store/tradingStore';

interface AddToPositionControlsProps {
  position: Position;
  currentPrice: number;
  maxAmount: number; // User's balance
  onBuy: (amount: number, shares: number, newAvgEntry: number, totalShares: number, fee: number) => void;
}

export function AddToPositionControls({ position, currentPrice, maxAmount, onBuy }: AddToPositionControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [amount, setAmount] = useState('');
  
  const amountNum = parseFloat(amount) || 0;
  
  // Calculate new shares and fee
  const { shares: newShares, fee } = calculateSharesFromAmount(amountNum, currentPrice, true);
  
  // Calculate new average entry
  const newAvgEntry = calculateNewAvgEntry(
    position.shares,
    position.entryPrice,
    newShares,
    currentPrice
  );
  
  // Calculate total shares
  const totalShares = position.shares + newShares;
  
  // Calculate potential new P&L at current price
  const newCostBasis = position.costBasis + amountNum;
  const newCurrentValue = totalShares * currentPrice;
  const potentialPnL = newCurrentValue - newCostBasis;
  const potentialPnLPct = newCostBasis > 0 ? (potentialPnL / newCostBasis) * 100 : 0;
  
  const pnlFormatted = formatPnL(potentialPnL);
  
  const handleBuy = () => {
    if (amountNum > 0 && amountNum <= maxAmount) {
      onBuy(amountNum, newShares, newAvgEntry, totalShares, fee);
    }
  };
  
  const setQuickAmount = (pct: number) => {
    const quickAmount = (maxAmount * pct) / 100;
    setAmount(quickAmount.toFixed(2));
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[0_16px_48px_rgba(0,0,0,0.3)]">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-brand-green" />
          </div>
          <div className="text-left">
            <h3 className="font-syne font-bold text-lg">Add to Position</h3>
            <p className="text-sm text-gray-400">Buy more shares to increase exposure</p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4 animate-slide-down">
          {/* Amount Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                max={maxAmount}
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 font-mono text-lg focus:outline-none focus:border-brand-green/50 transition-colors"
              />
              <button
                onClick={() => setAmount(maxAmount.toFixed(2))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-green hover:underline font-semibold"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Available: ${maxAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setQuickAmount(pct)}
                className="py-2 px-3 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green/50 font-semibold text-sm transition-all"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Summary */}
          {amountNum > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">You'll receive</span>
                <span className="font-mono font-semibold">{newShares.toLocaleString()} shares</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Entry price</span>
                <span className="font-mono">${currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fee (0.8%)</span>
                <span className="font-mono">~${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-white/10">
                <span className="text-gray-400">New avg entry</span>
                <span className="font-mono font-bold text-brand-green">${newAvgEntry.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total shares</span>
                <span className="font-mono font-bold">{totalShares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-white/10">
                <span className="text-gray-400">New unrealized P&L</span>
                <div className="text-right">
                  <div className={`font-mono font-bold ${pnlFormatted.colorClass}`}>
                    {pnlFormatted.text}
                  </div>
                  <div className={`text-xs ${pnlFormatted.colorClass}`}>
                    {potentialPnL >= 0 ? '+' : ''}{potentialPnLPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buy Button */}
          <button
            onClick={handleBuy}
            disabled={amountNum === 0 || amountNum > maxAmount}
            className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add ${amountNum.toFixed(2)} to Position
          </button>

          {amountNum > maxAmount && (
            <p className="text-xs text-red-500 text-center">
              Insufficient balance
            </p>
          )}
        </div>
      )}
    </div>
  );
}
