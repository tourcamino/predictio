import { useState, useMemo } from 'react';
import { useTradingStore, type Position } from '~/store/tradingStore';
import { PositionCard } from './PositionCard';
import { ChevronDown, Radio } from 'lucide-react';
import { deriveLivePositionFromQuote } from '~/lib/trading/deriveLivePositionFromQuote';

interface PositionsListProps {
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
        const terminal =
          p.status === 'resolved' || p.status === 'cancelled' || p.status === 'refunded';
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

  const filteredRows = rows.filter((r) => {
    if (filter === 'winning') return r.displayPnl > 0;
    if (filter === 'losing') return r.displayPnl < 0;
    return true;
  });

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

  const totalValue = rows.reduce((sum, r) => sum + r.displayCurrentValue, 0);
  const totalCost = rows.reduce((sum, r) => sum + r.position.costBasis, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const selectClass =
    'w-full appearance-none cursor-pointer rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono uppercase tracking-wide text-gray-300 transition-colors hover:border-brand-green/30 focus:border-brand-green/40 focus:outline-none';

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 border-b border-white/10 pb-4">
        <div className="mb-3 flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-brand-green animate-pulse" />
          <h2 className="font-syne text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
            Open rail
          </h2>
          <span className="ml-auto font-mono text-sm font-bold text-white">{positions.length}</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'winning' | 'losing')}
              className={selectClass}
            >
              <option value="all">All</option>
              <option value="winning">Winning</option>
              <option value="losing">Losing</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
          <div className="relative flex-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className={selectClass}
            >
              <option value="recent">Recent</option>
              <option value="pnl">P&amp;L</option>
              <option value="size">Size</option>
              <option value="expiry">Expiry</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
        {sortedRows.map(({ position }, i) => (
          <div key={position.id}>
            {i > 0 && (
              <div
                className="mb-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
                aria-hidden
              />
            )}
            <PositionCard
              position={position}
              isSelected={position.id === selectedPositionId}
              onClick={() => selectPosition(position.id)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-gray-500">
            Rail MTM
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Mark value</span>
              <span className="font-mono font-semibold text-white">${totalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cost basis</span>
              <span className="font-mono text-gray-300">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="text-gray-500">Unrealized</span>
              <div className="text-right">
                <div
                  className={`font-mono text-base font-bold ${totalPnL >= 0 ? 'text-brand-green' : 'text-red-400'}`}
                >
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </div>
                <div
                  className={`text-[10px] font-mono ${totalPnL >= 0 ? 'text-brand-green/80' : 'text-red-400/80'}`}
                >
                  {totalPnL >= 0 ? '+' : ''}
                  {totalPnLPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
