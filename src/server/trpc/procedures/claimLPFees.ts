import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const claimLPFees = baseProcedure
  .input(
    z.object({
      positionId: z.string().optional(),
      walletAddress: z.string(),
      claimAll: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }) => {
    const { positionId, walletAddress, claimAll } = input;

    const w = walletAddress.trim().toLowerCase();
    if (!w) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Wallet address is required",
      });
    }

    const walletVariants = [w, walletAddress.trim()].filter(
      (v, i, a) => v && a.indexOf(v) === i,
    );

    await db.user.upsert({
      where: { wallet: w },
      create: {
        wallet: w,
        virtualBalance: 1000.0,
        totalPnl: 0,
        tradesCount: 0,
        firstSeen: new Date(),
        lastActive: new Date(),
        totalVolume: 0,
        predictions: 0,
        wins: 0,
        losses: 0,
      },
      update: {
        lastActive: new Date(),
      },
    });

    let positions: { id: string; marketId: string; feesPending: number }[] = [];
    
    if (claimAll) {
      positions = await db.liquidityPosition.findMany({
        where: {
          userWallet: { in: walletVariants },
          status: 'active',
          feesPending: {
            gt: 0,
          },
        },
        select: { id: true, marketId: true, feesPending: true },
      });
    } else if (positionId) {
      const position = await db.liquidityPosition.findUnique({
        where: { id: positionId },
        select: { id: true, marketId: true, feesPending: true, userWallet: true, status: true },
      });

      if (!position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "LP position not found",
        });
      }

      if (position.userWallet.trim().toLowerCase() !== w) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      if (position.feesPending <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending fees to claim",
        });
      }

      positions = [
        {
          id: position.id,
          marketId: position.marketId,
          feesPending: position.feesPending,
        },
      ];
    } else {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Must specify positionId or claimAll",
      });
    }

    if (positions.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No pending fees to claim",
      });
    }

    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock transaction hash
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    const timestamp = new Date();

    const { totalClaimed, newBalance } = await db.$transaction(async (tx) => {
      const userRow = await tx.user.findUnique({ where: { wallet: w } });
      if (!userRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      let runningBalance = userRow.virtualBalance;
      let claimedSum = 0;

      for (const position of positions) {
        const feeAmount = position.feesPending;
        claimedSum += feeAmount;
        const balanceBefore = runningBalance;
        runningBalance += feeAmount;

        await tx.liquidityPosition.update({
          where: { id: position.id },
          data: {
            feesPending: 0,
            userWallet: w,
          },
        });

        await tx.transaction.create({
          data: {
            wallet: w,
            type: 'lp_reward_claim',
            amount: feeAmount,
            balanceBefore,
            balanceAfter: runningBalance,
            marketId: position.marketId,
            txHash,
            status: 'completed',
            metadata: {
              source: 'lp_fees',
              positionId: position.id,
            },
          },
        });
      }

      await tx.user.update({
        where: { wallet: w },
        data: {
          virtualBalance: runningBalance,
          lastActive: new Date(),
        },
      });

      return { totalClaimed: claimedSum, newBalance: runningBalance };
    });

    return {
      success: true,
      txHash,
      amount: totalClaimed,
      newBalance,
      positionsClaimed: positions.length,
      timestamp: timestamp.toISOString(),
      message: `Claimed $${totalClaimed.toFixed(2)} in LP fees`,
    };
  });
