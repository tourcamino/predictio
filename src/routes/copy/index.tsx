import { createFileRoute, Link } from "@tanstack/react-router";
import { useWalletStore } from "~/store/useWalletStore";
import { Eye, Zap, DollarSign } from "lucide-react";
import { SocialTradingDashboard } from "~/components/trading/SocialTradingDashboard";
import { useWalletGate } from "~/hooks/useWalletGate";
import { WalletGateModal } from "~/components/WalletGateModal";
import { isPredictioTestnet } from "~/lib/economySurface";

export const Route = createFileRoute("/copy/")({
  component: CopyTradingPage,
});

function CopyTradingPage() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected, address } = useWalletStore();

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-bg">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,255,135,0.14), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      <div className="relative z-10 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="relative mb-16 text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-green/25 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
              Social trading terminal
            </p>
            <h1 className="font-syne font-bold text-5xl md:text-6xl mb-6 tracking-tight">
              Copy the Best. Earn Together.
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              See every open position from top traders. Copy in one click. No experience needed.
              You profit when they profit.
            </p>
          </div>

          {/* How It Works Section */}
          <HowItWorksSection />

          {/* Social Trading Dashboard — visible to guests; connect only needed to copy/follow */}
          <div className="mt-16 space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-300 max-w-3xl mx-auto">
              <p className="font-semibold text-white/90 mb-1">How money works here</p>
              <p className="text-gray-400 leading-relaxed">
                Copy and analyst cards show <span className="text-white/90">paper-tracked activity</span> on
                Predictio — not hidden real users or guaranteed profits.
                {isPredictioTestnet()
                  ? " This build targets Base Sepolia; nothing here is mainnet value."
                  : " Prediction balances are Predictio paper USDC, not your wallet’s on-chain USDC."}
              </p>
            </div>
            {!isConnected && (
              <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span>
                  Browse traders below as a guest. Connect your wallet to follow or start copy trading.
                </span>
                <button
                  type="button"
                  onClick={() => requireWallet()}
                  className="shrink-0 px-4 py-2 rounded-lg bg-brand-green text-brand-bg font-semibold hover:bg-brand-green/90"
                >
                  Connect wallet
                </button>
              </div>
            )}
            <SocialTradingDashboard userWallet={address ?? ''} />
          </div>
        </div>
      </div>

      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: Eye,
      title: "Browse Traders",
      description: "See all active traders, their open positions, win rate, and total volume. Fully transparent."
    },
    {
      icon: Zap,
      title: "Copy in One Click",
      description: "Choose how much to allocate. Their future trades mirror automatically in your account."
    },
    {
      icon: DollarSign,
      title: "Earn Together",
      description: "When their prediction wins, you win proportionally. Stop copying anytime."
    }
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)] md:p-12">
      <h2 className="font-syne font-bold text-3xl text-center mb-12">
        How It Works
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-green/10 rounded-full mb-4">
                <Icon className="w-8 h-8 text-brand-green" />
              </div>
              <h3 className="font-syne font-bold text-xl mb-3">{step.title}</h3>
              <p className="text-gray-400 leading-relaxed">{step.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

