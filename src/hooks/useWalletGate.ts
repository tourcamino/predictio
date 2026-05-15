import { useState, useCallback } from "react";
import { WALLET_TOAST_IDS, walletToastError } from "~/lib/walletToast";
import { getExpectedPredictioChain } from "~/config/chains";
import { useWallet } from "~/store/useWalletStore";
import { useWalletRuntimeState } from "~/hooks/useWalletRuntimeState";

/**
 * Guest-mode gate for actions that require a connected wallet.
 *
 * Pattern:
 *   const { requireWallet, requireWalletAndChain, showGateModal, closeGateModal } = useWalletGate();
 *
 *   <button onClick={() => {
 *     if (!requireWallet()) return;
 *     doReadOnlyOrGenericAction();
 *   }}>…</button>
 *
 *   <button onClick={() => {
 *     if (!requireWalletAndChain()) return;
 *     placeTradeOrLp();
 *   }}>…</button>
 *
 *   <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
 *
 * `requireWallet` opens the in-app gate when disconnected.
 * `requireWalletAndChain` also blocks when the injected wallet is on the wrong chain
 * (markets / analysts stay browsable; trading & LP use this).
 */
export function useWalletGate() {
  const { isConnected, address, openWalletModal } = useWallet();
  const { runtime, isWrongChain } = useWalletRuntimeState();

  const [showGateModal, setShowGateModal] = useState(false);

  const requireWallet = useCallback((): boolean => {
    if (isConnected) return true;
    setShowGateModal(true);
    return false;
  }, [isConnected]);

  const requireWalletAndChain = useCallback((): boolean => {
    if (!isConnected) {
      setShowGateModal(true);
      return false;
    }
    if (runtime === "hydrating") {
      walletToastError("Wallet network is still syncing — try again in a moment.", {
        id: WALLET_TOAST_IDS.hydratingGate,
        duration: 3800,
      });
      return false;
    }
    if (isWrongChain) {
      const target = getExpectedPredictioChain();
      walletToastError(
        `Wrong network — switch to ${target.shortLabel} in your wallet to continue (use the banner or header).`,
        { id: WALLET_TOAST_IDS.wrongNetworkGate, duration: 6200 },
      );
      return false;
    }
    return true;
  }, [isConnected, runtime, isWrongChain]);

  const closeGateModal = useCallback(() => {
    setShowGateModal(false);
  }, []);

  return {
    isConnected,
    address,
    requireWallet,
    requireWalletAndChain,
    showGateModal,
    closeGateModal,
    openWalletModal,
  };
}
