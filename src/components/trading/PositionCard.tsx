import { useTradingStore, type Position } from '~/store/tradingStore';
import { StatusDot } from './StatusDot';
import { formatPnL, formatPctChange } from '~/lib/trading/calculations';
import { deriveLivePositionFromQuote } from '~/lib/trading/deriveLivePositionFromQuote';
import { ProbabilityDepthBar } from './ProbabilityDepthBar';
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
  const isRefunded = position.status === 'refunded';
  const isTerminalStatic = isResolved || isCancelled || isRefunded;
  const displayPnl = isTerminalStatic ? position.unrealizedPnl : live.unrealizedPnl;
  const displayPnlPct = isTerminalStatic ? position.unrealizedPnlPct : live.unrealizedPnlPct;
  const displayCurrentValue = isTerminalStatic ? position.currentValue : live.currentValue;
  const pnlFormatted = formatPnL(displayPnl);
  const pctFormatted = formatPctChange(displayPnlPct);
  const isClaimable = isResolved && position.claimableAmount && position.claimableAmount > 0;
  const isLiveOpen = !isTerminalStatic;

  const shellClass = isSelected
    ? 'border-brand-green/50 bg-gradient-to-br from-brand-green/[0.12] to-white/[0.03] shadow-[0_0_32px_rgba(0,255,135,0.12)] ring-1 ring-brand-green/30'
    : 'border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-white/[0.02] hover:border-brand-green/35 hover:shadow-[0_0_24px_rgba(0,255,135,0.06)]';

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={`group relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all ${shellClass}`}
      >
        {isSelected && (
          <div
            className="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-green shadow-[0_0_12px_rgba(0,255,135,0.8)]"
            aria-hidden
          />
        )}
        {isLiveOpen && (
          <div
            className="pointer-events-none absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-brand-green/80 shadow-[0_0_8px_rgba(0,255,135,0.6)] animate-pulse"
            aria-hidden
          />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:via-brand-green/30"
          aria-hidden
        />

        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {isRefunded && (
              <span className="mb-2 inline-block text-[10px] font-bold uppercase tracking-wide text-cyan-400">
                Refunded
              </span>
            )}
            {isResolved && (
              <span className="mb-2 inline-block text-[10px] font-bold uppercase tracking-wide text-brand-green">
                Resolved
              </span>
            )}
            {isCancelled && (
              <span className="mb-2 inline-block text-[10px] font-bold uppercase tracking-wide text-yellow-500">
                Cancelled
              </span>
            )}
            {isLiveOpen && <StatusDot status={position.status} className="mb-2" />}
            <h3 className="truncate font-syne text-sm font-semibold tracking-tight">{position.marketName}</h3>
            <p className="mt-0.5 truncate text-xs text-gray-500">{position.outcome}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span
              role="presentation"
              onClick={(e) => {
                e.stopPropagation();
                setIsShareModalOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsShareModalOpen(true);
                }
              }}
              tabIndex={0}
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
              title="Share position"
            >
              <Share2 className="h-4 w-4 text-gray-500 hover:text-brand-green" />
            </span>
            <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-brand-green/80" />
          </div>
        </div>

        {isRefunded ? (
          <p className="mb-3 text-xs text-cyan-400/90">Principal refunded · $0 P&amp;L</p>
        ) : isResolved && position.claimableAmount ? (
          <div className="mb-3 text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Resolved P&amp;L</p>
            <p className={`font-mono text-lg font-bold ${pnlFormatted.colorClass}`}>{pnlFormatted.text}</p>
            <p className={`text-xs ${pctFormatted.colorClass}`}>{pctFormatted.text}</p>
          </div>
        ) : isCancelled ? (
          <p className="mb-3 text-sm text-yellow-500">Refund ${position.costBasis.toFixed(2)}</p>
        ) : (
          <div className="mb-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-xs text-gray-500">${position.costBasis.toFixed(2)}</span>
              <span className="font-mono text-sm font-semibold text-white">
                ${displayCurrentValue.toFixed(2)}
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <p className={`font-mono text-base font-bold ${pnlFormatted.colorClass}`}>
                {pnlFormatted.text}
              </p>
              <p className={`text-xs font-mono ${pctFormatted.colorClass}`}>{pctFormatted.text}</p>
            </div>
          </div>
        )}

        {isClaimable ? (
          <div className="rounded-lg border border-brand-green/30 bg-brand-green/15 py-2 text-center text-sm font-semibold text-brand-green">
            Claim ${position.claimableAmount?.toFixed(2)} →
          </div>
        ) : isCancelled ? (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 py-2 text-center text-sm font-semibold text-yellow-500">
            Claim refund →
          </div>
        ) : isTerminalStatic ? (
          <p className="text-center text-[10px] uppercase tracking-wider text-gray-600">Finalized</p>
        ) : (
          <ProbabilityDepthBar
            entry={position.entryPrice}
            current={live.lastPrice}
            side={position.side}
          />
        )}
      </button>

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
