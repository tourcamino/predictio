import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const addToWatchlist = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      marketId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const watchlistItem = await db.watchlist.create({
        data: {
          walletAddress: input.walletAddress.toLowerCase(),
          marketId: input.marketId,
        },
      });

      return {
        success: true,
        watchlistItem,
      };
    } catch (error: any) {
      // Handle unique constraint violation (already in watchlist)
      if (error.code === 'P2002') {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Market is already in your watchlist",
        });
      }
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add market to watchlist",
      });
    }
  });
