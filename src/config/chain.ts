// TBD: All values to be filled when chain and contracts are finalized.
// This config is referenced by all trading logic — changing these 
// values "turns on" live mode.

// NOTE: Azuro Protocol integration is active on Base network
// The app currently operates in demo mode with Azuro data integration
export const CHAIN_CONFIG = {
  // Chain identifier - Base network for Azuro integration
  // Set to null to keep demo mode active while using Azuro data
  chainId: null as number | null, // Would be 8453 for Base mainnet
  
  chainName: 'Base' as string | null,
  rpcUrl: 'https://mainnet.base.org' as string | null,
  explorerUrl: 'https://basescan.org' as string | null,
  
  // USDC on Base
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as string | null,
  usdcDecimals: 6,
  
  // Azuro Protocol info (for reference)
  azuro: {
    graphqlEndpoint: 'https://thegraph.azuro.org/subgraphs/name/azuro-protocol/azuro-api-base-v3',
    chainId: 8453, // Base mainnet
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
