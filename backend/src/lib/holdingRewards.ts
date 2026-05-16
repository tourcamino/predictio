/**
 * Mirror of `src/systems/holdingRewards.ts` for Express read paths (backend tsc rootDir).
 */
const HOURS_IN_YEAR = 8760;
const HOURS_BEFORE_REWARDS = 48;

export interface HoldingRewardRate {
  rate: number;
  label: string;
  emoji: string;
}

export function getHoldingRewardRate(hoursHeld: number): HoldingRewardRate | null {
  if (hoursHeld < HOURS_BEFORE_REWARDS) return null;
  const daysHeld = hoursHeld / 24;
  if (daysHeld < 7) return { rate: 0.005, label: "0.5% rate", emoji: "🟢" };
  if (daysHeld < 14) return { rate: 0.01, label: "1.0% rate", emoji: "🟢" };
  return { rate: 0.015, label: "1.5% rate", emoji: "🚀" };
}

export function calculateHoldingReward(positionValue: number, hoursHeld: number): number {
  const rewardRate = getHoldingRewardRate(hoursHeld);
  if (!rewardRate) return 0;
  const eligibleHours = Math.max(0, hoursHeld - HOURS_BEFORE_REWARDS);
  let totalReward = 0;
  let remainingHours = eligibleHours;
  const tier1Hours = Math.min(remainingHours, 120);
  if (tier1Hours > 0) {
    totalReward += positionValue * (0.005 / HOURS_IN_YEAR) * tier1Hours;
    remainingHours -= tier1Hours;
  }
  const tier2Hours = Math.min(remainingHours, 168);
  if (tier2Hours > 0) {
    totalReward += positionValue * (0.01 / HOURS_IN_YEAR) * tier2Hours;
    remainingHours -= tier2Hours;
  }
  if (remainingHours > 0) {
    totalReward += positionValue * (0.015 / HOURS_IN_YEAR) * remainingHours;
  }
  return totalReward;
}

export function getTimeUntilRewardsStart(hoursHeld: number): string | null {
  if (hoursHeld >= HOURS_BEFORE_REWARDS) return null;
  const hoursRemaining = HOURS_BEFORE_REWARDS - hoursHeld;
  const hours = Math.floor(hoursRemaining);
  const minutes = Math.floor((hoursRemaining - hours) * 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function calculateDailyEarningRate(
  positions: Array<{ value: number; hoursHeld: number }>,
): number {
  let totalDailyReward = 0;
  for (const position of positions) {
    const rewardRate = getHoldingRewardRate(position.hoursHeld);
    if (rewardRate) {
      totalDailyReward += position.value * (rewardRate.rate / 365);
    }
  }
  return totalDailyReward;
}
