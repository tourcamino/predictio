/** Optional EIP-1193 provider injected by browser wallets */
interface Window {
  ethereum?: {
    disconnect?: () => void;
    request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
}
