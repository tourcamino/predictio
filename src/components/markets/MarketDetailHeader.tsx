import { useEffect, useState } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { Market, getSportMetadata } from '~/data/mockMarkets';
import { ShareButton } from '~/components/ShareButton';

interface MarketDetailHeaderProps {
  market: Market;
}

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
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export function MarketDetailHeader({ market }: MarketDetailHeaderProps) {
  const sportMeta = getSportMetadata(market.sport);
  const countdown = useCountdown(market.closesAt);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume}`;
  };

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6 mb-6">
      {/* Sport Badge & League */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`${sportMeta.bgColor} text-white text-sm font-semibold px-3 py-1.5 rounded`}
        >
          {sportMeta.emoji} {sportMeta.name.toUpperCase()}
        </span>
        <span className="text-sm text-gray-400">{market.league}</span>
        <span className="text-sm text-gray-500">·</span>
        <span className="text-sm text-gray-400">{market.region}</span>
      </div>

      {/* Teams */}
      <h1 className="font-syne font-bold text-3xl md:text-4xl mb-4">
        {market.teamA} <span className="text-gray-500">vs</span> {market.teamB}
      </h1>

      {/* Date/Time & Stats */}
      <div className="flex flex-wrap items-center gap-6 font-mono text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>
            {market.closesAt.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            at{' '}
            {market.closesAt.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
          <span className="text-brand-green font-semibold">Closes in {countdown}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span>Volume: {formatVolume(market.volume)}</span>
        </div>
        <div>
          <span>{(market.predictions ?? 0).toLocaleString()} predictions</span>
        </div>
      </div>

      {/* Share Button */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <ShareButton
          text={`${sportMeta.emoji} ${market.teamA} vs ${market.teamB}\n\n${market.league}\n\nCurrent odds: ${market.percentA ?? 0}% ${market.teamA} / ${market.percentB ?? 0}% ${market.teamB}\n\nMake your prediction on Predictio! 🎯`}
          marketId={market.id}
          variant="secondary"
          size="md"
        />
      </div>
    </div>
  );
}
