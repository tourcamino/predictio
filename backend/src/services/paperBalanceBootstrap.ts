import type { PrismaClient } from "@prisma/client";

export const PAPER_STARTING_BALANCE_USDC = 1000;

const userCreateDefaults = (wallet: string) => ({
  wallet,
  virtualBalance: PAPER_STARTING_BALANCE_USDC,
  totalPnl: 0,
  tradesCount: 0,
  firstSeen: new Date(),
  lastActive: new Date(),
  totalVolume: 0,
  predictions: 0,
  wins: 0,
  losses: 0,
});

function logPaperBalanceBootstrap(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ tag: "paper_balance_bootstrap", ...payload }));
}

function logPaperBalanceRead(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ tag: "paper_balance_read", ...payload }));
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

/**
 * Canonical paper wallet read: upsert user when missing, repair zero balance when no trading history.
 * Idempotent — safe on every balance_read and parallel with sync.
 */
export async function readPaperWalletBalance(
  prisma: PrismaClient,
  wallet: string,
  context: "sync" | "balance_read",
): Promise<{
  virtualBalance: number;
  userCreated: boolean;
  repaired: boolean;
}> {
  const normalized = wallet.trim().toLowerCase();
  if (!normalized) {
    return { virtualBalance: 0, userCreated: false, repaired: false };
  }

  const existingBefore = await prisma.user.findUnique({
    where: { wallet: normalized },
    select: { virtualBalance: true },
  });

  const user = await prisma.user.upsert({
    where: { wallet: normalized },
    create: userCreateDefaults(normalized),
    update: { lastActive: new Date() },
    select: { virtualBalance: true },
  });

  const userCreated = !existingBefore;
  if (userCreated) {
    logPaperBalanceBootstrap({
      wallet: normalized,
      existingUser: false,
      createdDemoBalance: PAPER_STARTING_BALANCE_USDC,
      context,
    });
  }

  let virtualBalance = user.virtualBalance;
  let repaired = false;
  if (virtualBalance <= 0) {
    const repair = await ensurePaperBalanceForWallet(prisma, normalized, context);
    virtualBalance = repair.virtualBalance;
    repaired = repair.repaired;
  }

  logPaperBalanceRead({
    wallet: normalized,
    virtualBalance,
    userCreated,
    repaired,
    context,
  });

  return { virtualBalance, userCreated, repaired };
}

export function logPaperBalanceBootstrapOnCreate(wallet: string) {
  logPaperBalanceBootstrap({
    wallet: wallet.trim().toLowerCase(),
    existingUser: false,
    createdDemoBalance: PAPER_STARTING_BALANCE_USDC,
  });
}

export async function collectPaperWalletDiagnostics(prisma: PrismaClient) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [paperWallets, zeroBalanceWallets, bootstrappedToday] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { virtualBalance: { lte: 0 } } }),
    prisma.user.count({
      where: {
        firstSeen: { gte: startOfToday },
        virtualBalance: PAPER_STARTING_BALANCE_USDC,
      },
    }),
  ]);

  return { paperWallets, zeroBalanceWallets, bootstrappedToday };
}
