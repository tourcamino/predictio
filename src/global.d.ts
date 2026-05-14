/** Optional EIP-1193 provider injected by browser wallets */
declare global {
  interface Window {
    ethereum?: {
      disconnect?: () => void;
      providers?: Window["ethereum"][];
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      isBraveWallet?: boolean;
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export {};
