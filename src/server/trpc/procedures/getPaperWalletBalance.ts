import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { readPaperWalletBalance } from "~/server/utils/paperBalanceBootstrap";

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

    const [{ virtualBalance }, openAgg] = await Promise.all([
      readPaperWalletBalance(wallet, "balance_read"),
      db.order.aggregate({
        where: { wallet, status: "open" },
        _sum: { amount: true },
      }),
    ]);

    return {
      virtualBalance,
      openPositionsCostBasis: openAgg._sum.amount ?? 0,
    };
  });
