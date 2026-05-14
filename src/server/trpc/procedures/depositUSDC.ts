import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import {
  creditWalletPoints,
  POINT_ACTION_VALUES,
} from "~/server/utils/pointsLedger";

const userCreateDefaults = (wallet: string, virtualBalance: number) => ({
  wallet,
  virtualBalance,
  totalPnl: 0,
  tradesCount: 0,
  firstSeen: new Date(),
  lastActive: new Date(),
  totalVolume: 0,
  predictions: 0,
  wins: 0,
  losses: 0,
});

export const depositUSDC = baseProcedure
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
        message: "Minimum deposit amount is $1 USDC",
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 350));

    if (Math.random() < 0.05) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Transaction failed. Please try again.",
      });
    }

    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const timestamp = new Date();
    const w = input.walletAddress.trim().toLowerCase();

    const user = await db.user.findUnique({
      where: { wallet: w },
      select: { virtualBalance: true },
    });
    const balanceBefore = user?.virtualBalance ?? 0;
    const balanceAfter = balanceBefore + input.amount;

    await db.$transaction([
      db.transaction.create({
        data: {
          wallet: w,
          type: "wallet_deposit",
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
      db.user.upsert({
        where: { wallet: w },
        create: userCreateDefaults(w, balanceAfter),
        update: {
          virtualBalance: balanceAfter,
          lastActive: new Date(),
        },
      }),
    ]);

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

    return {
      success: true,
      txHash,
      amount: input.amount,
      timestamp: timestamp.toISOString(),
      message: "Deposit successful",
      newBalance: balanceAfter,
    };
  });
