import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Market, getSportMetadata } from '~/data/mockMarkets';
import { MiniSparkline } from './MiniSparkline';
import { PriceMovement } from './PriceMovement';
import { WatchlistButton } from './WatchlistButton';
import { MarketCountdown } from '../MarketCountdown';
import { getMarketStatus } from '~/utils/marketLifecycle';
import { COUNTRY_FLAG, getMarketCountryCode, isEliteMarket } from '~/config/marketGeo';
import {
  CURATED_PROTOCOL_FOOTER_LABEL,
  hasRealMarketSocialMetrics,
  shouldShowCuratedProtocolFooter,
} from '~/lib/curatedMarketPresentation';

interface MarketCardProps {
  market: Market;
  onClick: () => void;
}

export function MarketCard({ market, onClick }: MarketCardProps) {
  const sportMeta = getSportMetadata(market.sport);
  const lifecycleStatus = getMarketStatus(market);
  const countryCode = getMarketCountryCode(market);
  const flag = countryCode ? COUNTRY_FLAG[countryCode] : null;
  const elite = isEliteMarket(market);

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

  // Determine button label and status badge
  let statusBadge = null;
  let buttonLabel = 'Trade Now';
  
  if (lifecycleStatus === 'resolved') {
    const winner = market.result === 'yes' ? market.teamA : market.teamB;
    statusBadge = (
      <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs font-semibold rounded flex items-center gap-1">
        ✓ RESOLVED
      </span>
    );
    buttonLabel = 'View Result';
  } else if (lifecycleStatus === 'locked') {
    statusBadge = (
      <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-500 text-xs font-semibold rounded flex items-center gap-1">
        🔒 LOCKED
      </span>
    );
    buttonLabel = 'View Market';
  } else if (market.status === 'closing-soon') {
    statusBadge = (
      <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs font-semibold rounded flex items-center gap-1 animate-pulse">
        🔴 LIVE
      </span>
    );
  }

  return (
    <div
      onClick={onClick}
      data-tour="market-card"
      className="group bg-brand-bg border border-white/10 rounded-lg p-5 cursor-pointer transition-all duration-200 hover:border-brand-green hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-green/20 h-full flex flex-col"
    >
      {/* Low Liquidity Warning */}
      {market.liquidity && market.liquidity.totalPool < 5000 && lifecycleStatus === 'open' && (
        <div className="mb-3 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
          <span className="text-red-500 text-sm font-semibold">⚠ Low liquidity · High slippage</span>
        </div>
      )}

      {/* Header with Watchlist Button and Status Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`${sportMeta.bgColor} text-white text-xs font-semibold px-2.5 py-1 rounded`}
        >
          {sportMeta.emoji} {sportMeta.name.toUpperCase()}
        </span>
        <span className="text-xs text-gray-500 truncate flex items-center gap-1.5">
          {flag && <span className="text-sm leading-none">{flag}</span>}
          <span className="truncate">{market.league}</span>
          {elite && (
            <span className="ml-1 px-2 py-0.5 bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-[10px] font-bold rounded">
              GLOBAL
            </span>
          )}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <WatchlistButton marketId={market.id} variant="icon" size="sm" />
          {statusBadge}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-syne font-semibold text-lg mb-2 line-clamp-2">
        {market.teamA} vs {market.teamB}
      </h3>

      {/* Date/Time */}
      <div className="font-mono text-xs text-gray-500 mb-4">
        {market.start_time.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}{' '}
        ·{' '}
        {market.start_time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>

      {/* Resolved Result Banner */}
      {lifecycleStatus === 'resolved' && market.result && (
        <div className={`mb-4 px-3 py-2 rounded-lg border ${
          market.result === 'yes' 
            ? 'bg-green-500/20 border-green-500/40 text-green-400'
            : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
        }`}>
          <div className="text-sm font-semibold">
            {market.result === 'yes' ? `${market.teamA} Won` : `${market.teamB} Won`}
          </div>
        </div>
      )}

      {/* Locked Status Banner */}
      {lifecycleStatus === 'locked' && (
        <div className="mb-4 px-3 py-2 bg-orange-500/20 border border-orange-500/40 rounded-lg">
          <div className="text-sm font-semibold text-orange-400">
            Awaiting result
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Match in progress
          </div>
        </div>
      )}

      {/* YES/NO Price Display with Sparklines - Trader Style */}
      <div className="mb-4 flex-grow">
        <div className="grid grid-cols-2 gap-3">
          {/* YES Card */}
          <div className="relative bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-lg p-3 group-hover:border-green-500/50 transition-all overflow-hidden">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xs text-gray-400 mb-1">YES</div>
                <div className="font-mono font-bold text-2xl text-brand-green">
                  {Math.round(market.yesPrice * 100)}¢
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {yesPercent.toFixed(1)}%
                </div>
              </div>
              <PriceMovement percentA={yesPercent} />
            </div>
            <MiniSparkline
              percentA={yesPercent}
              className="w-full h-8 mt-1"
              color="#00FF87"
            />
          </div>

          {/* NO Card */}
          <div className="relative bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-lg p-3 group-hover:border-red-500/50 transition-all overflow-hidden">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xs text-gray-400 mb-1">NO</div>
                <div className="font-mono font-bold text-2xl text-red-500">
                  {Math.round(market.noPrice * 100)}¢
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {noPercent.toFixed(1)}%
                </div>
              </div>
              <PriceMovement percentA={noPercent} />
            </div>
            <MiniSparkline
              percentA={noPercent}
              className="w-full h-8 mt-1"
              color="#EF4444"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between font-mono text-xs text-gray-500 mb-2">
        {shouldShowCuratedProtocolFooter(market) ? (
          <span className="text-gray-500">{CURATED_PROTOCOL_FOOTER_LABEL}</span>
        ) : (
          <>
            <span>Volume: {formatVolume(market.volume)}</span>
            <span>·</span>
            <span>{market.traders} traders</span>
          </>
        )}
      </div>
      
      {/* Countdown - Only show for open markets */}
      {lifecycleStatus === 'open' && (
        <MarketCountdown market={market} variant="compact" />
      )}
    </div>
  );
}
