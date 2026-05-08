import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";

export const withdrawUSDC = baseProcedure
  .input(
    z.object({
      amount: z.number().positive().max(1000000),
      walletAddress: z.string(),
      currentBalance: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    // Validate amount
    if (input.amount < 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Minimum withdrawal amount is $1 USDC",
      });
    }

    // Check sufficient balance
    if (input.amount > input.currentBalance) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Insufficient balance for withdrawal",
      });
    }

    await new Promise(resolve => setTimeout(resolve, 400));

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
    const balanceBefore = input.currentBalance;
    const balanceAfter = balanceBefore - input.amount;
    const w = input.walletAddress.toLowerCase();

    // Record transaction in database
    await db.transaction.create({
      data: {
        wallet: w,
        type: 'withdrawal',
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
        "WITHDRAW_COMPLETED",
        POINT_ACTION_VALUES.WITHDRAW_COMPLETED,
        { amount: input.amount },
      );
    } catch (err) {
      console.error("[Points] Failed to credit WITHDRAW_COMPLETED:", err);
    }

    // In a real app, we would:
    // 1. Verify the wallet signature
    // 2. Check user has no active predictions blocking withdrawal
    // 3. Interact with the USDC smart contract on Gnosis Chain
    // 4. Wait for transaction confirmation
    // 5. Update user balance in database
    // 6. Record transaction in transaction history

    return {
      success: true,
      txHash,
      amount: input.amount,
      timestamp: timestamp.toISOString(),
      message: "Withdrawal successful",
      newBalance: balanceAfter,
    };
  });
