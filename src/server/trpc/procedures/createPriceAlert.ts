import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const createPriceAlert = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      marketId: z.string(),
      outcome: z.enum(['YES', 'NO']),
      targetPrice: z.number().min(0.01).max(0.99),
      direction: z.enum(['ABOVE', 'BELOW']),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const alert = await db.priceAlert.create({
        data: {
          walletAddress: input.walletAddress.toLowerCase(),
          marketId: input.marketId,
          outcome: input.outcome,
          targetPrice: input.targetPrice,
          direction: input.direction,
        },
      });

      return {
        success: true,
        alert,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create price alert",
      });
    }
  });
