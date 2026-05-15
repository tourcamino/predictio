import { TrendingUp, Users, ArrowRight } from 'lucide-react';
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
}

export function LiveMarketCard({ market, onClick }: LiveMarketCardProps) {
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
      <span className="px-2 py-0.5 bg-white/10 border border-white/10 text-gray-400 text-[10px] font-semibold rounded uppercase">
        Resolved
      </span>
    );
  } else if (lifecycleStatus === 'locked') {
    statusBadge = (
      <span className="px-2 py-0.5 bg-white/10 border border-white/10 text-gray-400 text-[10px] font-semibold rounded uppercase">
        Locked
      </span>
    );
  } else if (market.volume > 100000) {
    statusBadge = (
      <span className="px-2 py-0.5 bg-white/10 border border-white/10 text-gray-400 text-[10px] font-semibold rounded uppercase">
        High volume
      </span>
    );
  }

  const badgeCount = (statusBadge ? 1 : 0) + (showLowLiquidity ? 1 : 0);

  return (
    <div
      onClick={onClick}
      className="group relative bg-brand-bg border border-white/10 rounded-xl p-5 cursor-pointer transition-colors hover:border-brand-green/30"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-white/10 text-white text-xs font-medium px-2 py-1 rounded border border-white/10">
            {sportMeta.emoji}
          </span>
          <span className="text-xs text-gray-500 font-medium truncate">{market.league}</span>
        </div>
        {badgeCount > 0 && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            {statusBadge}
            {showLowLiquidity && badgeCount <= 2 && (
              <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-medium rounded">
                Low liquidity
              </span>
            )}
          </div>
        )}
      </div>

      <h3 className="font-syne font-bold text-base mb-4 line-clamp-1 text-white group-hover:text-brand-green transition-colors">
        {market.teamA} <span className="text-gray-500 font-normal">vs</span> {market.teamB}
      </h3>

      {lifecycleStatus === 'resolved' && market.result && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="text-sm text-gray-400">
            {market.result === 'yes' ? `${market.teamA} won` : `${market.teamB} won`}
          </div>
        </div>
      )}

      {lifecycleStatus === 'locked' && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="text-sm text-gray-400">Awaiting result</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 group-hover:border-brand-green/40 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">YES</div>
              <div className="font-mono font-bold text-xl text-brand-green leading-none">
                {Math.round(market.yesPrice * 100)}¢
              </div>
            </div>
            <PriceMovement percentA={yesPercent} />
          </div>
          <div className="text-xs text-gray-500 mb-2">{yesPercent.toFixed(1)}%</div>
          <MiniSparkline percentA={yesPercent} className="w-full h-6" color="#00FF87" />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 group-hover:border-brand-green/40 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">NO</div>
              <div className="font-mono font-bold text-xl text-gray-300 leading-none">
                {Math.round(market.noPrice * 100)}¢
              </div>
            </div>
            <PriceMovement percentA={noPercent} />
          </div>
          <div className="text-xs text-gray-500 mb-2">{noPercent.toFixed(1)}%</div>
          <MiniSparkline percentA={noPercent} className="w-full h-6" color="#9CA3AF" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/10 mb-3">
        {hasRealMetrics ? (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-mono">{formatVolume(market.volume)}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="font-mono">{market.traders.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-500">{CURATED_PROTOCOL_FOOTER_LABEL}</span>
        )}
        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-brand-green transition-colors" />
      </div>

      {lifecycleStatus === 'open' && <MarketCountdown market={market} variant="compact" />}
    </div>
  );
}
