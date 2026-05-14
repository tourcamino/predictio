import { useTradingStore, type Position } from '~/store/tradingStore';
import { StatusDot } from './StatusDot';
import { Sparkline } from './Sparkline';
import { formatPnL, formatPctChange } from '~/lib/trading/calculations';
import { deriveLivePositionFromQuote } from '~/lib/trading/deriveLivePositionFromQuote';
import { ChevronRight, Share2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ShareModal } from '../ShareModal';

interface PositionCardProps {
  position: Position;
  isSelected: boolean;
  onClick: () => void;
}

export function PositionCard({ position, isSelected, onClick }: PositionCardProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const marketPrice = useTradingStore((s) => s.marketPrices[position.marketId]);
  const live = useMemo(
    () => deriveLivePositionFromQuote(position, marketPrice),
    [position, marketPrice],
  );
  const isResolved = position.status === 'resolved';
  const isCancelled = position.status === 'cancelled';
  const displayPnl = isResolved || isCancelled ? position.unrealizedPnl : live.unrealizedPnl;
  const displayPnlPct = isResolved || isCancelled ? position.unrealizedPnlPct : live.unrealizedPnlPct;
  const displayCurrentValue = isResolved || isCancelled ? position.currentValue : live.currentValue;
  const pnlFormatted = formatPnL(displayPnl);
  const pctFormatted = formatPctChange(displayPnlPct);

  // Check if position is resolved or cancelled
  const isClaimable = isResolved && position.claimableAmount && position.claimableAmount > 0;

  // Generate mock sparkline data based on current P&L
  // In production, this would use real price history
  const sparklineData = Array.from({ length: 20 }, (_, i) => {
    const progress = i / 19;
    const baseValue = position.entryPrice;
    const endTick = live.lastPrice;
    return baseValue + (endTick - baseValue) * progress + (Math.random() - 0.5) * 0.02;
  });

  const sparklineColor = displayPnl >= 0 ? '#00FF87' : '#EF4444';

  return (
    <>
      <div
        onClick={onClick}
        className={`w-full text-left bg-white/5 border rounded-lg p-4 transition-all hover:border-brand-green/50 cursor-pointer ${
          isSelected
            ? 'border-brand-green border-l-4 border-l-brand-green'
            : isResolved
            ? 'border-brand-green/30'
            : isCancelled
            ? 'border-yellow-500/30'
            : 'border-white/10'
        }`}
      >
        {/* Header with share button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            {isResolved && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                <span className="text-xs font-semibold text-brand-green uppercase">Resolved</span>
              </div>
            )}
            {isCancelled && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-xs font-semibold text-yellow-500 uppercase">Cancelled</span>
              </div>
            )}
            {!isResolved && !isCancelled && (
              <StatusDot status={position.status} className="mb-2" />
            )}
            <h3 className="font-semibold text-sm truncate">{position.marketName}</h3>
            <p className="text-xs text-gray-400 truncate">{position.outcome}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsShareModalOpen(true);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsShareModalOpen(true);
                }
              }}
              title="Share position"
            >
              <Share2 className="w-4 h-4 text-gray-400 hover:text-brand-green" />
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* P&L Display */}
        {isResolved && position.claimableAmount ? (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">
              Cost ${position.costBasis.toFixed(2)} → Resolved at $1.00
            </div>
            <div className="flex items-baseline justify-end gap-2">
              <span className={`font-mono font-bold text-lg ${pnlFormatted.colorClass}`}>
                {pnlFormatted.text}
              </span>
              <span className={`text-xs ${pctFormatted.colorClass}`}>
                {pctFormatted.text}
              </span>
            </div>
          </div>
        ) : isCancelled ? (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">
              Market cancelled
            </div>
            <div className="text-sm text-yellow-500">
              Refund available: ${position.costBasis.toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-gray-500">
                ${position.costBasis.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500">→</span>
              <span className="font-mono font-semibold">
                ${displayCurrentValue.toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-end gap-2">
              <span className={`font-mono font-bold ${pnlFormatted.colorClass}`}>
                {pnlFormatted.text}
              </span>
              <span className={`text-xs ${pctFormatted.colorClass}`}>
                {pctFormatted.text}
              </span>
            </div>
          </div>
        )}

        {/* Sparkline or Claim CTA */}
        {isClaimable ? (
          <div className="px-3 py-2 bg-brand-green/20 border border-brand-green/30 rounded text-center">
            <span className="text-sm font-semibold text-brand-green">
              Claim ${position.claimableAmount?.toFixed(2)} →
            </span>
          </div>
        ) : isCancelled ? (
          <div className="px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-center">
            <span className="text-sm font-semibold text-yellow-500">
              Claim Refund →
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Sparkline
              data={sparklineData}
              color={sparklineColor}
              className="flex-1"
              width={120}
              height={20}
            />
            <span className="text-xs text-gray-500 ml-2">details →</span>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        marketId={position.marketId}
        userPosition={{
          outcome: position.side,
          entryPrice: position.entryPrice,
          currentPrice: live.lastPrice,
          pnl: displayPnl,
          shares: position.shares,
        }}
      />
    </>
  );
}
