/**
 * Hard reset of **paper-trading-related** DB rows for exactly one wallet that appears in
 * `PREDICTIO_PAPER_RESET_ALLOWLIST` (comma-separated lowercase addresses).
 *
 * Safety:
 * - Refuses to run if the wallet argument is not in the allowlist.
 * - Does not touch global tables (Market, VaultState, VaultAllocation, AmmOrder, …).
 * - Does not delete `Analyst` / `Affiliate` identity rows (referral codes, public profiles).
 *
 * Run (from repo root, with DATABASE_URL in `.env`):
 *   node --env-file=.env --import tsx ./src/server/scripts/resetPaperTestWallet.ts 0xYourTestWallet
 *
 * Env:
 *   PREDICTIO_PAPER_RESET_ALLOWLIST — required. Example: `0xabc...,0xdef...` (lowercase).
 *   PAPER_RESET_TRADING_USDC — optional, default `1000` (paper playground target).
 *   PAPER_RESET_LP_TEST_TOPUP — optional, default `10000` (extra USDC on same balance; see docs).
 *
 * Browser: clear guest demo + trading UI cache (localStorage keys in `docs/PAPER_TEST_WALLET_RESET.md`).
 */
import { db } from "~/server/db";

const DEFAULT_TRADING_USDC = 1000;
const DEFAULT_LP_TOPUP = 10_000;

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function parseArgWallet(): string {
  const a = process.argv[2]?.trim();
  if (!a) {
    console.error(
      "Usage: node --env-file=.env --import tsx ./src/server/scripts/resetPaperTestWallet.ts <0xWallet>",
    );
    process.exit(1);
  }
  return a.toLowerCase();
}

function parseFloatEnv(name: string, fallback: number): number {
  const v = process.env[name]?.trim();
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    console.warn(`[reset] Invalid ${name}, using fallback ${fallback}`);
    return fallback;
  }
  return n;
}

async function main() {
  const wallet = parseArgWallet();
  const allow = parseAllowlist(process.env.PREDICTIO_PAPER_RESET_ALLOWLIST);
  if (allow.size === 0) {
    console.error(
      "[reset] Set PREDICTIO_PAPER_RESET_ALLOWLIST to a comma-separated list of lowercase test wallets.",
    );
    process.exit(1);
  }
  if (!allow.has(wallet)) {
    console.error(
      `[reset] Wallet ${wallet} is not in PREDICTIO_PAPER_RESET_ALLOWLIST. Refusing to run.`,
    );
    process.exit(1);
  }

  const tradingUsd = parseFloatEnv("PAPER_RESET_TRADING_USDC", DEFAULT_TRADING_USDC);
  const lpTopup = parseFloatEnv("PAPER_RESET_LP_TEST_TOPUP", DEFAULT_LP_TOPUP);
  const newBalance = tradingUsd + lpTopup;

  console.log(`[reset] Target wallet: ${wallet}`);
  console.log(
    `[reset] New virtualBalance = ${newBalance} (${tradingUsd} paper trading + ${lpTopup} LP test top-up on same User row — see docs).`,
  );

  const countsBefore = {
    orders: await db.order.count({ where: { wallet } }),
    transactions: await db.transaction.count({ where: { wallet } }),
    lp: await db.liquidityPosition.count({ where: { userWallet: wallet } }),
    copyAsCopier: await db.copyRelationship.count({ where: { copierWallet: wallet } }),
  };
  console.log("[reset] Before:", JSON.stringify(countsBefore));

  await db.$transaction(async (tx) => {
    // Ledger / exposure first (no FK from Order to Transaction in schema, but safe order).
    await tx.transaction.deleteMany({ where: { wallet } });
    await tx.order.deleteMany({ where: { wallet } });

    await tx.liquidityPosition.deleteMany({ where: { userWallet: wallet } });
    await tx.copyRelationship.deleteMany({ where: { copierWallet: wallet } });

    await tx.notification.deleteMany({ where: { walletAddress: wallet } });
    await tx.watchlist.deleteMany({ where: { walletAddress: wallet } });
    await tx.priceAlert.deleteMany({ where: { walletAddress: wallet } });
    await tx.pointsLedger.deleteMany({ where: { walletAddress: wallet } });
    await tx.pointsTotal.deleteMany({ where: { walletAddress: wallet } });
    await tx.leaderboard.deleteMany({ where: { walletAddress: wallet } });
    await tx.analystFollow.deleteMany({ where: { userWallet: wallet } });
    await tx.appeal.deleteMany({ where: { userWallet: wallet } });
    await tx.referralTracking.deleteMany({ where: { referredWallet: wallet } });
    await tx.affiliateReward.deleteMany({ where: { walletAddress: wallet } });
    await tx.payoutLog.deleteMany({ where: { walletAddress: wallet } });
    await tx.lPWaitlist.deleteMany({ where: { walletAddress: wallet } });

    await tx.user.upsert({
      where: { wallet },
      create: {
        wallet,
        virtualBalance: newBalance,
        totalPnl: 0,
        tradesCount: 0,
        predictions: 0,
        wins: 0,
        losses: 0,
        totalVolume: 0,
        pendingHoldingRewards: 0,
        claimedHoldingRewards: 0,
      },
      update: {
        virtualBalance: newBalance,
        totalPnl: 0,
        tradesCount: 0,
        predictions: 0,
        wins: 0,
        losses: 0,
        totalVolume: 0,
        pendingHoldingRewards: 0,
        claimedHoldingRewards: 0,
        lastActive: new Date(),
      },
    });
  });

  const countsAfter = {
    orders: await db.order.count({ where: { wallet } }),
    transactions: await db.transaction.count({ where: { wallet } }),
    lp: await db.liquidityPosition.count({ where: { userWallet: wallet } }),
    copyAsCopier: await db.copyRelationship.count({ where: { copierWallet: wallet } }),
    userBalance: (await db.user.findUnique({ where: { wallet }, select: { virtualBalance: true } }))
      ?.virtualBalance,
  };
  console.log("[reset] After:", JSON.stringify(countsAfter));
  console.log("[reset] Done. Clear browser localStorage for this origin (see docs/PAPER_TEST_WALLET_RESET.md).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
