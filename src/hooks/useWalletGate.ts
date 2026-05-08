import { useState, useCallback } from "react";
import { useWallet } from "~/store/useWalletStore";

/**
 * Guest-mode gate for actions that require a connected wallet.
 *
 * Pattern:
 *   const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
 *
 *   <button onClick={() => {
 *     if (!requireWallet()) return;
 *     doProtectedAction();
 *   }}>Place prediction</button>
 *
 *   <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
 *
 * The hook reuses the existing Zustand wallet store (no wagmi). When the user
 * is not connected, `requireWallet()` returns false and opens the in-app gate
 * modal; the modal's primary CTA delegates to `openWalletModal()` (the real
 * wallet picker).
 */
export function useWalletGate() {
  const { isConnected, address, openWalletModal } = useWallet();

  const [showGateModal, setShowGateModal] = useState(false);

  const requireWallet = useCallback((): boolean => {
    if (isConnected) return true;
    setShowGateModal(true);
    return false;
  }, [isConnected]);

  const closeGateModal = useCallback(() => {
    setShowGateModal(false);
  }, []);

  return {
    isConnected,
    address,
    requireWallet,
    showGateModal,
    closeGateModal,
    openWalletModal,
  };
}
