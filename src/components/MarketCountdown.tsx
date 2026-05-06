import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Market } from '~/data/mockMarkets';
import { getMarketStatus, getTimeUntilLock, formatTimeRemaining } from '~/utils/marketLifecycle';

interface MarketCountdownProps {
  market: Market;
  variant?: 'compact' | 'prominent';
  className?: string;
}

export function MarketCountdown({ market, variant = 'compact', className = '' }: MarketCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeUntilLock(market));
  const [status, setStatus] = useState(getMarketStatus(market));

  useEffect(() => {
    // Update countdown every second
    const interval = setInterval(() => {
      const newTimeRemaining = getTimeUntilLock(market);
      const newStatus = getMarketStatus(market);
      
      setTimeRemaining(newTimeRemaining);
      setStatus(newStatus);
      
      // If market just locked, trigger status change
      if (newStatus === 'locked' && status === 'open') {
        // Market just locked - UI will update automatically via status change
        console.log(`[Market Lifecycle] Market ${market.id} just locked at kickoff`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [market, status]);

  // Don't show countdown for locked or resolved markets
  if (status !== 'open') {
    return null;
  }

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  const days = Math.floor(hours / 24);

  // Determine color and urgency
  const isVeryUrgent = hours < 1; // Less than 1 hour - RED
  const isUrgent = hours < 6 && hours >= 1; // Less than 6 hours - ORANGE
  const isCritical = minutes < 5 && hours === 0; // Less than 5 minutes - BLINKING RED

  // Format display based on time remaining
  let displayTime = '';
  if (days > 0) {
    displayTime = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    displayTime = `${hours}h ${minutes}m`;
  } else {
    displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Color classes
  const colorClass = isVeryUrgent 
    ? 'text-red-500' 
    : isUrgent 
    ? 'text-orange-500' 
    : 'text-gray-300';

  const bgColorClass = isVeryUrgent 
    ? 'bg-red-500/10 border-red-500/30' 
    : isUrgent 
    ? 'bg-orange-500/10 border-orange-500/30' 
    : 'bg-white/5 border-white/10';

  if (variant === 'prominent') {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className={`w-5 h-5 ${colorClass}`} />
            <span className="text-sm text-gray-400 font-medium uppercase tracking-wide">
              Trading closes in
            </span>
          </div>
          <div className={`font-mono text-5xl font-bold ${colorClass} ${isCritical ? 'animate-blink-slow' : ''}`}>
            {displayTime}
          </div>
          <div className="text-xs text-gray-500 mt-3 font-mono">
            Kickoff: {market.start_time.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          {isVeryUrgent && (
            <div className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg">
              <span className="text-red-400 text-sm font-semibold">
                ⚠️ Last chance to trade!
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${bgColorClass} rounded-lg border ${className}`}>
      <Clock className={`w-4 h-4 ${colorClass} ${isCritical ? 'animate-pulse' : ''}`} />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400">Closes in</span>
        <span className={`font-mono text-sm font-bold ${colorClass} ${isCritical ? 'animate-blink-slow' : ''}`}>
          {displayTime}
        </span>
      </div>
    </div>
  );
}
