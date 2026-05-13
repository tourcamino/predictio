import { useEffect, useState } from 'react';
import { Clock, MapPin, TrendingUp } from 'lucide-react';
import { Market, getSportMetadata } from '~/data/mockMarkets';

interface EventHeroProps {
  market: Market;
  location?: string;
}

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export function EventHero({ market, location }: EventHeroProps) {
  const sportMeta = getSportMetadata(market.sport);
  const countdown = useCountdown(market.closesAt);

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    }
    return `$${volume.toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Event Info */}
        <div className="lg:col-span-2">
          {/* Sport Badge */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`${sportMeta.bgColor} text-brand-bg text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wide`}>
              {sportMeta.emoji} {sportMeta.name}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">{market.league}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Semifinal</span>
          </div>

          {/* Title */}
          <h1 className="font-syne font-bold text-3xl md:text-4xl lg:text-5xl mb-4 animate-fade-in">
            {market.teamA} <span className="text-gray-500">vs</span> {market.teamB}
          </h1>

          {/* Event Details */}
          <div className="space-y-2 font-mono text-sm text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {market.closesAt.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })} · {market.closesAt.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </span>
            </div>
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-green/10 border border-brand-green/30 rounded">
              <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
              <span className="text-brand-green font-semibold text-sm uppercase tracking-wide">
                Open · Live Predictions
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{formatNumber(market.predictions ?? 0)} Predictions</span>
            </div>
            <span>·</span>
            <span>{formatVolume(market.volume)} USDC Volume</span>
            <span>·</span>
            <span>Resolves automatically</span>
          </div>
        </div>

        {/* Right Side - Countdown */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 border-2 border-brand-green/30 rounded-lg p-6 h-full flex flex-col justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-400 uppercase tracking-wide mb-3 font-semibold">
                Market Closes In
              </div>
              
              {countdown.isExpired ? (
                <div className="text-3xl font-mono font-bold text-red-500">CLOSED</div>
              ) : (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-brand-green tabular-nums">
                      {String(countdown.hours).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500 uppercase mt-1">HH</div>
                  </div>
                  <div className="text-3xl font-mono font-bold text-gray-500">:</div>
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-brand-green tabular-nums">
                      {String(countdown.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500 uppercase mt-1">MM</div>
                  </div>
                  <div className="text-3xl font-mono font-bold text-gray-500">:</div>
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-brand-green tabular-nums">
                      {String(countdown.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500 uppercase mt-1">SS</div>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 leading-relaxed">
                Resolution: Automatic via oracle
                <br />
                Powered by Azuro Protocol
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
