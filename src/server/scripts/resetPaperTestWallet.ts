/**
 * Hard reset of **paper-trading-related** DB rows for exactly one wallet in
 * `PREDICTIO_PAPER_RESET_ALLOWLIST` (comma-separated lowercase addresses).
 *
 * Safety:
 * - Refuses to run if the wallet argument is not in the allowlist.
 * - Does not touch global tables (Market, VaultState, VaultAllocation, AmmOrder, …).
 * - Keeps `Analyst` / `Affiliate` identity rows; zeros per-wallet stats and copy edges.
 *
 * Run (from repo root, with DATABASE_URL in `.env`):
 *   node --env-file=.env --import tsx ./src/server/scripts/resetPaperTestWallet.ts 0xYourTestWallet
 *
 * Env:
 *   PREDICTIO_PAPER_RESET_ALLOWLIST — required. Example: `0xabc...,0xdef...` (lowercase).
 *   PAPER_RESET_TRADING_USDC — optional, default `1000`.
 *   PAPER_RESET_LP_TEST_TOPUP — optional, default `0` (set e.g. `10000` only if you want extra LP demo liquidity on the same virtual balance).
 *   PREDICTIO_RESET_VERBOSE — optional `1` for extra row counts in logs.
 *
 * Browser: optional `clearPaperWalletClientCache(addr)` from `~/utils/clearPaperWalletClientCache`
 * or clear keys listed in `docs/PAPER_TEST_WALLET_RESET.md`.
 */
import { runPaperWalletHardReset } from "~/server/services/paperWalletHardReset";
import { db } from "~/server/db";

const DEFAULT_TRADING_USDC = 1000;
const DEFAULT_LP_TOPUP = 0;

const FOUNDER_SAMPLE = "0x7f3a8b2c4e2b9f1a6d5c8e7f9a2b4c6d8e0f1a3b";

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
  const verbose = process.env.PREDICTIO_RESET_VERBOSE === "1";
  const founderTrace = wallet === FOUNDER_SAMPLE;

  console.log(`[reset] === PAPER HARD RESET START === wallet=${wallet}`);
  console.log(
    `[reset] Target virtualBalance = ${tradingUsd + lpTopup} (${tradingUsd} PAPER_RESET_TRADING_USDC + ${lpTopup} PAPER_RESET_LP_TEST_TOPUP)`,
  );

  if (founderTrace || verbose) {
    console.log("[reset] Pre-reset row counts (founder/verbose):", JSON.stringify(await snapshot(wallet), null, 2));
  }

  const result = await runPaperWalletHardReset({
    walletLower: wallet,
    tradingUsd,
    lpTopup,
  });

  console.log("[reset] Deleted / zeroed (before snapshot was):", JSON.stringify(result.countsBefore));
  console.log("[reset] Post-reset counts (expect pointsLedger=2 barrier rows):", JSON.stringify(result.countsAfter));
  console.log("[reset] User row:", JSON.stringify(result.userSnapshot, null, 2));
  console.log(`[reset] === DONE === newVirtualBalance=${result.newVirtualBalance}`);

  if (founderTrace || verbose) {
    console.log("[reset] Post-reset extended snapshot:", JSON.stringify(await snapshot(wallet), null, 2));
  }

  console.log(
    "[reset] Clear browser: run clearPaperWalletClientCache from ~/utils/clearPaperWalletClientCache or hard-refresh after disconnect.",
  );
}

async function snapshot(wallet: string) {
  const [openOrders, pointsTotal, affiliate] = await Promise.all([
    db.order.count({ where: { wallet, status: "open" } }),
    db.pointsTotal.findUnique({ where: { walletAddress: wallet } }),
    db.affiliate.findUnique({ where: { walletAddress: wallet } }),
  ]);
  return {
    openOrders,
    pointsTotal,
    affiliateRewardsPending: affiliate?.pendingRewardsUsd ?? null,
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
