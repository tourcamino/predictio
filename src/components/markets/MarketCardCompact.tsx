import { Clock, TrendingUp, Flame, Zap } from 'lucide-react';
import { SeedMarket } from '~/data/seedMarkets';
import { formatCurrency } from '~/utils/marketUtils';
import { useState, useEffect } from 'react';
import { COUNTRY_FLAG, getMarketCountryCode, isEliteMarket } from '~/config/marketGeo';
import {
  CURATED_PROTOCOL_FOOTER_LABEL,
  hasRealMarketSocialMetrics,
  shouldShowCuratedProtocolFooter,
} from '~/lib/curatedMarketPresentation';
import type { AzuroMarket } from '~/services/azuro';

interface MarketCardCompactProps {
  market: SeedMarket;
  onClick: () => void;
  variant?: 'card' | 'list';
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft('Ended');
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      // Mark as urgent if less than 6 hours
      setIsUrgent(hours < 6);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return { timeLeft, isUrgent };
}

export function MarketCardCompact({ market, onClick, variant = 'card' }: MarketCardCompactProps) {
  const { timeLeft, isUrgent } = useCountdown(market.endsAt);
  const countryCode = getMarketCountryCode(market);
  const flag = countryCode ? COUNTRY_FLAG[countryCode] : null;
  const elite = isEliteMarket(market);
  
  const importanceScore = (market as AzuroMarket).importanceScore ?? 0;
  const isHot = hasRealMarketSocialMetrics(market)
    ? market.volume24h > 50_000
    : importanceScore >= 120;
  const isMoving = market.outcomes.some(o => Math.abs(o.price - 0.5) > 0.3); // Significant odds
  const isEndingSoon = isUrgent;
  
  const getStatusBadge = () => {
    if (market.status === 'live') {
      return (
        <span className="px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold rounded flex items-center gap-1 animate-pulse">
          🔴 LIVE
        </span>
      );
    }
    return null;
  };

  if (variant === 'list') {
    return (
      <div
        onClick={onClick}
        className="group bg-white/[0.03] border border-white/10 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:border-brand-green/50 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-brand-green/10"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Event Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm text-gray-500 uppercase tracking-wide font-semibold flex items-center gap-2">
                {flag && <span className="text-base leading-none">{flag}</span>}
                <span>{market.competition}</span>
              </span>
              {elite && (
                <span className="px-2 py-1 bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-xs font-bold rounded">
                  GLOBAL
                </span>
              )}
              {getStatusBadge()}
              {isHot && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold rounded">
                  <Flame className="w-3 h-3" /> Hot
                </span>
              )}
            </div>
            <h3 className="font-syne font-bold text-xl mb-1">
              {market.event.teams.join(' vs ')}
            </h3>
            
            {/* Social Proof */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
              {shouldShowCuratedProtocolFooter(market) ? (
                <span className="font-medium text-brand-cyan/90">{CURATED_PROTOCOL_FOOTER_LABEL}</span>
              ) : (
                <>
                  <span className="font-semibold">{formatCurrency(market.volume24h)} traded</span>
                  <span>•</span>
                  <span>{market.traders} traders</span>
                </>
              )}
            </div>
          </div>
          
          {/* Right: Outcomes */}
          <div className="flex-shrink-0 space-y-2">
            {market.outcomes.slice(0, 3).map((outcome) => (
              <div key={outcome.id} className="flex items-center gap-3">
                <div className="text-right min-w-[80px]">
                  <div className="text-xs text-gray-400 mb-0.5">{outcome.label}</div>
                  <div className="font-mono font-bold text-brand-green">
                    {(outcome.price * 100).toFixed(0)}%
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                  className="px-4 py-2 bg-brand-green text-brand-bg text-sm font-bold rounded-lg hover:bg-brand-green/90 transition-colors whitespace-nowrap"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Card variant - optimized for feed
  return (
    <div
      onClick={onClick}
      className="group bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-brand-green/50 hover:bg-white/[0.05] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-green/10 h-full flex flex-col"
    >
      {/* Header with badges */}
      <div className="p-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold truncate">
            {market.competition}
          </span>
          {getStatusBadge()}
        </div>
        
        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {isHot && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold rounded">
              <Flame className="w-3 h-3" /> Hot
            </span>
          )}
          {isMoving && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold rounded">
              <TrendingUp className="w-3 h-3" /> Moving
            </span>
          )}
          {isEndingSoon && (
            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold rounded">
              <Zap className="w-3 h-3" /> Ending Soon
            </span>
          )}
        </div>
      </div>

      {/* Teams - Large and Readable */}
      <div className="p-4 pb-3 flex-grow">
        <h3 className="font-syne font-bold text-xl sm:text-2xl mb-3 leading-tight">
          {market.event.teams[0]}
          <span className="text-gray-500 mx-2">vs</span>
          {market.event.teams.length > 1 ? market.event.teams[1] : ''}
        </h3>

        {/* Status: LIVE or Countdown */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Clock className="w-4 h-4" />
          <span className={isUrgent ? 'text-yellow-400 font-semibold' : ''}>
            {market.status === 'live' ? 'In Progress' : `Closes in ${timeLeft}`}
          </span>
        </div>

        {/* Outcomes - Simplified */}
        <div className="space-y-2">
          {market.outcomes.slice(0, 3).map((outcome) => (
            <div
              key={outcome.id}
              className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/10 hover:border-brand-green/50 transition-colors"
            >
              <span className="text-sm font-semibold truncate mr-3">{outcome.label}</span>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-mono text-base font-bold text-brand-green">
                  {(outcome.price * 100).toFixed(0)}%
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                  className="px-3 py-1.5 bg-brand-green text-brand-bg text-xs font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer - Social Proof (Leggero) */}
      <div className="px-4 py-3 bg-white/[0.02] border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-500">
          {shouldShowCuratedProtocolFooter(market) ? (
            <span className="font-medium text-brand-cyan/90">{CURATED_PROTOCOL_FOOTER_LABEL}</span>
          ) : (
            <>
              <span className="font-semibold">{formatCurrency(market.volume24h)} traded</span>
              <span>{market.traders} traders</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
