/**
 * Calculate LP risk level based on pool size and volume
 * Low: pool > $50k, stable volume
 * Medium: pool $10k-$50k
 * High: pool < $10k or irregular volume
 */
export function calculateLPRisk(
  poolSize: number,
  volume24h: number
): 'low' | 'medium' | 'high' {
  if (poolSize > 50000 && volume24h > 5000) {
    return 'low';
  } else if (poolSize >= 10000) {
    return 'medium';
  }
  return 'high';
}

/**
 * Get risk badge styling
 */
export function getLPRiskBadge(risk: 'low' | 'medium' | 'high'): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (risk) {
    case 'low':
      return {
        label: 'Low',
        color: 'text-green-500',
        bgColor: 'bg-green-500/20 border-green-500/30',
      };
    case 'medium':
      return {
        label: 'Medium',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/20 border-yellow-500/30',
      };
    case 'high':
      return {
        label: 'High',
        color: 'text-red-500',
        bgColor: 'bg-red-500/20 border-red-500/30',
      };
  }
}

/**
 * Calculate estimated APY for LP position
 * APY = (fee30d / totalPool) * 12 * 0.70
 * LPs earn 70% of fees (30% goes to analysts)
 */
export function calculateLPAPY(
  poolSize: number,
  fees30d: number
): number {
  if (poolSize === 0) return 0;
  const monthlyReturn = (fees30d / poolSize) * 0.7;
  return monthlyReturn * 12 * 100;
}

/**
 * Calculate daily earnings estimate
 */
export function calculateDailyEarnings(
  deposit: number,
  poolSize: number,
  volume24h: number,
  avgFeeRate: number = 0.01
): number {
  if (poolSize === 0) return 0;
  const poolShare = deposit / poolSize;
  const dailyFees = volume24h * avgFeeRate;
  const lpShare = dailyFees * 0.7; // 70% goes to LPs
  return poolShare * lpShare;
}

/**
 * Calculate monthly earnings estimate
 */
export function calculateMonthlyEarnings(
  deposit: number,
  poolSize: number,
  volume24h: number,
  avgFeeRate: number = 0.01
): number {
  return calculateDailyEarnings(deposit, poolSize, volume24h, avgFeeRate) * 30;
}

/**
 * Calculate pool share percentage
 */
export function calculatePoolShare(
  deposit: number,
  currentPoolSize: number
): number {
  if (currentPoolSize === 0) return 0;
  return (deposit / (currentPoolSize + deposit)) * 100;
}

/**
 * Calculate LP concentration risk
 * High: top LP has > 30% of pool
 * Medium: top LP has 15-30% of pool
 * Low: top LP has < 15% of pool
 */
export function calculateConcentrationRisk(
  largestLPAmount: number,
  totalPoolSize: number
): 'low' | 'medium' | 'high' {
  if (totalPoolSize === 0) return 'low';
  const concentration = largestLPAmount / totalPoolSize;
  
  if (concentration > 0.3) return 'high';
  if (concentration > 0.15) return 'medium';
  return 'low';
}

/**
 * Get concentration risk badge styling
 */
export function getConcentrationRiskBadge(risk: 'low' | 'medium' | 'high'): {
  label: string;
  icon: string;
  color: string;
} {
  switch (risk) {
    case 'low':
      return {
        label: 'Low',
        icon: '✓',
        color: 'text-green-500',
      };
    case 'medium':
      return {
        label: 'Medium',
        icon: '⚠',
        color: 'text-yellow-500',
      };
    case 'high':
      return {
        label: 'High',
        icon: '⚠',
        color: 'text-red-500',
      };
  }
}

/**
 * Format time since LP position opened
 */
export function formatLPDuration(openSince: Date): string {
  const now = Date.now();
  const opened = openSince.getTime();
  const diffMs = now - opened;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
}
