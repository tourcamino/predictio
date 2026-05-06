import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

export const getPriceAlerts = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      marketId: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const where: any = {
      walletAddress: input.walletAddress.toLowerCase(),
      triggered: false, // Only return active alerts
    };

    if (input.marketId) {
      where.marketId = input.marketId;
    }

    const alerts = await db.priceAlert.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      alerts,
    };
  });
