import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getWatchlist = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
    })
  )
  .query(async ({ input }) => {
    const watchlist = await db.watchlist.findMany({
      where: {
        walletAddress: input.walletAddress.toLowerCase(),
      },
      orderBy: {
        addedAt: 'desc',
      },
    });

    return {
      marketIds: watchlist.map(item => item.marketId),
      items: watchlist,
    };
  });
