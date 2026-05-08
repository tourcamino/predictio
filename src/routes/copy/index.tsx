import { createFileRoute, Link } from "@tanstack/react-router";
import { useWalletStore } from "~/store/useWalletStore";
import { Eye, Zap, DollarSign } from "lucide-react";
import { SocialTradingDashboard } from "~/components/trading/SocialTradingDashboard";
import { useWalletGate } from "~/hooks/useWalletGate";
import { WalletGateModal } from "~/components/WalletGateModal";
import { GuestPageState } from "~/components/GuestPageState";

export const Route = createFileRoute("/copy/")({
  component: CopyTradingPage,
});

function CopyTradingPage() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected, address } = useWalletStore();

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="font-syne font-bold text-5xl md:text-6xl mb-6">
              Copy the Best. Earn Together.
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              See every open position from top traders. Copy in one click. No experience needed.
              You profit when they profit.
            </p>
          </div>

          {/* How It Works Section */}
          <HowItWorksSection />

          {/* Social Trading Dashboard */}
          <div className="mt-16">
            {isConnected ? (
              <SocialTradingDashboard userWallet={address || ''} />
            ) : (
              <GuestPageState
                title="👀 Watching as guest"
                description="Connect wallet to copy traders and save your allocations"
                onConnect={() => requireWallet()}
              />
            )}
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
    <div className="bg-white/5 border border-white/10 rounded-xl p-8 md:p-12">
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

