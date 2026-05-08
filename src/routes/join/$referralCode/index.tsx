import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "~/components/Header";
import {
  TierBadge,
  verificationToRewardTier,
} from "~/components/affiliate/TierBadge";
import { useTRPC } from "~/trpc/react";
import { useWalletStore } from "~/store/useWalletStore";
import { TrendingUp, Users, Target, Sparkles, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/join/$referralCode/")({
  component: ReferralLandingPage,
});

function ReferralLandingPage() {
  const { referralCode } = Route.useParams();
  const trpc = useTRPC();
  
  const analystQuery = useQuery(
    trpc.getAnalystByReferralCode.queryOptions({ referralCode })
  );
  
  const { data, isLoading, error } = analystQuery;
  const openWalletModal = useWalletStore((state) => state.openWalletModal);
  const wallet = useWalletStore((state) => state.address);

  // Store referral code in localStorage for later attribution
  useEffect(() => {
    if (referralCode) {
      localStorage.setItem("predictio-referral-code", referralCode);
      localStorage.setItem("predictio-referral-timestamp", Date.now().toString());
    }
  }, [referralCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-pulse">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Invalid Referral Link</h1>
            <p className="text-gray-400 mb-6">
              This referral code is not valid or has expired.
            </p>
            <Link
              to="/"
              className="inline-block px-8 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const analyst = data;

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green/10 border border-brand-green/30 rounded-full text-brand-green text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Exclusive Invitation
            </div>
            
            <h1 className="font-syne font-bold text-4xl md:text-5xl mb-4">
              You've Been Invited by
            </h1>

            {/* Analyst Card */}
            <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-lg p-8 mb-8">
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center text-5xl">
                  {analyst.avatar}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className="font-syne font-bold text-2xl">{analyst.displayName}</h2>
                    <TierBadge
                      tier={verificationToRewardTier(analyst.tier)}
                      size="md"
                    />
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {analyst.sport.map((sport) => (
                      <span
                        key={sport}
                        className="px-3 py-1 bg-white/10 rounded-full text-sm font-semibold"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-gray-300 mb-6 max-w-lg mx-auto">{analyst.bio}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">ROI</span>
                  </div>
                  <div className="font-mono font-bold text-xl text-brand-green">
                    +{analyst.roi}%
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-xs">Win Rate</span>
                  </div>
                  <div className="font-mono font-bold text-xl text-brand-cyan">
                    {analyst.winRate}%
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Followers</span>
                  </div>
                  <div className="font-mono font-bold text-xl">{analyst.followersCount}</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            {wallet ? (
              <div className="space-y-4">
                <p className="text-brand-green font-semibold mb-4">
                  ✓ Wallet Connected - You're all set!
                </p>
                <Link
                  to="/markets"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors text-lg"
                >
                  Start Trading
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            ) : (
              <button
                onClick={openWalletModal}
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors text-lg"
              >
                Connect Wallet to Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Benefits Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-brand-green" />
              </div>
              <h3 className="font-bold text-lg mb-2">Follow Top Analysts</h3>
              <p className="text-gray-400 text-sm">
                Copy predictions from verified analysts with proven track records
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-brand-cyan/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-brand-cyan" />
              </div>
              <h3 className="font-bold text-lg mb-2">Trade on Real Events</h3>
              <p className="text-gray-400 text-sm">
                Predict outcomes on sports, politics, and more with real USDC
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">Earn Rewards</h3>
              <p className="text-gray-400 text-sm">
                Get bonuses for accurate predictions and referring friends
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-r from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-lg p-8">
            <h3 className="font-syne font-bold text-2xl text-center mb-8">
              How It Works
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-brand-green text-brand-bg rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  1
                </div>
                <h4 className="font-bold mb-2">Connect Wallet</h4>
                <p className="text-sm text-gray-400">
                  Link your Web3 wallet to get started instantly
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-brand-green text-brand-bg rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  2
                </div>
                <h4 className="font-bold mb-2">Follow {analyst.displayName}</h4>
                <p className="text-sm text-gray-400">
                  Get notified of their predictions and insights
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-brand-green text-brand-bg rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  3
                </div>
                <h4 className="font-bold mb-2">Start Trading</h4>
                <p className="text-sm text-gray-400">
                  Copy their predictions or make your own
                </p>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="text-center mt-12">
            <p className="text-gray-400 mb-4">
              Want to learn more about {analyst.displayName}?
            </p>
            <Link
              to="/analysts/$id"
              params={{ id: analyst.id }}
              className="inline-block px-6 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
            >
              View Full Profile
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

