import type { Eip1193Provider } from "./eip1193Types";
import { getAnyInjectedEip1193Provider, getInjectedEip1193Provider } from "./injectedProvider";
import { readChainIdDecimal } from "./switchToPredictioChain";
import { getExpectedChainId } from "~/config/chains";

export type InjectedIdentitySnapshot = {
  address: string | null;
  chainId: number | null;
  wrongNetwork: boolean;
  provider: Eip1193Provider | null;
};

/**
 * Read-only identity from the browser wallet (no connect prompt).
 * Prefer the provider matching `walletType`; fall back to any injected provider for `eth_accounts`.
 */
export async function readInjectedIdentity(
  walletType: string | null | undefined,
): Promise<InjectedIdentitySnapshot> {
  if (typeof window === "undefined") {
    return { address: null, chainId: null, wrongNetwork: false, provider: null };
  }
  const wt = walletType?.trim();
  const provider = wt
    ? getInjectedEip1193Provider(wt)
    : getAnyInjectedEip1193Provider();
  if (!provider?.request) {
    return { address: null, chainId: null, wrongNetwork: false, provider: null };
  }
  try {
    const accounts = (await provider.request({
      method: "eth_accounts",
    })) as string[];
    const raw = Array.isArray(accounts) && accounts[0] ? accounts[0].trim() : "";
    const address = raw ? raw.toLowerCase() : null;
    const chainId = await readChainIdDecimal(provider);
    const expected = getExpectedChainId();
    const wrongNetwork = chainId != null && chainId !== expected;
    return { address, chainId, wrongNetwork, provider };
  } catch {
    return { address: null, chainId: null, wrongNetwork: false, provider };
  }
}

export function walletIdentityDevLog(phase: string, data: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (import.meta.env.VITE_WALLET_IDENTITY_DEBUG !== "1") return;
  // eslint-disable-next-line no-console
  console.info(`[wallet-identity] ${phase}`, data);
}
