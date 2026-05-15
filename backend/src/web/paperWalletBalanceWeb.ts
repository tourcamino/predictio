import type { PrismaClient } from "@prisma/client";
import { readPaperWalletBalance } from "../services/paperBalanceBootstrap";

export async function runGetPaperWalletBalanceWeb(
  prisma: PrismaClient,
  walletAddress: string,
) {
  const wallet = walletAddress.trim().toLowerCase();
  if (!wallet) {
    return { virtualBalance: 0, openPositionsCostBasis: 0 };
  }

  const [{ virtualBalance }, openAgg] = await Promise.all([
    readPaperWalletBalance(prisma, wallet, "balance_read"),
    prisma.order.aggregate({
      where: { wallet, status: "open" },
      _sum: { amount: true },
    }),
  ]);

  return {
    virtualBalance,
    openPositionsCostBasis: openAgg._sum.amount ?? 0,
  };
}
