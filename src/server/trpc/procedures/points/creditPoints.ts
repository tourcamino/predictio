import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

// Point values for each action type
const POINTS_CONFIG = {
  WALLET_CONNECTED: 100,
  FIRST_TRADE: 500,
  TRADE_PLACED: 50,
  DAILY_LOGIN: 25,
  MARKET_RESOLVED_WIN: 200,
  LIQUIDITY_ADDED: 10, // per $10 USDC
  STREAK_7_DAYS: 350,
  STREAK_30_DAYS: 2000,
  REFERRAL_CONVERTED: 200,
} as const;

// Tier thresholds
const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  DIAMOND: 20000,
} as const;

function calculateTier(points: number): string {
  if (points >= TIER_THRESHOLDS.DIAMOND) return "DIAMOND";
  if (points >= TIER_THRESHOLDS.GOLD) return "GOLD";
  if (points >= TIER_THRESHOLDS.SILVER) return "SILVER";
  return "BRONZE";
}

export const creditPoints = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      actionType: z.enum([
        "WALLET_CONNECTED",
        "FIRST_TRADE",
        "TRADE_PLACED",
        "DAILY_LOGIN",
        "MARKET_RESOLVED_WIN",
        "LIQUIDITY_ADDED",
        "STREAK_7_DAYS",
        "STREAK_30_DAYS",
        "REFERRAL_CONVERTED",
      ]),
      metadata: z.record(z.any()).optional(),
      multiplier: z.number().default(1), // For liquidity (per $10 USDC)
    })
  )
  .mutation(async ({ input }) => {
    const { walletAddress, actionType, metadata, multiplier } = input;
    const normalizedAddress = walletAddress.toLowerCase();

    // Calculate points
    const basePoints = POINTS_CONFIG[actionType];
    const points = Math.floor(basePoints * multiplier);

    // Write to ledger
    await db.pointsLedger.create({
      data: {
        walletAddress: normalizedAddress,
        actionType,
        points,
        metadata: metadata || {},
      },
    });

    // Update or create total
    const existingTotal = await db.pointsTotal.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    const newTotal = (existingTotal?.totalPoints || 0) + points;
    const newTier = calculateTier(newTotal);

    const updatedTotal = await db.pointsTotal.upsert({
      where: { walletAddress: normalizedAddress },
      create: {
        walletAddress: normalizedAddress,
        totalPoints: newTotal,
        season: 1,
        tier: newTier,
      },
      update: {
        totalPoints: newTotal,
        tier: newTier,
      },
    });

    console.log(
      `[Points] Credited ${points} pts to ${normalizedAddress} for ${actionType}. New total: ${newTotal} (${newTier})`
    );

    return {
      points,
      totalPoints: updatedTotal.totalPoints,
      tier: updatedTotal.tier,
    };
  });
