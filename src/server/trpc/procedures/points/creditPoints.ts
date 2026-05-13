import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";

// Tier thresholds / calculateTier live in ~/server/utils/pointsLedger

export const creditPoints = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      actionType: z.enum([
        "WALLET_CONNECTED",
        "LP_WAITLIST_JOINED",
        "FIRST_TRADE",
        "TRADE_PLACED",
        "DAILY_LOGIN",
        "MARKET_RESOLVED_WIN",
        "LIQUIDITY_ADDED",
        "STREAK_7_DAYS",
        "STREAK_30_DAYS",
        "REFERRAL_CONVERTED",
        "TRADE_CLOSED",
        "DEPOSIT_COMPLETED",
        "WITHDRAW_COMPLETED",
      ]),
      metadata: z.record(z.any()).optional(),
      multiplier: z.number().default(1),
    }),
  )
  .mutation(async ({ input }) => {
    const { walletAddress, actionType, metadata, multiplier } = input;
    const normalizedAddress = walletAddress.toLowerCase();

    const basePoints = POINT_ACTION_VALUES[actionType];
    const points = Math.floor(basePoints * multiplier);

    const { newTotal, tier } = await creditWalletPoints(
      normalizedAddress,
      actionType,
      points,
      metadata || {},
    );

    console.log(
      `[Points] Credited ${points} pts to ${normalizedAddress} for ${actionType}. New total: ${newTotal} (${tier})`,
    );

    return {
      points,
      totalPoints: newTotal,
      tier,
    };
  });
