/**
 * Holding Rewards System
 * 
 * Users earn passive rewards for holding positions open for 48+ hours.
 * Rates are annualized and accrue hourly:
 * - Days 1-2 (< 48h): No rewards
 * - Days 3-7: 0.5% annualized
 * - Days 8-14: 1.0% annualized
 * - Days 15+: 1.5% annualized
 */

const HOURS_IN_YEAR = 8760;
const HOURS_BEFORE_REWARDS = 48;

export interface HoldingRewardRate {
  rate: number; // Annualized rate (e.g., 0.005 = 0.5%)
  label: string;
  emoji: string;
}

export function getHoldingRewardRate(hoursHeld: number): HoldingRewardRate | null {
  if (hoursHeld < HOURS_BEFORE_REWARDS) {
    return null; // No rewards yet
  }
  
  const daysHeld = hoursHeld / 24;
  
  if (daysHeld < 7) {
    return {
      rate: 0.005, // 0.5% annualized
      label: '0.5% rate',
      emoji: '🟢',
    };
  } else if (daysHeld < 14) {
    return {
      rate: 0.01, // 1.0% annualized
      label: '1.0% rate',
      emoji: '🟢',
    };
  } else {
    return {
      rate: 0.015, // 1.5% annualized
      label: '1.5% rate',
      emoji: '🚀',
    };
  }
}

export function calculateHoldingReward(
  positionValue: number,
  hoursHeld: number
): number {
  const rewardRate = getHoldingRewardRate(hoursHeld);
  
  if (!rewardRate) {
    return 0;
  }
  
  // Calculate hours eligible for rewards (subtract the first 48 hours)
  const eligibleHours = Math.max(0, hoursHeld - HOURS_BEFORE_REWARDS);
  
  // Calculate tiered rewards based on holding duration
  let totalReward = 0;
  let remainingHours = eligibleHours;
  
  // First tier: hours 48-168 (days 2-7) at 0.5%
  const tier1Hours = Math.min(remainingHours, 120); // 168 - 48 = 120 hours
  if (tier1Hours > 0) {
    const hourlyRate = 0.005 / HOURS_IN_YEAR;
    totalReward += positionValue * hourlyRate * tier1Hours;
    remainingHours -= tier1Hours;
  }
  
  // Second tier: hours 168-336 (days 7-14) at 1.0%
  const tier2Hours = Math.min(remainingHours, 168); // 336 - 168 = 168 hours
  if (tier2Hours > 0) {
    const hourlyRate = 0.01 / HOURS_IN_YEAR;
    totalReward += positionValue * hourlyRate * tier2Hours;
    remainingHours -= tier2Hours;
  }
  
  // Third tier: hours 336+ (days 14+) at 1.5%
  if (remainingHours > 0) {
    const hourlyRate = 0.015 / HOURS_IN_YEAR;
    totalReward += positionValue * hourlyRate * remainingHours;
  }
  
  return totalReward;
}

export function getTimeUntilRewardsStart(hoursHeld: number): string | null {
  if (hoursHeld >= HOURS_BEFORE_REWARDS) {
    return null; // Rewards already started
  }
  
  const hoursRemaining = HOURS_BEFORE_REWARDS - hoursHeld;
  const hours = Math.floor(hoursRemaining);
  const minutes = Math.floor((hoursRemaining - hours) * 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function calculateDailyEarningRate(
  positions: Array<{ value: number; hoursHeld: number }>
): number {
  let totalDailyReward = 0;
  
  for (const position of positions) {
    const rewardRate = getHoldingRewardRate(position.hoursHeld);
    if (rewardRate) {
      // Convert annualized rate to daily
      const dailyRate = rewardRate.rate / 365;
      totalDailyReward += position.value * dailyRate;
    }
  }
  
  return totalDailyReward;
}
