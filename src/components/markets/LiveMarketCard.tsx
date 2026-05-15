import { ArrowRight, TrendingUp, Users, Lock, Flame, Check } from 'lucide-react';
import { Market, getSportMetadata } from '~/data/mockMarkets';
import { PriceMovement } from './PriceMovement';
import { MiniSparkline } from './MiniSparkline';
import { MarketCountdown } from '../MarketCountdown';
import { getMarketStatus } from '~/utils/marketLifecycle';
import {
  CURATED_PROTOCOL_FOOTER_LABEL,
  isCuratedCatalogMarket,
} from '~/lib/curatedMarketPresentation';

interface LiveMarketCardProps {
  market: Market;
  onClick: () => void;
  /** Visual lift + ring for homepage hero cell only. */
  featured?: boolean;
}

export function LiveMarketCard({ market, onClick, featured = false }: LiveMarketCardProps) {
  const sportMeta = getSportMetadata(market.sport);
  const lifecycleStatus = getMarketStatus(market);
  const hasRealMetrics = (market.volume ?? 0) > 0 && (market.traders ?? 0) > 0;
  const isCurated = isCuratedCatalogMarket(market);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume}`;
  };

  const yesPercent = market.yesPrice * 100;
  const noPercent = market.noPrice * 100;

  let statusBadge: React.ReactNode = null;
  if (lifecycleStatus === 'resolved') {
    statusBadge = (
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gray-500/20 px-2 py-1 text-xs font-bold text-gray-400">
        <Check className="h-3 w-3" />
        RESOLVED
      </div>
    );
  } else if (lifecycleStatus === 'locked') {
    statusBadge = (
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/20 px-2 py-1 text-xs font-bold text-orange-500">
        <Lock className="h-3 w-3" />
        LOCKED
      </div>
    );
  } else if (market.volume > 100000) {
    statusBadge = (
      <div className="animate-pulse-demo absolute right-3 top-3 flex items-center gap-1 rounded-full border border-orange-500/30 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-2 py-1">
        <Flame className="h-3 w-3 text-orange-400" />
        <span className="text-xs font-bold text-orange-400">HOT</span>
      </div>
    );
  }

  const showLowLiquidity =
    !isCurated &&
    market.liquidity != null &&
    market.liquidity.totalPool < 5000 &&
    lifecycleStatus === 'open';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-brand-bg to-brand-navy/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-green hover:shadow-2xl hover:shadow-brand-green/20 ${
        featured ? 'ring-2 ring-brand-green/35 md:scale-[1.02]' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 animate-shimmer" />

      {statusBadge}

      <div className="relative z-10 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`${sportMeta.bgColor} rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-lg`}
          >
            {sportMeta.emoji}
          </span>
          <span className="max-w-[150px] truncate text-xs font-medium text-gray-400">{market.league}</span>
        </div>
      </div>

      {showLowLiquidity ? (
        <div className="relative z-10 mb-3 flex animate-pulse items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/20 px-2.5 py-1.5">
          <span className="text-xs font-semibold text-red-400">Low liquidity</span>
        </div>
      ) : null}

      <h3 className="relative z-10 mb-4 line-clamp-2 font-syne text-base font-bold transition-colors group-hover:text-brand-green">
        {market.teamA} <span className="font-normal text-gray-500">vs</span> {market.teamB}
      </h3>

      {lifecycleStatus === 'resolved' && market.result && (
        <div
          className={`relative z-10 mb-4 rounded-lg border px-3 py-2 ${
            market.result === 'yes'
              ? 'border-green-500/40 bg-green-500/20 text-green-400'
              : 'border-cyan-500/40 bg-cyan-500/20 text-cyan-400'
          }`}
        >
          <div className="text-sm font-semibold">
            {market.result === 'yes' ? `${market.teamA} won` : `${market.teamB} won`}
          </div>
        </div>
      )}

      {lifecycleStatus === 'locked' && (
        <div className="relative z-10 mb-4 rounded-lg border border-orange-500/40 bg-orange-500/20 px-3 py-2">
          <div className="text-sm font-semibold text-orange-400">Awaiting result</div>
        </div>
      )}

      <div className="relative z-10 mb-4 grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-lg border border-green-500/40 bg-gradient-to-br from-green-500/15 to-green-500/5 p-3 transition-all group-hover:border-green-500/60 group-hover:shadow-lg group-hover:shadow-green-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-400">YES</div>
                <div className="font-mono text-2xl font-bold leading-none text-brand-green">
                  {Math.round(market.yesPrice * 100)}¢
                </div>
              </div>
              <PriceMovement percentA={yesPercent} />
            </div>
            <div className="mb-2 text-xs text-gray-400">{yesPercent.toFixed(1)}% probability</div>
            <MiniSparkline percentA={yesPercent} className="h-6 w-full" color="#00FF87" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-red-500/40 bg-gradient-to-br from-red-500/15 to-red-500/5 p-3 transition-all group-hover:border-red-500/60 group-hover:shadow-lg group-hover:shadow-red-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-400">NO</div>
                <div className="font-mono text-2xl font-bold leading-none text-red-500">
                  {Math.round(market.noPrice * 100)}¢
                </div>
              </div>
              <PriceMovement percentA={noPercent} />
            </div>
            <div className="mb-2 text-xs text-gray-400">{noPercent.toFixed(1)}% probability</div>
            <MiniSparkline percentA={noPercent} className="h-6 w-full" color="#EF4444" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mb-3 flex items-center justify-between border-t border-white/10 pt-3">
        {hasRealMetrics ? (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-brand-cyan" />
              <span className="font-mono text-gray-300">
                <span className="font-bold text-brand-cyan">{formatVolume(market.volume)}</span>
              </span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              <span className="font-mono font-semibold text-gray-300">{market.traders.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <span className="text-xs font-medium text-gray-400">{CURATED_PROTOCOL_FOOTER_LABEL}</span>
        )}
        <ArrowRight className="h-4 w-4 text-gray-500 transition-all group-hover:translate-x-1 group-hover:text-brand-green" />
      </div>

      {lifecycleStatus === 'open' ? (
        <div className="relative z-10">
          <MarketCountdown market={market} variant="compact" />
        </div>
      ) : null}
    </div>
  );
}
