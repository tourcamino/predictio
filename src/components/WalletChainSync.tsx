import { useEffect } from "react";
import { useWallet, useWalletStore } from "~/store/useWalletStore";
import { getInjectedEip1193Provider } from "~/lib/wallet/injectedProvider";
import { walletDevLog } from "~/lib/wallet/switchToPredictioChain";
import { getExpectedChainId } from "~/config/chains";

/**
 * Keeps `wrongNetwork` / `chainId` in sync after hydration and on `chainChanged`.
 * Read-only browsing does not depend on this; trading flows use the same store flags.
 */
export function WalletChainSync() {
  const { isConnected, walletType, refreshChainFromProvider } = useWallet();

  useEffect(() => {
    if (!isConnected || !walletType) return;

    const provider = getInjectedEip1193Provider(walletType);
    if (!provider?.request) return;

    void refreshChainFromProvider();

    const onChainChanged = (hex: string) => {
      const cid = typeof hex === "string" && hex.startsWith("0x") ? parseInt(hex, 16) : null;
      const expected = getExpectedChainId();
      walletDevLog("chain_changed", { chainId: cid, expectedChainId: expected });
      useWalletStore.setState({
        chainId: cid,
        wrongNetwork: cid != null && cid !== expected,
      });
    };

    provider.on?.("chainChanged", onChainChanged);
    return () => {
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [isConnected, walletType, refreshChainFromProvider]);

  return null;
}
