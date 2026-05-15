import type { PrismaClient } from "@prisma/client";

export const PAPER_STARTING_BALANCE_USDC = 1000;

function logPaperBalanceBootstrap(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ tag: "paper_balance_bootstrap", ...payload }));
}

export async function ensurePaperBalanceForWallet(
  prisma: PrismaClient,
  wallet: string,
  context: "sync" | "balance_read",
): Promise<{ virtualBalance: number; repaired: boolean; existingUser: boolean }> {
  const normalized = wallet.trim().toLowerCase();
  if (!normalized) {
    return { virtualBalance: 0, repaired: false, existingUser: false };
  }

  const user = await prisma.user.findUnique({
    where: { wallet: normalized },
    select: { virtualBalance: true, tradesCount: true },
  });

  if (!user) {
    return { virtualBalance: 0, repaired: false, existingUser: false };
  }

  if (user.virtualBalance > 0) {
    return {
      virtualBalance: user.virtualBalance,
      repaired: false,
      existingUser: true,
    };
  }

  const [openOrders, ledgerRows] = await Promise.all([
    prisma.order.count({ where: { wallet: normalized, status: "open" } }),
    prisma.transaction.count({ where: { wallet: normalized } }),
  ]);

  if (openOrders > 0 || ledgerRows > 0 || user.tradesCount > 0) {
    return { virtualBalance: 0, repaired: false, existingUser: true };
  }

  const updated = await prisma.user.update({
    where: { wallet: normalized },
    data: { virtualBalance: PAPER_STARTING_BALANCE_USDC },
    select: { virtualBalance: true },
  });

  logPaperBalanceBootstrap({
    wallet: normalized,
    existingUser: true,
    createdDemoBalance: PAPER_STARTING_BALANCE_USDC,
    repaired: true,
    context,
  });

  return {
    virtualBalance: updated.virtualBalance,
    repaired: true,
    existingUser: true,
  };
}

export function logPaperBalanceBootstrapOnCreate(wallet: string) {
  logPaperBalanceBootstrap({
    wallet: wallet.trim().toLowerCase(),
    existingUser: false,
    createdDemoBalance: PAPER_STARTING_BALANCE_USDC,
  });
}
