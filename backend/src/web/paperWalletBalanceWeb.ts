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

  const [readResult, openAgg] = await Promise.all([
    readPaperWalletBalance(prisma, wallet, "balance_read"),
    prisma.order.aggregate({
      where: { wallet, status: "open" },
      _sum: { amount: true },
    }),
  ]);

  const { virtualBalance, userCreated, repaired } = readResult;

  console.log(
    JSON.stringify({
      tag: "paper_balance_bootstrap",
      wallet,
      source: "express-web-route",
      route: "GET/POST paper-wallet-balance",
      newBalance: virtualBalance,
      userCreated,
      repaired,
    }),
  );

  return {
    virtualBalance,
    openPositionsCostBasis: openAgg._sum.amount ?? 0,
  };
}
