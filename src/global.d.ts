/** Optional EIP-1193 provider injected by browser wallets */
declare global {
  interface Window {
    ethereum?: {
      disconnect?: () => void;
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export {};
