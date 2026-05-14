import { AlertTriangle, Loader2 } from "lucide-react";
import { getExpectedPredictioChain, getSwitchNetworkCtaLabel } from "~/config/chains";
import { useWallet } from "~/store/useWalletStore";

export function NetworkBanner() {
  const { wrongNetwork, switchNetwork, isConnected, switchNetworkPending } =
    useWallet();

  if (!isConnected || !wrongNetwork) return null;

  const target = getExpectedPredictioChain();

  return (
    <div className="relative z-[100] animate-slide-down">
      <div className="bg-red-500/15 border-b border-red-500/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-sm font-medium text-white/95 leading-snug">
                <span className="text-red-400">Wrong network</span>
                <span className="text-white/70">
                  {" "}
                  — Predictio expects{" "}
                  <span className="text-white font-semibold">{target.shortLabel}</span>
                  {" "}(chain {target.chainId}). Browse freely; connect the right network to
                  trade or add liquidity.
                </span>
              </p>
            </div>
            <button
              type="button"
              disabled={switchNetworkPending}
              onClick={() => void switchNetwork()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:pointer-events-none text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {switchNetworkPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Switching…
                </>
              ) : (
                getSwitchNetworkCtaLabel()
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
