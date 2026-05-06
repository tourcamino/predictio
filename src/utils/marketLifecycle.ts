import { Market } from '~/data/mockMarkets';

/**
 * Market lifecycle status type
 * - open: Trading is active, countdown visible
 * - locked: Match started, trading closed, awaiting result
 * - resolved: Match finished, result confirmed, payouts executed
 */
export type MarketLifecycleStatus = 'open' | 'locked' | 'resolved';

/**
 * Calculate real-time market status based on start_time and result
 * This is the core logic for the market lifecycle system
 * 
 * TODO CURSOR C1: This will eventually use Azuro GraphQL data:
 * - game.startsAt for start_time
 * - game.status and wonOutcomeIds for resolution
 * 
 * @param market - Market object with start_time and result fields
 * @returns Current lifecycle status
 */
export function getMarketStatus(market: Market): MarketLifecycleStatus {
  const now = new Date();
  
  // If market has a result, it's resolved
  if (market.result) {
    return 'resolved';
  }
  
  // If current time >= start_time, market is locked
  if (now >= market.start_time) {
    return 'locked';
  }
  
  // Otherwise, market is open
  return 'open';
}

/**
 * Check if a market is tradeable (open status)
 */
export function isMarketTradeable(market: Market): boolean {
  return getMarketStatus(market) === 'open';
}

/**
 * Get time remaining until market locks (in milliseconds)
 * Returns 0 if market is already locked or resolved
 */
export function getTimeUntilLock(market: Market): number {
  const status = getMarketStatus(market);
  if (status !== 'open') {
    return 0;
  }
  
  const now = new Date();
  const timeRemaining = market.start_time.getTime() - now.getTime();
  return Math.max(0, timeRemaining);
}

/**
 * Format time remaining for display
 * Returns formatted string like "2d 5h", "5h 23m", "23m 45s", etc.
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) {
    return 'Closed';
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
