import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const removeFromWatchlist = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      marketId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db.watchlist.deleteMany({
        where: {
          walletAddress: input.walletAddress.toLowerCase(),
          marketId: input.marketId,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to remove market from watchlist",
      });
    }
  });
