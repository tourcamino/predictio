import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const claimHoldingRewards = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { walletAddress } = input;
    const wallet = walletAddress.toLowerCase();

    // Get user's pending rewards
    const user = await db.user.findUnique({
      where: { wallet },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const pendingRewards = user.pendingHoldingRewards;

    // Check minimum claim threshold
    if (pendingRewards < 0.01) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Minimum claim amount is $0.01 USDC",
      });
    }

    // Create reward claim transaction
    await db.transaction.create({
      data: {
        wallet,
        type: 'reward_claim',
        amount: pendingRewards,
        status: 'completed',
        metadata: {
          rewardType: 'holding_rewards',
          claimedAt: new Date().toISOString(),
        },
        feePaid: 0, // No fees on reward claims
      },
    });

    // Update user's rewards
    await db.user.update({
      where: { wallet },
      data: {
        pendingHoldingRewards: 0,
        claimedHoldingRewards: {
          increment: pendingRewards,
        },
      },
    });

    return {
      success: true,
      amountClaimed: pendingRewards,
      message: `Successfully claimed ${pendingRewards.toFixed(2)} USDC in holding rewards`,
    };
  });
