import type { Eip1193Provider, InjectedEthereum } from "./eip1193Types";

function asProvider(p: InjectedEthereum): Eip1193Provider {
  return p;
}

/**
 * Resolve the injected provider for the wallet the user picked.
 * When multiple extensions are present (`ethereum.providers`), pick explicitly.
 */
export function getInjectedEip1193Provider(walletType: string): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum as InjectedEthereum | undefined;
  if (!eth?.request) return null;

  const multi = eth.providers;
  const wt = walletType.toLowerCase();

  if (Array.isArray(multi) && multi.length > 0) {
    if (wt === "metamask") {
      const mm =
        multi.find((p) => p.isMetaMask && !p.isBraveWallet) ??
        multi.find((p) => p.isMetaMask);
      if (mm) return asProvider(mm);
      return null;
    }
    if (wt === "coinbase") {
      const cb = multi.find((p) => p.isCoinbaseWallet);
      if (cb) return asProvider(cb);
      return null;
    }
    const first = multi[0];
    if (first) return asProvider(first);
    return null;
  }

  if (wt === "metamask" && !eth.isMetaMask) return null;
  if (wt === "coinbase" && !eth.isCoinbaseWallet) return null;

  return asProvider(eth);
}

/** Any injected provider (first in multi-wallet list or `window.ethereum`). */
export function getAnyInjectedEip1193Provider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum as InjectedEthereum | undefined;
  if (!eth?.request) return null;
  const multi = eth.providers;
  if (Array.isArray(multi) && multi.length > 0 && multi[0]) {
    return asProvider(multi[0]);
  }
  return asProvider(eth);
}
