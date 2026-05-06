/**
 * Simplified Reward Engine
 * 
 * The old tier-based system (Bronze/Silver/Gold/Elite) has been removed.
 * Fee distribution is now handled by src/server/services/feeCalculation.ts
 * 
 * This file is kept for backward compatibility with existing code that
 * may reference these constants.
 */

// Fee constants (hardcoded - do not change)
export const FEE_VAULT = 0.50;      // 50% to Protocol Vault
export const FEE_ANALYST = 0.35;    // 35% to copied analyst
export const FEE_REFERRAL = 0.15;   // 15% to referral
export const TAKER_FEE_RATE = 0.01; // 1% taker fee (fixed)

// Payout threshold
export const PAYOUT_THRESHOLD_EUR = 10;

/**
 * @deprecated Tier system has been removed. All analysts earn 35% of fees.
 */
export const TIER_THRESHOLDS = {
  bronze: { followers: 0, volume: 0, roi: 0 },
  silver: { followers: 0, volume: 0, roi: 0 },
  gold: { followers: 0, volume: 0, roi: 0 },
  elite: { followers: 0, volume: 0, roi: 0 },
};

/**
 * @deprecated Tier system has been removed. All analysts earn 35% of fees.
 */
export const TIER_FEE_SHARE = {
  bronze: 0.35,
  silver: 0.35,
  gold: 0.35,
  elite: 0.35,
};

/**
 * @deprecated Tier system has been removed.
 */
export const TIER_COLORS = {
  bronze: "#CD7F32",
  silver: "#A0A0A0",
  gold: "#C0A020",
  elite: "#FFD700",
};
