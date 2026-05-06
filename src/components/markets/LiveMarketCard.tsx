import { TrendingUp, Users, ArrowRight } from 'lucide-react';
import { Market, SPORT_METADATA } from '~/data/mockMarkets';
import { PriceMovement } from './PriceMovement';
import { MiniSparkline } from './MiniSparkline';
import { MarketCountdown } from '../MarketCountdown';
import { getMarketStatus } from '~/utils/marketLifecycle';

interface LiveMarketCardProps {
  market: Market;
  onClick: () => void;
}

export function LiveMarketCard({ market, onClick }: LiveMarketCardProps) {
  const sportMeta = SPORT_METADATA[market.sport];
  const lifecycleStatus = getMarketStatus(market);

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

  // Status badge based on lifecycle
  let statusBadge = null;
  if (lifecycleStatus === 'resolved') {
    statusBadge = (
      <div className="absolute top-3 right-3 px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-bold rounded-full flex items-center gap-1">
        ✓ RESOLVED
      </div>
    );
  } else if (lifecycleStatus === 'locked') {
    statusBadge = (
      <div className="absolute top-3 right-3 px-2 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-500 text-xs font-bold rounded-full flex items-center gap-1">
        🔒 LOCKED
      </div>
    );
  } else if (market.volume > 100000) {
    statusBadge = (
      <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full flex items-center gap-1 animate-pulse-demo">
        <span className="text-orange-400 text-xs font-bold">🔥 HOT</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group relative bg-gradient-to-br from-brand-bg to-brand-navy/50 border border-white/10 rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-brand-green hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-green/20 overflow-hidden"
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer pointer-events-none" />
      
      {/* Status badge */}
      {statusBadge}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span
            className={`${sportMeta.bgColor} text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg`}
          >
            {sportMeta.emoji}
          </span>
          <span className="text-xs text-gray-400 font-medium truncate max-w-[150px]">{market.league}</span>
        </div>
      </div>

      {/* Low Liquidity Warning */}
      {market.liquidity && market.liquidity.totalPool < 5000 && lifecycleStatus === 'open' && (
        <div className="mb-3 px-2.5 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-1.5 animate-pulse">
          <span className="text-red-400 text-xs font-semibold">⚠ Low liquidity</span>
        </div>
      )}

      {/* Match Title */}
      <h3 className="font-syne font-bold text-base mb-4 line-clamp-1 group-hover:text-brand-green transition-colors relative z-10">
        {market.teamA} <span className="text-gray-500 font-normal">vs</span> {market.teamB}
      </h3>

      {/* Lifecycle Status Messages */}
      {lifecycleStatus === 'resolved' && market.result && (
        <div className={`mb-4 px-3 py-2 rounded-lg border relative z-10 ${
          market.result === 'yes' 
            ? 'bg-green-500/20 border-green-500/40 text-green-400'
            : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
        }`}>
          <div className="text-sm font-semibold">
            {market.result === 'yes' ? `${market.teamA} Won` : `${market.teamB} Won`}
          </div>
        </div>
      )}

      {lifecycleStatus === 'locked' && (
        <div className="mb-4 px-3 py-2 bg-orange-500/20 border border-orange-500/40 rounded-lg relative z-10">
          <div className="text-sm font-semibold text-orange-400">Awaiting result</div>
        </div>
      )}

      {/* Price Display with Sparklines - Trader Style */}
      <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
        {/* YES Card */}
        <div className="relative bg-gradient-to-br from-green-500/15 to-green-500/5 border border-green-500/40 rounded-lg p-3 group-hover:border-green-500/60 group-hover:shadow-lg group-hover:shadow-green-500/20 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1">YES</div>
                <div className="font-mono font-bold text-2xl text-brand-green leading-none">
                  {Math.round(market.yesPrice * 100)}¢
                </div>
              </div>
              <PriceMovement percentA={yesPercent} />
            </div>
            <div className="text-xs text-gray-400 mb-2">
              {yesPercent.toFixed(1)}% probability
            </div>
            <MiniSparkline
              percentA={yesPercent}
              className="w-full h-6"
              color="#00FF87"
            />
          </div>
        </div>

        {/* NO Card */}
        <div className="relative bg-gradient-to-br from-red-500/15 to-red-500/5 border border-red-500/40 rounded-lg p-3 group-hover:border-red-500/60 group-hover:shadow-lg group-hover:shadow-red-500/20 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1">NO</div>
                <div className="font-mono font-bold text-2xl text-red-500 leading-none">
                  {Math.round(market.noPrice * 100)}¢
                </div>
              </div>
              <PriceMovement percentA={noPercent} />
            </div>
            <div className="text-xs text-gray-400 mb-2">
              {noPercent.toFixed(1)}% probability
            </div>
            <MiniSparkline
              percentA={noPercent}
              className="w-full h-6"
              color="#EF4444"
            />
          </div>
        </div>
      </div>

      {/* Stats Footer - Enhanced */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 relative z-10 mb-3">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-brand-cyan" />
            <span className="font-mono text-gray-300">
              <span className="text-brand-cyan font-bold">{formatVolume(market.volume)}</span>
            </span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono text-gray-300 font-semibold">{market.traders.toLocaleString()}</span>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-brand-green group-hover:translate-x-1 transition-all" />
      </div>

      {/* Countdown */}
      {lifecycleStatus === 'open' && (
        <div className="relative z-10">
          <MarketCountdown market={market} variant="compact" />
        </div>
      )}
    </div>
  );
}
