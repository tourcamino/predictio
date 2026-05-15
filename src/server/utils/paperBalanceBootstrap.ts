import { db } from "~/server/db";

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

/**
 * Repair zero paper balance when the wallet has never traded (wrong-network / failed sync edge cases).
 */
export async function ensurePaperBalanceForWallet(
  wallet: string,
  context: "sync" | "balance_read",
): Promise<{ virtualBalance: number; repaired: boolean; existingUser: boolean }> {
  const normalized = wallet.trim().toLowerCase();
  if (!normalized) {
    return { virtualBalance: 0, repaired: false, existingUser: false };
  }

  const user = await db.user.findUnique({
    where: { wallet: normalized },
    select: {
      virtualBalance: true,
      tradesCount: true,
    },
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
    db.order.count({ where: { wallet: normalized, status: "open" } }),
    db.transaction.count({ where: { wallet: normalized } }),
  ]);

  if (openOrders > 0 || ledgerRows > 0 || user.tradesCount > 0) {
    return { virtualBalance: 0, repaired: false, existingUser: true };
  }

  const updated = await db.user.update({
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

/** Upsert user when missing; repair zero balance when no trading history. */
export async function readPaperWalletBalance(
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

  const existingBefore = await db.user.findUnique({
    where: { wallet: normalized },
    select: { virtualBalance: true },
  });

  const user = await db.user.upsert({
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
    const repair = await ensurePaperBalanceForWallet(normalized, context);
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
