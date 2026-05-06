import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "~/components/Header";
import { Footer } from "~/components/Footer";
import { useWalletStore } from "~/store/useWalletStore";
import { Eye, Zap, DollarSign, Users } from "lucide-react";
import { SocialTradingDashboard } from "~/components/trading/SocialTradingDashboard";

export const Route = createFileRoute("/copy/")({
  component: CopyTradingPage,
});

function CopyTradingPage() {
  const { isConnected, openWalletModal, address } = useWalletStore();

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />

      <div className="pt-32 pb-20 px-4">
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
              <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/5 rounded-full mb-6">
                  <Users className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="font-syne font-bold text-2xl mb-3">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Connect your wallet to discover top traders and start copy trading.
                </p>
                <button
                  onClick={openWalletModal}
                  className="inline-block px-8 py-4 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
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
