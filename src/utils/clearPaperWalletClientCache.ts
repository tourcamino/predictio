const WALLET_PERSIST = "predictio-wallet-v2";
const LEGACY_WALLET_PERSIST = "predictio-wallet";
const TRADING_PERSIST = "predictio-trading";

function welcomeOnboardingDismissKey(walletKey: string): string {
  return `predictio:welcome-onboarding-dismiss:${walletKey.toLowerCase()}`;
}

/**
 * Clears persisted client state that can disagree with DB after a paper hard reset.
 * Call from DevTools after `paper:reset-wallet`, or wire from an internal admin tool.
 */
export function clearPaperWalletClientCache(walletKey?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WALLET_PERSIST);
    localStorage.removeItem(LEGACY_WALLET_PERSIST);
    localStorage.removeItem(TRADING_PERSIST);
    localStorage.removeItem("predictio_demo_state");
    localStorage.removeItem("predictio_demo_opt_in");
    const w = walletKey?.trim().toLowerCase();
    if (w) {
      localStorage.removeItem(welcomeOnboardingDismissKey(w));
    }
  } catch {
    /* ignore quota / private mode */
  }
}
