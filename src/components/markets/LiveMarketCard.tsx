import { BarChart3, Users, ArrowRight } from 'lucide-react';
import { Market, getSportMetadata } from '~/data/mockMarkets';
import { PriceMovement } from './PriceMovement';
import { MiniSparkline } from './MiniSparkline';
import { MarketCountdown } from '../MarketCountdown';
import { getMarketStatus } from '~/utils/marketLifecycle';
import {
  CURATED_PROTOCOL_FOOTER_LABEL,
  isCuratedCatalogMarket,
} from '~/lib/curatedMarketPresentation';

export type LiveMarketCardVariant = 'featured' | 'standard' | 'compact';

function shortLabel(name: string, max = 18): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

interface LiveMarketCardProps {
  market: Market;
  onClick: () => void;
  /** `featured` = cover-story layout; `compact` = denser band row */
  variant?: LiveMarketCardVariant;
  /** Optional kicker, e.g. narrative band name */
  narrativeLabel?: string;
}

export function LiveMarketCard({
  market,
  onClick,
  variant = 'standard',
  narrativeLabel,
}: LiveMarketCardProps) {
  const sportMeta = getSportMetadata(market.sport);
  const lifecycleStatus = getMarketStatus(market);
  const hasRealMetrics = (market.volume ?? 0) > 0 && (market.traders ?? 0) > 0;

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume}`;
  };

  const yesPercent = market.yesPrice * 100;
  const noPercent = market.noPrice * 100;

  const showLowLiquidity =
    !isCuratedCatalogMarket(market) &&
    market.liquidity != null &&
    market.liquidity.totalPool < 5000 &&
    lifecycleStatus === 'open';

  let statusBadge: React.ReactNode = null;
  if (lifecycleStatus === 'resolved') {
    statusBadge = (
      <span className="text-[10px] font-medium text-gray-500 tracking-wide">Settled</span>
    );
  } else if (lifecycleStatus === 'locked') {
    statusBadge = (
      <span className="text-[10px] font-medium text-gray-500 tracking-wide">Awaiting outcome</span>
    );
  } else if (market.volume > 100000) {
    statusBadge = (
      <span className="text-[10px] font-medium text-gray-500 tracking-wide">Elevated flow</span>
    );
  }

  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  const shellClass = isFeatured
    ? 'rounded-2xl border-white/[0.12] bg-white/[0.02] p-6 sm:p-8 lg:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
    : isCompact
      ? 'rounded-xl border-white/[0.06] p-4'
      : 'rounded-xl border-white/[0.08] p-5';

  return (
    <div
      onClick={onClick}
      className={`group relative ${shellClass} border cursor-pointer transition-colors hover:border-white/20`}
    >
      {isFeatured && (
        <div className="mb-5">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[10px] font-semibold tracking-[0.22em] text-gray-500 uppercase">
              Editorial briefing
            </span>
            {narrativeLabel && (
              <>
                <span className="text-gray-700 hidden sm:inline">·</span>
                <span className="text-xs text-gray-400">{narrativeLabel}</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed m-0 max-w-2xl">
            Pool-implied consensus — for positioning context, not a research recommendation.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0">
          <span className="text-[11px] text-gray-500 font-medium">{sportMeta.name}</span>
          <span className="text-[11px] text-gray-600 truncate font-normal">{market.league}</span>
        </div>
        {(statusBadge || showLowLiquidity) && (
          <div className="flex flex-col items-end gap-1 shrink-0 text-right">
            {statusBadge}
            {showLowLiquidity && (
              <span className="text-[10px] text-gray-600">Thin book — wider impact</span>
            )}
          </div>
        )}
      </div>

      {!isFeatured && !isCompact && narrativeLabel && (
        <p className="text-[11px] text-gray-500 mb-3 m-0 leading-relaxed">{narrativeLabel}</p>
      )}

      <h3
        className={`font-syne font-semibold text-white leading-snug m-0 ${
          isFeatured
            ? 'text-xl sm:text-2xl lg:text-3xl mb-6 line-clamp-2'
            : isCompact
              ? 'text-sm mb-3 line-clamp-2'
              : 'text-[15px] sm:text-base mb-4 line-clamp-2'
        }`}
      >
        {market.teamA} <span className="text-gray-600 font-normal">vs</span> {market.teamB}
      </h3>

      {isFeatured && market.event && (
        <p className="text-sm text-gray-500 leading-relaxed mb-6 line-clamp-2">{market.event}</p>
      )}

      {lifecycleStatus === 'resolved' && market.result && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="text-sm text-gray-500">
            Outcome recorded · {market.result === 'yes' ? market.teamA : market.teamB}
          </div>
        </div>
      )}

      {lifecycleStatus === 'locked' && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="text-sm text-gray-500">Result pending · event in motion</div>
        </div>
      )}

      {isFeatured ? (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
          <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="text-[10px] text-gray-600 tracking-wide mb-2 leading-snug">
              Confidence signal · {shortLabel(market.teamA, 22)}
            </div>
            <div className="font-mono text-2xl sm:text-3xl text-brand-green/80 tabular-nums tracking-tight">
              {yesPercent.toFixed(1)}%
            </div>
            <MiniSparkline percentA={yesPercent} className="w-full h-5 mt-4 opacity-45" color="#00FF87" />
          </div>
          <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="text-[10px] text-gray-600 tracking-wide mb-2 leading-snug">
              Confidence signal · {shortLabel(market.teamB, 22)}
            </div>
            <div className="font-mono text-2xl sm:text-3xl text-gray-400 tabular-nums tracking-tight">
              {noPercent.toFixed(1)}%
            </div>
            <MiniSparkline percentA={noPercent} className="w-full h-5 mt-4 opacity-45" color="#9CA3AF" />
          </div>
        </div>
      ) : isCompact ? (
        <div className="flex items-end justify-between gap-4 mb-3 text-xs">
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">{shortLabel(market.teamA, 14)}</div>
            <div className="font-mono text-sm text-brand-green/85 tabular-nums">
              {yesPercent.toFixed(1)}%
            </div>
          </div>
          <div className="text-gray-700 pb-0.5">·</div>
          <div className="text-right">
            <div className="text-[10px] text-gray-600 mb-0.5">{shortLabel(market.teamB, 14)}</div>
            <div className="font-mono text-sm text-gray-400 tabular-nums">
              {noPercent.toFixed(1)}%
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors group-hover:border-white/10">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] text-gray-600 mb-1 leading-tight">
                  Confidence · {shortLabel(market.teamA, 12)}
                </div>
                <div className="font-mono font-semibold text-base text-brand-green/85 leading-none tabular-nums">
                  {yesPercent.toFixed(1)}%
                </div>
              </div>
              <PriceMovement percentA={yesPercent} />
            </div>
            <MiniSparkline percentA={yesPercent} className="w-full h-4 mt-2 opacity-70" color="#00FF87" />
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors group-hover:border-white/10">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] text-gray-600 mb-1 leading-tight">
                  Confidence · {shortLabel(market.teamB, 12)}
                </div>
                <div className="font-mono font-semibold text-base text-gray-400 leading-none tabular-nums">
                  {noPercent.toFixed(1)}%
                </div>
              </div>
              <PriceMovement percentA={noPercent} />
            </div>
            <MiniSparkline percentA={noPercent} className="w-full h-4 mt-2 opacity-70" color="#9CA3AF" />
          </div>
        </div>
      )}

      <div
        className={`flex items-center justify-between ${
          isFeatured ? 'pt-4 border-t border-white/[0.06]' : 'pt-3 border-t border-white/[0.06]'
        } ${isCompact ? 'mb-2' : 'mb-3'}`}
      >
        {hasRealMetrics ? (
          <div className="flex items-center gap-3 text-[11px] text-gray-600">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 opacity-70" />
              <span className="font-mono tabular-nums">{formatVolume(market.volume)}</span>
            </div>
            <div className="w-px h-3 bg-white/[0.06]" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 opacity-70" />
              <span className="font-mono tabular-nums">{market.traders.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-gray-600">{CURATED_PROTOCOL_FOOTER_LABEL}</span>
        )}
        <span className="flex items-center gap-1 text-[11px] text-gray-600 group-hover:text-gray-400">
          {isFeatured ? 'Read outlook' : isCompact ? 'Outlook' : 'View outlook'}
          <ArrowRight className="w-3.5 h-3.5 opacity-70" />
        </span>
      </div>

      {lifecycleStatus === 'open' && !isCompact && !isFeatured && (
        <MarketCountdown market={market} variant="compact" />
      )}
    </div>
  );
}
