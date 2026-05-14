/**
 * Single source of truth for Predictio’s expected EVM chain (Base mainnet vs Base Sepolia).
 * Do not scatter magic chain IDs — import from here or from `CHAIN_CONFIG` (re-exports).
 */

export const BASE_MAINNET_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

export type PredictioChainDefinition = {
  chainId: number;
  /** `0x`-prefixed, lowercase, for `wallet_switchEthereumChain` / `wallet_addEthereumChain` */
  chainIdHex: `0x${string}`;
  shortLabel: string;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: readonly [string, ...string[]];
  blockExplorerUrls: readonly [string, ...string[]];
  /** Default USDC used in UI copy; override with `VITE_USDC_ADDRESS` when needed */
  defaultUsdcAddress: `0x${string}`;
};

const envRpc = (key: string, fallback: string): string => {
  try {
    const v = import.meta.env[key as keyof ImportMetaEnv] as string | undefined;
    const t = v?.trim();
    return t && t.length > 0 ? t : fallback;
  } catch {
    return fallback;
  }
};

export const BASE_MAINNET: PredictioChainDefinition = {
  chainId: BASE_MAINNET_CHAIN_ID,
  chainIdHex: "0x2105",
  shortLabel: "Base",
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [envRpc("VITE_BASE_RPC_URL", "https://mainnet.base.org")],
  blockExplorerUrls: ["https://basescan.org"],
  defaultUsdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

export const BASE_SEPOLIA: PredictioChainDefinition = {
  chainId: BASE_SEPOLIA_CHAIN_ID,
  chainIdHex: "0x14a34",
  shortLabel: "Base Sepolia",
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [envRpc("VITE_BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
  /** Circle test USDC on Base Sepolia */
  defaultUsdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

function parseEnvChainId(): number {
  const raw = import.meta.env.VITE_CHAIN_ID as string | undefined;
  if (raw == null || String(raw).trim() === "") return BASE_MAINNET_CHAIN_ID;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return BASE_MAINNET_CHAIN_ID;
  return n;
}

/** Chain the app is configured for (from `VITE_CHAIN_ID`). */
export function getExpectedPredictioChain(): PredictioChainDefinition {
  const id = parseEnvChainId();
  if (id === BASE_SEPOLIA_CHAIN_ID) return BASE_SEPOLIA;
  if (id === BASE_MAINNET_CHAIN_ID) return BASE_MAINNET;
  // Unknown id: still treat as “custom” mainnet-shaped unless explicitly sepolia
  return BASE_MAINNET;
}

export function getExpectedChainId(): number {
  return getExpectedPredictioChain().chainId;
}

export function isPredictioTestnet(): boolean {
  return getExpectedPredictioChain().chainId === BASE_SEPOLIA_CHAIN_ID;
}

/** Primary CTA label, e.g. “Switch to Base” / “Switch to Base Sepolia” */
export function getSwitchNetworkCtaLabel(): string {
  const c = getExpectedPredictioChain();
  return `Switch to ${c.shortLabel}`;
}

/** Explorer for the configured chain (first URL). */
export function getPredictioExplorerBaseUrl(): string {
  return getExpectedPredictioChain().blockExplorerUrls[0];
}

/** `wallet_addEthereumChain` parameter (EIP-3081 shape). */
export function toWalletAddEthereumChainParameter(
  chain: PredictioChainDefinition,
): {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
} {
  return {
    chainId: chain.chainIdHex,
    chainName: chain.name,
    nativeCurrency: { ...chain.nativeCurrency },
    rpcUrls: [...chain.rpcUrls],
    blockExplorerUrls: [...chain.blockExplorerUrls],
  };
}
