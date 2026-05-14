// Trading / deposit UI config. Expected chain id + RPC/explorer follow `VITE_CHAIN_ID`
// and `src/config/chains.ts` (Base mainnet vs Base Sepolia).

import { getExpectedPredictioChain, isPredictioTestnet } from "./chains";

const predictioTarget = getExpectedPredictioChain();

const envUsdc = (): string | null => {
  try {
    const v = import.meta.env.VITE_USDC_ADDRESS as string | undefined;
    const t = v?.trim();
    if (t) return t;
  } catch {
    /* ignore */
  }
  return predictioTarget.defaultUsdcAddress;
};

export const CHAIN_CONFIG = {
  /** Expected app chain (8453 or 84532 from env). `isLiveMode()` still keys off contracts. */
  chainId: predictioTarget.chainId as number | null,

  chainName: predictioTarget.shortLabel as string | null,
  rpcUrl: predictioTarget.rpcUrls[0] ?? null,
  explorerUrl: predictioTarget.blockExplorerUrls[0] ?? null,
  isTestnet: isPredictioTestnet(),
  
  // USDC on the configured Base network (override with VITE_USDC_ADDRESS)
  usdcAddress: envUsdc() as string | null,
  usdcDecimals: 6,
  
  // Azuro Protocol info (for reference)
  azuro: {
    graphqlEndpoint: 'https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-base-v3',
    chainId: predictioTarget.chainId,
    active: true,
  },
  
  // Predictio contracts (TBD)
  contracts: {
    marketFactory: null as string | null,
    orderbook: null as string | null,
    clearinghouse: null as string | null,
    resolver: null as string | null,
    claimManager: null as string | null,
  },
  
  // Deposit config
  deposit: {
    // Moonpay config
    moonpayApiKey: null as string | null,           // TBD: set in prod
    moonpayEnabled: false,         // toggle
    moonpayMinAmount: 20,          // USD
    moonpayMaxAmount: 10000,
    
    // Bridge config
    bridgeEnabled: false,          // toggle
    bridgeProvider: 'across' as const,
    supportedSourceChains: [
      // TBD: populate when chain chosen
    ] as string[],
    
    // Direct transfer (always enabled)
    directTransferEnabled: true,
  },
  
  // Withdraw config
  withdraw: {
    minAmount: 1,                  // USDC
    estimatedTimeSeconds: 15,
    requireWarningModal: true,
  },
  
  // Claim config
  claim: {
    batchEnabled: true,
    maxBatchSize: 20,              // markets per batch
  },
  
  // Gas estimation
  gas: {
    avgTradeCostUsd: 0.35,        // for "trades remaining" calc
    lowBalanceThresholdUsd: 5,
    recommendedBalanceUsd: 50,
  },
  
  // Gas settings
  gasToken: 'ETH',
  gasEstimationBuffer: 1.2, // 20% buffer
};

// Helper: are we in live mode or demo?
export function isLiveMode(): boolean {
  return CHAIN_CONFIG.chainId !== null && 
         CHAIN_CONFIG.contracts.clearinghouse !== null;
}

// Helper: is Azuro integration active?
export function isAzuroActive(): boolean {
  return CHAIN_CONFIG.azuro?.active === true;
}
