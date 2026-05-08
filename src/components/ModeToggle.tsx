import { useDemoAccount } from "~/hooks/useDemoAccount";
import { useWallet } from "~/store/useWalletStore";

/**
 * Demo / Real mode toggle. Visible only when a wallet is connected.
 *
 * - DEMO: backed by the existing `useDemoAccount` flag (`isActive` /
 *   `activateDemo`). No new state is introduced — we reuse what is already
 *   persisted in `localStorage` by `lib/demoStorage`.
 * - REAL: disabled placeholder until on-chain trading on Base is wired.
 */
export function ModeToggle() {
  const isConnected = useWallet().isConnected;
  const { isActive: isDemoActive, activateDemo } = useDemoAccount();

  if (!isConnected) return null;

  return (
    <div
      role="group"
      aria-label="Trading mode"
      className="flex items-center gap-1 rounded-lg bg-white/5 p-1"
    >
      <button
        type="button"
        onClick={() => {
          if (!isDemoActive) activateDemo();
        }}
        aria-pressed={isDemoActive}
        title="Practice with virtual funds. No real money involved."
        className={
          isDemoActive
            ? "rounded bg-[#00FF87] px-3 py-1 text-xs font-bold text-black"
            : "px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
        }
      >
        DEMO
      </button>

      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Real trading coming soon — trade with real USDC on Base"
        className="cursor-not-allowed px-3 py-1 text-xs text-gray-600"
      >
        REAL
      </button>
    </div>
  );
}
