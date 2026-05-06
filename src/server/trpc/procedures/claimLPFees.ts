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

    let positions: any[] = [];
    
    if (claimAll) {
      // Claim all pending fees across all positions
      positions = await db.liquidityPosition.findMany({
        where: {
          userWallet: walletAddress,
          status: 'active',
          feesPending: {
            gt: 0,
          },
        },
      });
    } else if (positionId) {
      // Claim fees for specific position
      const position = await db.liquidityPosition.findUnique({
        where: { id: positionId },
      });

      if (!position) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "LP position not found",
        });
      }

      if (position.userWallet !== walletAddress) {
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

      positions = [position];
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
    let totalClaimed = 0;

    // Update all positions and record fees claimed
    for (const position of positions) {
      totalClaimed += position.feesPending;

      await db.liquidityPosition.update({
        where: { id: position.id },
        data: {
          feesPending: 0,
        },
      });

      // Record transaction for each position
      await db.transaction.create({
        data: {
          wallet: walletAddress,
          type: 'reward_claim',
          amount: position.feesPending,
          marketId: position.marketId,
          txHash,
          status: 'completed',
          metadata: {
            type: 'lp_fee_claim',
            positionId: position.id,
          },
        },
      });
    }

    return {
      success: true,
      txHash,
      amount: totalClaimed,
      positionsClaimed: positions.length,
      timestamp: timestamp.toISOString(),
      message: `Claimed $${totalClaimed.toFixed(2)} in LP fees`,
    };
  });
