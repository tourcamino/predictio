import { useState, useMemo } from 'react';
import { useTradingStore, type Position } from '~/store/tradingStore';
import { PositionCard } from './PositionCard';
import { ChevronDown } from 'lucide-react';
import { deriveLivePositionFromQuote } from '~/lib/trading/deriveLivePositionFromQuote';

interface PositionsListProps {
  /** DB-backed or guest-demo rows from the parent route / query layer. */
  positions: Position[];
}

export function PositionsList({ positions }: PositionsListProps) {
  const marketPrices = useTradingStore((s) => s.marketPrices);
  const selectedPositionId = useTradingStore((state) => state.selectedPositionId);
  const selectPosition = useTradingStore((state) => state.selectPosition);

  const rows = useMemo(
    () =>
      positions.map((p) => {
        const live = deriveLivePositionFromQuote(p, marketPrices[p.marketId]);
        const terminal = p.status === 'resolved' || p.status === 'cancelled';
        return {
          position: p,
          live,
          displayPnl: terminal ? p.unrealizedPnl : live.unrealizedPnl,
          displayCurrentValue: terminal ? p.currentValue : live.currentValue,
        };
      }),
    [positions, marketPrices],
  );

  const [filter, setFilter] = useState<'all' | 'winning' | 'losing'>('all');
  const [sort, setSort] = useState<'recent' | 'pnl' | 'size' | 'expiry'>('recent');

  // Filter positions
  const filteredRows = rows.filter((r) => {
    if (filter === 'winning') return r.displayPnl > 0;
    if (filter === 'losing') return r.displayPnl < 0;
    return true;
  });

  // Sort positions
  const sortedRows = [...filteredRows].sort((a, b) => {
    switch (sort) {
      case 'pnl':
        return b.displayPnl - a.displayPnl;
      case 'size':
        return b.displayCurrentValue - a.displayCurrentValue;
      case 'expiry':
        return a.position.marketEndsAt.getTime() - b.position.marketEndsAt.getTime();
      case 'recent':
      default:
        return b.position.openedAt.getTime() - a.position.openedAt.getTime();
    }
  });

  // Calculate totals (full list, not filter — matches prior behavior)
  const totalValue = rows.reduce((sum, r) => sum + r.displayCurrentValue, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.position.costBasis, 0);
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
        {sortedRows.map(({ position }) => (
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
