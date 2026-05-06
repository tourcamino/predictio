import { useEffect, useState } from 'react';
import { Clock, TrendingUp, Users, Zap } from 'lucide-react';
import { Market, SPORT_METADATA } from '~/data/mockMarkets';
import { MiniSparkline } from './MiniSparkline';
import { PriceMovement } from './PriceMovement';
import { getLiquidityLevel, formatCurrency } from '~/utils/marketUtils';

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        setTimeLeft('Closed');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

interface TrendingMarketCardProps {
  market: Market;
  onClick: () => void;
}

export function TrendingMarketCard({ market, onClick }: TrendingMarketCardProps) {
  const sportMeta = SPORT_METADATA[market.sport];
  const countdown = useCountdown(market.closesAt);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume}`;
  };

  // Determine if market is "hot" (high volume)
  const isHot = market.volume > 100000;

  const yesPercent = market.yesPrice * 100;
  const noPercent = market.noPrice * 100;

  return (
    <div
      onClick={onClick}
      className="group relative bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-brand-green/50 hover:shadow-2xl hover:shadow-brand-green/20 hover:-translate-y-1 h-full flex flex-col backdrop-blur-sm"
    >
      {/* Animated gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

      {/* Hot Badge */}
      {isHot && (
        <div className="absolute -top-3 -right-3 z-10 animate-pulse">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-full shadow-lg">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
            <span className="text-xs font-bold text-white tracking-wide">HOT</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span
            className={`${sportMeta.bgColor} text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg uppercase tracking-wide`}
          >
            {sportMeta.emoji} {sportMeta.name}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
          <Clock className="w-3.5 h-3.5 text-brand-green" />
          <span className="font-mono text-xs font-semibold text-brand-green">{countdown}</span>
        </div>
      </div>

      {/* League */}
      <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">{market.league}</div>

      {/* Title */}
      <h3 className="font-syne font-bold text-xl mb-5 line-clamp-2 group-hover:text-brand-green transition-colors leading-tight">
        {market.teamA} vs {market.teamB}
      </h3>

      {/* Low Liquidity Warning */}
      {market.liquidity && market.liquidity.totalPool < 5000 && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <span className="text-red-400 text-xs font-semibold">⚠ Low liquidity · High slippage</span>
        </div>
      )}

      {/* Main Price Display with Enhanced Design */}
      <div className="grid grid-cols-2 gap-3 mb-5 flex-grow">
        {/* YES Card */}
        <div className="relative bg-gradient-to-br from-green-500/20 via-green-500/10 to-transparent border-2 border-green-500/30 rounded-xl p-4 group-hover:border-green-500/50 group-hover:shadow-lg group-hover:shadow-green-500/20 transition-all overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,135,0.3),transparent_50%)]" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-1 font-bold uppercase tracking-wide">YES</div>
                <div className="font-mono font-black text-3xl text-brand-green mb-1 leading-none">
                  {Math.round(market.yesPrice * 100)}¢
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {yesPercent.toFixed(1)}% prob.
                </div>
              </div>
              <PriceMovement percentA={yesPercent} />
            </div>
            <div className="h-10 mt-3">
              <MiniSparkline
                percentA={yesPercent}
                className="w-full h-full"
                color="#00FF87"
              />
            </div>
          </div>
        </div>

        {/* NO Card */}
        <div className="relative bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent border-2 border-red-500/30 rounded-xl p-4 group-hover:border-red-500/50 group-hover:shadow-lg group-hover:shadow-red-500/20 transition-all overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.3),transparent_50%)]" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-1 font-bold uppercase tracking-wide">NO</div>
                <div className="font-mono font-black text-3xl text-red-500 mb-1 leading-none">
                  {Math.round(market.noPrice * 100)}¢
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {noPercent.toFixed(1)}% prob.
                </div>
              </div>
              <PriceMovement percentA={noPercent} />
            </div>
            <div className="h-10 mt-3">
              <MiniSparkline
                percentA={noPercent}
                className="w-full h-full"
                color="#EF4444"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Liquidity Indicator */}
      {market.liquidity && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Liquidity</span>
            <span className="text-sm font-mono font-bold text-brand-cyan">
              {formatCurrency(market.liquidity.totalPool)}
            </span>
          </div>
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full ${getLiquidityLevel(market.liquidity.totalPool).fillColor} transition-all duration-500`}
              style={{ width: `${getLiquidityLevel(market.liquidity.totalPool).fillPercent}%` }}
            />
          </div>
          <div className="mt-1.5">
            <span className={`text-xs font-semibold ${getLiquidityLevel(market.liquidity.totalPool).color}`}>
              {getLiquidityLevel(market.liquidity.totalPool).label}
            </span>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center justify-between text-xs mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-brand-cyan" />
            <span className="font-mono text-gray-400">
              <span className="text-brand-cyan font-bold">{formatVolume(market.volume)}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-gray-400">
              <span className="text-purple-400 font-bold">{market.traders.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Trade Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="w-full py-3.5 bg-gradient-to-r from-brand-green to-brand-cyan text-brand-bg font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-brand-green/40 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Trade Now →
      </button>
    </div>
  );
}
