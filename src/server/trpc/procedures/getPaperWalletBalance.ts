import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";

/**
 * Canonical **paper** USDC snapshot: `User.virtualBalance` (tradable cash) + cost basis in open orders.
 * `clientChainId` is cache scoping only (ignored for Prisma reads).
 */
export const getPaperWalletBalance = baseProcedure
  .input(
    z.object({
      walletAddress: z.string(),
      clientChainId: z.number().int(),
    }),
  )
  .query(async ({ input }) => {
    const wallet = input.walletAddress.trim().toLowerCase();
    if (!wallet) {
      return {
        virtualBalance: 0,
        openPositionsCostBasis: 0,
      };
    }

    const [user, openAgg] = await Promise.all([
      db.user.findUnique({
        where: { wallet },
        select: { virtualBalance: true },
      }),
      db.order.aggregate({
        where: { wallet, status: "open" },
        _sum: { amount: true },
      }),
    ]);

    const virtualBalance = user?.virtualBalance ?? 0;
    const openPositionsCostBasis = openAgg._sum.amount ?? 0;

    return {
      virtualBalance,
      openPositionsCostBasis,
    };
  });
