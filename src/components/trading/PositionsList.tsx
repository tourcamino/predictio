import { useState } from 'react';
import { useTradingStore } from '~/store/tradingStore';
import { PositionCard } from './PositionCard';
import { ChevronDown } from 'lucide-react';

export function PositionsList() {
  const positions = useTradingStore((state) => state.positions);
  const selectedPositionId = useTradingStore((state) => state.selectedPositionId);
  const selectPosition = useTradingStore((state) => state.selectPosition);

  const [filter, setFilter] = useState<'all' | 'winning' | 'losing'>('all');
  const [sort, setSort] = useState<'recent' | 'pnl' | 'size' | 'expiry'>('recent');

  // Filter positions
  const filteredPositions = positions.filter((p) => {
    if (filter === 'winning') return p.unrealizedPnl > 0;
    if (filter === 'losing') return p.unrealizedPnl < 0;
    return true;
  });

  // Sort positions
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    switch (sort) {
      case 'pnl':
        return b.unrealizedPnl - a.unrealizedPnl;
      case 'size':
        return b.currentValue - a.currentValue;
      case 'expiry':
        return a.marketEndsAt.getTime() - b.marketEndsAt.getTime();
      case 'recent':
      default:
        return b.openedAt.getTime() - a.openedAt.getTime();
    }
  });

  // Calculate totals
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.costBasis, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-gray-400">
            {positions.length} active position{positions.length !== 1 ? 's' : ''}
          </h2>
        </div>

        <div className="flex gap-2">
          {/* Filter dropdown */}
          <div className="relative flex-1">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer hover:border-white/20 transition-colors"
            >
              <option value="all">All</option>
              <option value="winning">Winning</option>
              <option value="losing">Losing</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Sort dropdown */}
          <div className="relative flex-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer hover:border-white/20 transition-colors"
            >
              <option value="recent">Recent</option>
              <option value="pnl">P&L</option>
              <option value="size">Size</option>
              <option value="expiry">Expiry</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Positions list - scrollable */}
      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide">
        {sortedPositions.map((position) => (
          <PositionCard
            key={position.id}
            position={position}
            isSelected={position.id === selectedPositionId}
            onClick={() => selectPosition(position.id)}
          />
        ))}
      </div>

      {/* Portfolio summary - fixed at bottom */}
      <div className="mt-4 pt-4 border-t border-white/10 bg-brand-bg">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total value</span>
              <span className="font-mono font-semibold">${totalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Cost basis</span>
              <span className="font-mono">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="text-gray-400">Unrealized P&L</span>
              <div className="text-right">
                <div className={`font-mono font-bold ${totalPnL >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </div>
                <div className={`text-xs ${totalPnL >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
