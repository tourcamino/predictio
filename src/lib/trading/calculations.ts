import { calcFee, calcPriceImpact } from '~/utils/marketUtils';

/**
 * Calculate current value of a position
 */
export function calculatePositionValue(shares: number, currentPrice: number): number {
  return shares * currentPrice;
}

/**
 * Calculate unrealized P&L
 */
export function calculateUnrealizedPnL(
  shares: number,
  entryPrice: number,
  currentPrice: number
): { pnl: number; pnlPct: number } {
  const costBasis = shares * entryPrice;
  const currentValue = shares * currentPrice;
  const pnl = currentValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  return { pnl, pnlPct };
}

/**
 * Calculate new average entry price after adding to position
 */
export function calculateNewAvgEntry(
  existingShares: number,
  existingAvgPrice: number,
  newShares: number,
  newPrice: number
): number {
  const existingCost = existingShares * existingAvgPrice;
  const newCost = newShares * newPrice;
  const totalShares = existingShares + newShares;
  
  return totalShares > 0 ? (existingCost + newCost) / totalShares : 0;
}

/**
 * Calculate shares received for a given USDC amount at a price
 */
export function calculateSharesFromAmount(
  amountUSDC: number,
  price: number,
  includeFee: boolean = true
): { shares: number; fee: number; total: number } {
  const fee = includeFee ? amountUSDC * calcFee(price) : 0;
  const netAmount = amountUSDC - fee;
  const shares = netAmount / price;
  
  return {
    shares,
    fee,
    total: amountUSDC,
  };
}

/**
 * Calculate USDC received for selling shares at a price
 */
export function calculateAmountFromShares(
  shares: number,
  price: number,
  includeFee: boolean = false // Sells typically don't have fees
): { amount: number; fee: number; net: number } {
  const grossAmount = shares * price;
  const fee = includeFee ? grossAmount * calcFee(price) : 0;
  const netAmount = grossAmount - fee;
  
  return {
    amount: grossAmount,
    fee,
    net: netAmount,
  };
}

/**
 * Calculate price impact for a trade
 */
export function calculateTradeImpact(
  amountUSDC: number,
  poolSize: number
): number {
  return calcPriceImpact(amountUSDC, poolSize);
}

/**
 * Calculate slippage-adjusted price
 */
export function calculateSlippagePrice(
  basePrice: number,
  slippageBps: number,
  isBuy: boolean
): number {
  const slippagePct = slippageBps / 10000; // Convert bps to decimal
  
  if (isBuy) {
    // For buys, add slippage (max price we're willing to pay)
    return basePrice * (1 + slippagePct);
  } else {
    // For sells, subtract slippage (min price we're willing to accept)
    return basePrice * (1 - slippagePct);
  }
}

/**
 * Format P&L with sign and color class
 */
export function formatPnL(pnl: number): {
  text: string;
  colorClass: string;
  sign: string;
} {
  const isPositive = pnl >= 0;
  return {
    text: `${isPositive ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`,
    colorClass: isPositive ? 'text-brand-green' : 'text-red-500',
    sign: isPositive ? '+' : '',
  };
}

/**
 * Format percentage with sign
 */
export function formatPctChange(pct: number): {
  text: string;
  colorClass: string;
  sign: string;
} {
  const isPositive = pct >= 0;
  return {
    text: `${isPositive ? '+' : ''}${pct.toFixed(1)}%`,
    colorClass: isPositive ? 'text-brand-green' : 'text-red-500',
    sign: isPositive ? '+' : '',
  };
}
