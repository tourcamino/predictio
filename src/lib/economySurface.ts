/**
 * Client-side copy + URLs for economic / network transparency (demo vs wallet paper vs testnet).
 * Keeps wording consistent across wallet, LP, trading, and onboarding.
 */

import { getExpectedPredictioChain, isPredictioTestnet } from "~/config/chains";

export { isPredictioTestnet, getExpectedPredictioChain };

/** Short network tag for compact UI (header chip, wallet menu). */
export function walletNetworkBadgeLabel(): string {
  return isPredictioTestnet() ? "Sepolia" : "Base";
}

export function explorerAddressUrl(address: string): string {
  const base = getExpectedPredictioChain().blockExplorerUrls[0].replace(/\/$/, "");
  return `${base}/address/${address}`;
}

export function explorerTxUrl(txHash: string): string {
  const base = getExpectedPredictioChain().blockExplorerUrls[0].replace(/\/$/, "");
  return `${base}/tx/${txHash}`;
}

/** Official Base Sepolia faucet (Coinbase developer docs). */
export const BASE_SEPOLIA_FAUCET_URL =
  "https://docs.base.org/docs/tools/network-faucet/";

export const LP_SEEDED_SHORT = "Platform-seeded liquidity";

export const LP_SEEDED_EXPLAINER =
  "Displayed vault size includes platform-seeded USDC for UX and stress testing — not organic depth from external market makers.";

export function demoBannerPrimaryLine(opts: {
  isConnected: boolean;
  isDemoActive: boolean;
}): string {
  const net = isPredictioTestnet()
    ? " · Base Sepolia testnet (no real monetary value)"
    : "";

  if (!opts.isConnected) {
    return `Guest — explore with local demo USDC, or connect a wallet for server-synced paper trading${net}.`;
  }
  if (opts.isDemoActive) {
    return `Demo — virtual USDC lives in this browser only; picks don’t move assets in your wallet${net}.`;
  }
  return `Wallet connected — prediction balance is Predictio paper USDC (server account). On-chain ETH/USDC in your wallet are separate${net}.`;
}

/** Subline under demo banner (smaller if we split later). */
export function demoBannerSecondaryHint(): string | null {
  if (!isPredictioTestnet()) return null;
  return "Get Sepolia ETH from a faucet for gas; test USDC is optional for experiments — trading stakes here stay paper unless we say otherwise.";
}

export function predictionBalanceFootnote(): string {
  if (isPredictioTestnet()) {
    return "Prediction stakes use Predictio paper credits (testnet deployment). Testnet tokens in your wallet have no dollar value.";
  }
  return "Prediction stakes use Predictio paper credits synced to your wallet address — not the ERC-20 USDC balance inside your wallet.";
}

export function walletModalDepositIntroTitle(): string {
  return isPredictioTestnet()
    ? "Funding on Base Sepolia (testnet)"
    : "Funding your wallet on Base";
}

export function walletModalDepositIntroBody(): string {
  if (isPredictioTestnet()) {
    return `Use a faucet for Sepolia ETH (gas). Optional: bridge or receive test USDC on ${getExpectedPredictioChain().shortLabel}. In-app prediction trades still use paper credits — see the demo banner.`;
  }
  return "Prediction trades on Predictio use paper USDC (account balance). Moving real USDC on-chain is only needed if you use on-chain features or withdraw per product rules.";
}
