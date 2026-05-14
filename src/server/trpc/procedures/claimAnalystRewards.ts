import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const claimAnalystRewards = baseProcedure
  .input(z.object({ wallet: z.string() }))
  .mutation(async ({ input }) => {
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

    if (!affiliate || affiliate.pendingRewardsUsd <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No pending rewards to claim",
      });
    }

    const claimAmount = affiliate.pendingRewardsUsd;

    // Get or create user account for the analyst
    let user = await db.user.findUnique({
      where: { wallet: normalizedWallet },
    });

    if (!user) {
      // Create user account if it doesn't exist
      user = await db.user.create({
        data: {
          wallet: normalizedWallet,
          virtualBalance: 0,
          totalPnl: 0,
          tradesCount: 0,
          firstSeen: new Date(),
          lastActive: new Date(),
        },
      });
    }

    const balanceBefore = user.virtualBalance;
    const balanceAfter = balanceBefore + claimAmount;

    // Process the claim in a transaction
    await db.$transaction([
      // Update affiliate: clear pending rewards
      db.affiliate.update({
        where: { walletAddress: normalizedWallet },
        data: {
          pendingRewardsUsd: 0,
          pendingRewardsEur: 0,
          lastPayoutAt: new Date(),
        },
      }),

      // Update analyst: sync pending rewards and increment total earned
      db.analyst.update({
        where: { wallet: normalizedWallet },
        data: {
          pendingRewards: 0,
          totalEarned: { increment: claimAmount },
        },
      }),

      // Mark all pending affiliate rewards as claimed
      db.affiliateReward.updateMany({
        where: {
          walletAddress: normalizedWallet,
          status: { in: ["pending", "pending_payment"] },
        },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      }),
      
      // Update user balance
      db.user.update({
        where: { wallet: normalizedWallet },
        data: {
          virtualBalance: balanceAfter,
          lastActive: new Date(),
        },
      }),
      
      // Create transaction record
      db.transaction.create({
        data: {
          wallet: normalizedWallet,
          type: "analyst_reward",
          amount: claimAmount,
          balanceBefore,
          balanceAfter,
          status: "completed",
          metadata: {
            source: "analyst_commission",
            rewardType: "analyst_fees",
          },
        },
      }),
    ]);

    console.log(`[Analyst Rewards] ${normalizedWallet} claimed $${claimAmount.toFixed(2)} in rewards`);

    return {
      success: true,
      amountClaimed: claimAmount,
      newBalance: balanceAfter,
    };
  });
