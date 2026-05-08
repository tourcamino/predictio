import { type ReactNode } from "react";

interface GuestPageStateProps {
  /** Optional headline — defaults to a friendly "watching as guest" message. */
  title?: string;
  /** Optional one-line description shown under the headline. */
  description?: string;
  /** CTA label. */
  ctaLabel?: string;
  /** Triggered when user clicks the CTA — typically `() => requireWallet()`. */
  onConnect: () => void;
  /** Optional extra content rendered below the CTA (e.g. preview cards). */
  children?: ReactNode;
}

/**
 * Inline empty-state block for pages that previously full-gated guests behind a
 * "Connect your wallet" wall. Renders a friendly "watching as guest" message
 * with a single Connect Wallet CTA — the actual modal is handled by
 * `useWalletGate()` + `<WalletGateModal />` from the calling page.
 */
export function GuestPageState({
  title = "👀 Watching as guest",
  description = "Connect wallet to see your activity",
  ctaLabel = "Connect Wallet",
  onConnect,
  children,
}: GuestPageStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-400 mb-2 text-lg font-semibold">{title}</p>
      <p className="text-sm text-gray-600">{description}</p>
      <button
        type="button"
        onClick={onConnect}
        className="mt-4 border border-[#00FF87] text-[#00FF87] px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#00FF87]/10 transition-colors"
      >
        {ctaLabel}
      </button>
      {children}
    </div>
  );
}
