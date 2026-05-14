import { useCallback, useEffect } from "react";
import { useWalletStore } from "~/store/useWalletStore";
import { getInjectedEip1193Provider } from "~/lib/wallet/injectedProvider";
import { walletDevLog } from "~/lib/wallet/switchToPredictioChain";
import { getExpectedChainId } from "~/config/chains";
import { readInjectedIdentity, walletIdentityDevLog } from "~/lib/wallet/syncIdentityFromProvider";

function migrateLegacyPredictioWalletKey(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("predictio-wallet");
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state?: {
        walletType?: string | null;
        referralCode?: string | null;
        isOnboarded?: boolean;
      };
    };
    const st = parsed?.state;
    if (st) {
      const cur = useWalletStore.getState();
      useWalletStore.setState({
        walletType: cur.walletType ?? st.walletType ?? null,
        referralCode: cur.referralCode ?? st.referralCode ?? null,
        isOnboarded: cur.isOnboarded || Boolean(st.isOnboarded),
      });
    }
    localStorage.removeItem("predictio-wallet");
  } catch {
    try {
      localStorage.removeItem("predictio-wallet");
    } catch {
      /* ignore */
    }
  }
}

function applyIdentitySnapshot(snap: Awaited<ReturnType<typeof readInjectedIdentity>>) {
  if (snap.address) {
    useWalletStore.setState({
      isConnected: true,
      address: snap.address,
      wrongNetwork: snap.wrongNetwork,
      chainId: snap.chainId,
    });
  } else {
    useWalletStore.setState({
      isConnected: false,
      address: null,
      balance: 0,
      balanceUsdc: 0,
      balanceUsdcAvailable: 0,
      balanceUsdcInPositions: 0,
      balanceEth: 0,
      balanceEthUsd: 0,
      wrongNetwork: false,
      chainId: null,
    });
  }
}

/**
 * Provider-authoritative wallet identity + chain:
 * - After persist hydration: `eth_accounts` (no prompt) reconciles address vs stale localStorage.
 * - `chainChanged` / `accountsChanged`: immediate store updates.
 */
export function WalletChainSync() {
  const walletType = useWalletStore((s) => s.walletType);

  const syncFromProvider = useCallback(async (reason: string) => {
    try {
      const wt = useWalletStore.getState().walletType;
      if (!wt) {
        walletIdentityDevLog("skip_sync", { reason, detail: "no_walletType" });
        return;
      }
      const snap = await readInjectedIdentity(wt);
      walletIdentityDevLog("eth_accounts", {
        reason,
        address: snap.address,
        chainId: snap.chainId,
        wrongNetwork: snap.wrongNetwork,
      });
      applyIdentitySnapshot(snap);
    } finally {
      useWalletStore.setState({ walletProviderSyncComplete: true });
    }
  }, []);

  useEffect(() => {
    const run = () => {
      migrateLegacyPredictioWalletKey();
      void syncFromProvider("persist_hydrated");
    };
    if (useWalletStore.persist.hasHydrated()) {
      run();
      return undefined;
    }
    return useWalletStore.persist.onFinishHydration(run);
  }, [syncFromProvider]);

  useEffect(() => {
    if (!useWalletStore.persist.hasHydrated() || !walletType) return;
    void syncFromProvider("walletType_changed");
  }, [walletType, syncFromProvider]);

  useEffect(() => {
    if (!walletType) return;
    const provider = getInjectedEip1193Provider(walletType);
    if (!provider?.request) return;

    void syncFromProvider("provider_listener_mount");

    const onChainChanged = (hex: string) => {
      const cid =
        typeof hex === "string" && hex.startsWith("0x") ? parseInt(hex, 16) : null;
      const expected = getExpectedChainId();
      walletDevLog("chain_changed", { chainId: cid, expectedChainId: expected });
      useWalletStore.setState({
        chainId: cid,
        wrongNetwork: cid != null && cid !== expected,
      });
    };

    const onAccountsChanged = (accounts: string[]) => {
      walletIdentityDevLog("accountsChanged_event", {
        raw: accounts,
        walletType,
      });
      void syncFromProvider("accountsChanged");
    };

    provider.on?.("chainChanged", onChainChanged);
    provider.on?.("accountsChanged", onAccountsChanged);
    return () => {
      provider.removeListener?.("chainChanged", onChainChanged);
      provider.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [walletType, syncFromProvider]);

  return null;
}
