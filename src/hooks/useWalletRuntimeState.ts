import { useEffect, useMemo, useState } from "react";
import { getExpectedChainId } from "~/config/chains";
import { getInjectedEip1193Provider } from "~/lib/wallet/injectedProvider";
import { useWalletStore } from "~/store/useWalletStore";

export type WalletRuntimeState =
  | "hydrating"
  | "disconnected"
  | "connected-correct-chain"
  | "connected-wrong-chain";

export type WalletRuntimeSnapshot = {
  runtime: WalletRuntimeState;
  address: string | null;
  chainId: number | null;
  expectedChainId: number;
  isHydrating: boolean;
  isConnected: boolean;
  isWrongChain: boolean;
  persistHydrated: boolean;
  walletProviderSyncComplete: boolean;
};

/**
 * Single deterministic wallet + network runtime for UI (banners, gates, badges).
 *
 * Rules:
 * - `chainId === null` never implies wrong chain (unknown / probing).
 * - Wrong-network UX only in `connected-wrong-chain`.
 */
export function useWalletRuntimeState(): WalletRuntimeSnapshot {
  const [persistHydrated, setPersistHydrated] = useState(() =>
    useWalletStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (persistHydrated) return;
    return useWalletStore.persist.onFinishHydration(() => {
      setPersistHydrated(true);
    });
  }, [persistHydrated]);

  const isConnected = useWalletStore((s) => s.isConnected);
  const address = useWalletStore((s) => s.address);
  const chainId = useWalletStore((s) => s.chainId);
  const walletType = useWalletStore((s) => s.walletType);
  const walletProviderSyncComplete = useWalletStore((s) => s.walletProviderSyncComplete);

  return useMemo(() => {
    const expectedChainId = getExpectedChainId();
    const hasInjected =
      typeof walletType === "string" &&
      walletType.length > 0 &&
      Boolean(getInjectedEip1193Provider(walletType));

    if (!persistHydrated) {
      return {
        runtime: "hydrating",
        address,
        chainId,
        expectedChainId,
        isHydrating: true,
        isConnected,
        isWrongChain: false,
        persistHydrated: false,
        walletProviderSyncComplete,
      };
    }

    if (!isConnected || !address) {
      return {
        runtime: "disconnected",
        address,
        chainId,
        expectedChainId,
        isHydrating: false,
        isConnected: false,
        isWrongChain: false,
        persistHydrated: true,
        walletProviderSyncComplete,
      };
    }

    if (!walletProviderSyncComplete) {
      return {
        runtime: "hydrating",
        address,
        chainId,
        expectedChainId,
        isHydrating: true,
        isConnected: true,
        isWrongChain: false,
        persistHydrated: true,
        walletProviderSyncComplete: false,
      };
    }

    if (hasInjected && chainId === null) {
      return {
        runtime: "hydrating",
        address,
        chainId,
        expectedChainId,
        isHydrating: true,
        isConnected: true,
        isWrongChain: false,
        persistHydrated: true,
        walletProviderSyncComplete: true,
      };
    }

    const isWrongChain = chainId != null && chainId !== expectedChainId;
    if (isWrongChain) {
      return {
        runtime: "connected-wrong-chain",
        address,
        chainId,
        expectedChainId,
        isHydrating: false,
        isConnected: true,
        isWrongChain: true,
        persistHydrated: true,
        walletProviderSyncComplete: true,
      };
    }

    return {
      runtime: "connected-correct-chain",
      address,
      chainId,
      expectedChainId,
      isHydrating: false,
      isConnected: true,
      isWrongChain: false,
      persistHydrated: true,
      walletProviderSyncComplete: true,
    };
  }, [
    persistHydrated,
    isConnected,
    address,
    chainId,
    walletType,
    walletProviderSyncComplete,
  ]);
}
