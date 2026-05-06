/**
 * Calculate taker fee - FIXED 1% always
 * Makers pay 0% fee
 * 
 * @returns Fixed fee rate of 0.01 (1%)
 */
/** Mid-price argument is ignored; fee is fixed at 1% for takers. */
export function calcFee(_midPrice?: number): number {
  return 0.01; // 1% fixed taker fee
}

/**
 * Fee split is now handled by the centralized fee calculation service
 * See src/server/services/feeCalculation.ts for the new 50/35/15 logic
 * 
 * @deprecated Use calculateFeeSplit from feeCalculation service instead
 */

/**
 * Determine if an order is a maker (adds liquidity) or taker (takes liquidity)
 * 
 * @param orderType - "MARKET" or "LIMIT"
 * @returns "MAKER" or "TAKER"
 */
export function getOrderRole(orderType: 'MARKET' | 'LIMIT'): 'MAKER' | 'TAKER' {
  return orderType === 'LIMIT' ? 'MAKER' : 'TAKER';
}

/**
 * Calculate fee for an order based on its type
 * Makers pay 0% fee
 * Takers pay fixed 1% fee
 * 
 * @param orderType - "MARKET" or "LIMIT"
 * @param amount - Order amount in USDC
 * @returns Fee amount in USDC
 */
export function calculateOrderFee(
  orderType: 'MARKET' | 'LIMIT',
  amount: number
): number {
  if (orderType === 'LIMIT') {
    return 0; // Makers pay no fee
  }
  
  const TAKER_FEE_RATE = 0.01; // 1% fixed
  return amount * TAKER_FEE_RATE;
}

/**
 * Calculate price impact for a trade
 * Uses simplified AMM formula: impact = amount / (poolSize + amount)
 * 
 * @param amountUSDC - Trade amount in USDC
 * @param poolSize - Total pool liquidity
 * @returns Price impact as decimal (e.g., 0.02 = 2%)
 */
export function calcPriceImpact(
  amountUSDC: number,
  poolSize: number
): number {
  if (poolSize <= 0) return 0;
  return amountUSDC / (poolSize + amountUSDC);
}

/**
 * Calculate market health score (0-100)
 * Based on liquidity, spread, volume, and bot status
 * 
 * @param liquidity - Total pool liquidity in USDC
 * @param spread - Current bid/ask spread as decimal
 * @param volume24h - 24-hour trading volume
 * @param botActive - Whether market maker bot is active
 * @returns Health score (0-100)
 */
export function calcMarketHealth(
  liquidity: number,
  spread: number,
  volume24h: number,
  botActive: boolean
): number {
  let score = 0;
  
  // Liquidity score (max 40 points)
  if (liquidity > 25000) score += 40;
  else if (liquidity > 5000) score += 20;
  
  // Spread score (max 30 points)
  if (spread < 0.03) score += 30;
  else if (spread < 0.06) score += 15;
  
  // Volume score (max 20 points)
  if (volume24h > 5000) score += 20;
  else if (volume24h > 1000) score += 10;
  
  // Bot active bonus (10 points)
  if (botActive) score += 10;
  
  return score;
}

/**
 * Get health status label and badge color based on score
 * 
 * @param score - Health score (0-100)
 * @returns Object with status label and color class
 */
export function getHealthStatus(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 80) {
    return {
      label: 'Healthy',
      color: 'text-green-500',
      bgColor: 'bg-green-500/20 border-green-500/30',
    };
  } else if (score >= 50) {
    return {
      label: 'Fair',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20 border-yellow-500/30',
    };
  } else {
    return {
      label: 'At risk',
      color: 'text-red-500',
      bgColor: 'bg-red-500/20 border-red-500/30',
    };
  }
}

/**
 * Get liquidity level label and color based on total pool size
 * 
 * @param liquidity - Total pool liquidity in USDC
 * @returns Object with level label and color class
 */
export function getLiquidityLevel(liquidity: number): {
  label: string;
  color: string;
  fillColor: string;
  fillPercent: number;
} {
  if (liquidity < 5000) {
    return {
      label: 'Low liquidity',
      color: 'text-red-500',
      fillColor: 'bg-red-500',
      fillPercent: Math.min((liquidity / 5000) * 100, 100),
    };
  } else if (liquidity < 25000) {
    return {
      label: 'Medium',
      color: 'text-yellow-500',
      fillColor: 'bg-yellow-500',
      fillPercent: Math.min(((liquidity - 5000) / 20000) * 100, 100),
    };
  } else {
    return {
      label: 'Deep',
      color: 'text-green-500',
      fillColor: 'bg-green-500',
      fillPercent: 100,
    };
  }
}

/**
 * Format currency value with optional K/M suffixes
 * 
 * @param value - Numeric value
 * @param compact - If true, use K/M suffixes for large numbers
 * @returns Formatted string
 */
export function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${Math.round(value)}`;
  }
  return `$${value.toLocaleString()}`;
}

/**
 * Download data as CSV file
 * 
 * @param data - Array of objects to convert to CSV
 * @param filename - Name of the file to download
 * @param headers - Optional custom headers (will use object keys if not provided)
 */
export function downloadCSV(
  data: Record<string, any>[],
  filename: string,
  headers?: string[]
): void {
  if (data.length === 0) return;

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Convert data to CSV rows
  const rows = data.map(row => 
    csvHeaders.map(header => {
      const value = row[header];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  // Combine headers and rows
  const csvContent = [csvHeaders.join(','), ...rows].join('\n');
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Calculate ROI (Return on Investment) percentage
 * 
 * @param profit - Net profit amount
 * @param investment - Initial investment amount
 * @returns ROI as percentage (e.g., 50 = 50%)
 */
export function calculateROI(profit: number, investment: number): number {
  if (investment <= 0) return 0;
  return (profit / investment) * 100;
}
