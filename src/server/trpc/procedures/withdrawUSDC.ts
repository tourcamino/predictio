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
      /** @deprecated Ignored — balance is read from `User.virtualBalance`. */
      currentBalance: z.number().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    if (input.amount < 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Minimum withdrawal amount is $1 USDC",
      });
    }

    const w = input.walletAddress.trim().toLowerCase();

    const user = await db.user.findUnique({
      where: { wallet: w },
      select: { virtualBalance: true },
    });
    if (!user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No paper wallet balance — connect and sync first.",
      });
    }
    const balanceBefore = user.virtualBalance;

    if (input.amount > balanceBefore) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Insufficient balance for withdrawal",
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 400));

    if (Math.random() < 0.05) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Transaction failed. Please try again.",
      });
    }

    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const timestamp = new Date();
    const balanceAfter = balanceBefore - input.amount;

    await db.$transaction([
      db.transaction.create({
        data: {
          wallet: w,
          type: "wallet_withdrawal",
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          txHash,
          status: "completed",
          metadata: {
            method: "usdc_transfer",
          },
        },
      }),
      db.user.update({
        where: { wallet: w },
        data: {
          virtualBalance: balanceAfter,
          lastActive: new Date(),
        },
      }),
    ]);

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

    return {
      success: true,
      txHash,
      amount: input.amount,
      timestamp: timestamp.toISOString(),
      message: "Withdrawal successful",
      newBalance: balanceAfter,
    };
  });
