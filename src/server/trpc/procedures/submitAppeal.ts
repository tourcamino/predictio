import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const submitAppeal = baseProcedure
  .input(
    z.object({
      marketId: z.string(),
      walletAddress: z.string(),
      reason: z.string().min(10, "Reason must be at least 10 characters"),
      evidence: z.string().min(20, "Please provide detailed evidence"),
    })
  )
  .mutation(async ({ input }) => {
    const { marketId, walletAddress, reason, evidence } = input;

    // Check if market exists
    const market = await db.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Market not found",
      });
    }

    // Check if market is resolved
    if (market.status !== 'resolved') {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Can only appeal resolved markets",
      });
    }

    // Check if appeal window is still open (48 hours)
    if (market.resolvedAt) {
      const hoursSinceResolution = (Date.now() - market.resolvedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceResolution > 48) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Appeal window has closed (48 hours after resolution)",
        });
      }
    }

    // Check if user has already submitted an appeal for this market
    const existingAppeal = await db.appeal.findFirst({
      where: {
        marketId,
        userWallet: walletAddress,
      },
    });

    if (existingAppeal) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have already submitted an appeal for this market",
      });
    }

    // Create appeal
    const appeal = await db.appeal.create({
      data: {
        marketId,
        userWallet: walletAddress,
        reason,
        evidence,
        status: 'pending',
      },
    });

    return {
      success: true,
      appealId: appeal.id,
      message: "Appeal submitted successfully. Our team will review it within 72 hours.",
    };
  });
