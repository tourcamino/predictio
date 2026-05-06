import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { FEE_ANALYST, TAKER_FEE_RATE } from "~/server/services/feeCalculation";

export const calculateAnalystRewards = baseProcedure
  .input(z.object({ wallet: z.string() }))
  .query(async ({ input }) => {
    const normalizedWallet = input.wallet.toLowerCase();
    
    // Get analyst profile
    const analyst = await db.analyst.findUnique({
      where: { wallet: normalizedWallet },
    });
    
    if (!analyst) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Analyst profile not found",
      });
    }

    // Get affiliate record which tracks pending rewards
    const affiliate = await db.affiliate.findUnique({
      where: { walletAddress: normalizedWallet },
    });

    if (!affiliate) {
      return {
        totalPendingRewards: 0,
        followerRewards: [],
        breakdown: {
          analystFees: 0,
          feeRate: FEE_ANALYST,
        },
      };
    }

    // Get all pending affiliate rewards for this analyst
    const affiliateRewards = await db.affiliateReward.findMany({
      where: {
        walletAddress: normalizedWallet,
        status: { in: ["pending", "pending_payment"] },
        rewardType: { in: ["analyst", "both"] },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate breakdown by follower
    const followerRewardsMap = new Map<string, {
      userWallet: string;
      volumeGenerated: number;
      feeGenerated: number;
      reward: number;
    }>();

    for (const reward of affiliateRewards) {
      // Get the trade to find the trader wallet
      const order = await db.order.findUnique({
        where: { id: reward.tradeId },
        select: { wallet: true },
      });

      if (!order) continue;

      const traderWallet = order.wallet;
      
      if (!followerRewardsMap.has(traderWallet)) {
        followerRewardsMap.set(traderWallet, {
          userWallet: traderWallet,
          volumeGenerated: 0,
          feeGenerated: 0,
          reward: 0,
        });
      }

      const followerData = followerRewardsMap.get(traderWallet)!;
      followerData.volumeGenerated += reward.volumeUsd;
      followerData.feeGenerated += reward.feeTotalUsd;
      followerData.reward += reward.rewardUsd;
    }

    const followerRewards = Array.from(followerRewardsMap.values());

    return {
      totalPendingRewards: affiliate.pendingRewardsUsd,
      followerRewards,
      breakdown: {
        analystFees: affiliate.pendingRewardsUsd,
        feeRate: FEE_ANALYST, // 35% of all fees
      },
    };
  });
