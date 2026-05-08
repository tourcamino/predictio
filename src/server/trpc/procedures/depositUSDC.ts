import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";

export const depositUSDC = baseProcedure
  .input(
    z.object({
      amount: z.number().positive().max(1000000),
      walletAddress: z.string(),
      currentBalance: z.number().optional(),
    })
  )
  .mutation(async ({ input }) => {
    // Validate amount
    if (input.amount < 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Minimum deposit amount is $1 USDC",
      });
    }

    await new Promise(resolve => setTimeout(resolve, 350));

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Transaction failed. Please try again.",
      });
    }

    // Generate mock transaction hash
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    const timestamp = new Date();
    const balanceBefore = input.currentBalance || 0;
    const balanceAfter = balanceBefore + input.amount;
    const w = input.walletAddress.toLowerCase();

    // Record transaction in database
    await db.transaction.create({
      data: {
        wallet: w,
        type: 'deposit',
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        txHash,
        status: 'completed',
        metadata: {
          method: 'usdc_transfer',
        },
      },
    });

    try {
      await creditWalletPoints(
        w,
        "DEPOSIT_COMPLETED",
        POINT_ACTION_VALUES.DEPOSIT_COMPLETED,
        { amount: input.amount },
      );
    } catch (err) {
      console.error("[Points] Failed to credit DEPOSIT_COMPLETED:", err);
    }

    // In a real app, we would:
    // 1. Verify the wallet signature
    // 2. Interact with the USDC smart contract on Gnosis Chain
    // 3. Wait for transaction confirmation
    // 4. Update user balance in database
    // 5. Record transaction in transaction history

    return {
      success: true,
      txHash,
      amount: input.amount,
      timestamp: timestamp.toISOString(),
      message: "Deposit successful",
      newBalance: balanceAfter,
    };
  });
