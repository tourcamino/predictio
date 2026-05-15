import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Globe,
  Trophy,
  DollarSign,
  Zap,
  Shield,
  ChevronDown,
  X,
  Copy,
} from "lucide-react";
import { mockAnalysts } from "~/data/mockAffiliates";
import { useWalletStore } from "~/store/useWalletStore";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import toast from "react-hot-toast";
import { shortenWallet } from "~/utils/formatCopyTrading";
import { WALLET_TOAST_IDS, walletToastSuccess } from "~/lib/walletToast";

export const Route = createFileRoute("/affiliates/")({
  component: AffiliatesPage,
});

function AffiliatesPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const { isConnected, openWalletModal } = useWalletStore();

  const handleConnectClick = () => {
    if (!isConnected) {
      openWalletModal();
    }
  };

  const scrollToCommission = () => {
    const element = document.getElementById('commission-structure');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Hero Section */}
      <section className="pb-20 px-4 relative overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(#00FF87 1px, transparent 1px), linear-gradient(90deg, #00FF87 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-green/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block px-4 py-2 bg-brand-green/20 border border-brand-green/30 rounded-full text-sm font-semibold text-brand-green mb-6">
            ANALYST PROGRAM · PERMISSIONLESS
          </div>

          <h1 className="font-syne font-bold text-5xl md:text-6xl mb-6 leading-tight">
            Trade. Get Copied. Earn Forever.
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Publish your sports predictions as trades.
            When users copy your portfolio, you earn
            on-chain fee rewards automatically —
            <br />
            <span className="text-brand-green font-semibold">no application, no approval, no waiting.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {isConnected ? (
              <Link
                to="/analyst-dashboard"
                className="px-8 py-4 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
              >
                View Dashboard →
              </Link>
            ) : (
              <button 
                onClick={handleConnectClick}
                className="px-8 py-4 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors cursor-pointer"
              >
                Connect Wallet →
              </button>
            )}
            <button 
              onClick={scrollToCommission}
              className="px-8 py-4 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              View Fee Structure
            </button>
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "35%", value: "Analyst Fee Share", badge: "LIFETIME" },
              { label: "15%", value: "Referral Bonus", badge: "LIFETIME" },
              { label: "€10", value: "Min Payout (USDC)", badge: null },
              { label: "Instant", value: "Activation", badge: null },
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="font-mono font-bold text-brand-green text-lg flex items-center gap-2 justify-center">
                  {stat.label}
                  {stat.badge && (
                    <span className="px-1.5 py-0.5 bg-brand-green/20 text-brand-green text-[10px] font-bold rounded">
                      {stat.badge}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is This For Section */}
      <WhoIsThisForSection />

      {/* Fee Structure Section */}
      <FeeStructureSection />

      {/* Why Lifetime Matters Section */}
      <WhyLifetimeMattersSection />

      {/* Calculator Section */}
      <CalculatorSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Featured Analysts Section */}
      <FeaturedAnalystsSection />

      {/* For Affiliate Networks Section */}
      <NetworksSection onOpenContactModal={() => setShowContactModal(true)} />

      {/* FAQ Section */}
      <FAQSection openFaq={openFaq} setOpenFaq={setOpenFaq} />

      {/* Final CTA Section */}
      <FinalCTASection />

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}

    </div>
  );
}

function WhoIsThisForSection() {
  const cards = [
    {
      icon: "📱",
      title: "Content Creators",
      description:
        "Soccer, MMA, Cricket, NBA — YouTube, TikTok, Instagram, X. Your audience already predicts. Monetize your audience with prediction markets.",
    },
    {
      icon: "🎙️",
      title: "Sports Podcasts",
      description:
        "Weekly shows, match previews, expert panels. Monetize your audience with prediction markets.",
    },
    {
      icon: "🌐",
      title: "Affiliate Networks",
      description:
        "iGaming networks, sports media, DeFi-ready. Custom structures, crypto payouts.",
    },
    {
      icon: "🏆",
      title: "Athletes & Agents",
      description:
        "Retired athletes, coaches, analysts. Your credibility = their trust. USDC earnings, verified badge.",
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-syne font-bold text-4xl text-center mb-4">
          Who Is This For?
        </h2>
        <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          If you have a sports audience, you can monetize it with Predictio.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 hover:border-brand-green/30 transition-all"
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="font-syne font-bold text-xl mb-3">{card.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeeStructureSection() {
  return (
    <section id="commission-structure" className="py-20 px-4 bg-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-syne font-bold text-4xl text-center mb-4">
          How Fee Rewards Work
        </h2>
        <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          Simple, transparent, and fair. Every trade generates rewards for you.
        </p>

        {/* Lifetime Rewards Banner */}
        <div className="max-w-3xl mx-auto mb-8 p-6 bg-gradient-to-r from-brand-green/20 to-brand-cyan/20 border-2 border-brand-green rounded-xl">
          <h3 className="font-syne font-bold text-3xl mb-2 text-center text-brand-green">
            Lifetime Rewards
          </h3>
          <p className="text-center text-gray-300 leading-relaxed">
            Once someone uses your referral link, you earn 15% of their taker fees forever. 
            No expiration. No resets. Every trade. Forever.
          </p>
        </div>

        {/* Fee Breakdown Card */}
        <div className="max-w-3xl mx-auto mb-12 p-8 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border-2 border-brand-green/30 rounded-xl">
          <h3 className="font-syne font-bold text-2xl mb-6 text-center">
            A user places a $1,000 trade
          </h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <div className="font-semibold">Taker fee (1%)</div>
                <div className="text-sm text-gray-400">Fixed rate, always</div>
              </div>
              <div className="font-mono font-bold text-xl">$10.00</div>
            </div>

            <div className="ml-8 space-y-3">
              <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg border-l-4 border-purple-400">
                <div>
                  <div className="font-semibold text-purple-400">50% → Protocol Vault</div>
                  <div className="text-sm text-gray-400">LP earns here</div>
                </div>
                <div className="font-mono font-bold text-xl text-purple-400">$5.00</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg border-l-4 border-brand-green">
                <div>
                  <div className="font-semibold text-brand-green flex items-center gap-2">
                    35% → You, the Analyst
                    <span className="px-2 py-0.5 bg-brand-green/20 text-brand-green text-xs font-bold rounded">
                      LIFETIME
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">When your trade is copied</div>
                </div>
                <div className="font-mono font-bold text-xl text-brand-green">$3.50</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/10 rounded-lg border-l-4 border-brand-cyan">
                <div>
                  <div className="font-semibold text-brand-cyan flex items-center gap-2">
                    15% → Who Referred This User
                    <span className="px-2 py-0.5 bg-brand-cyan/20 text-brand-cyan text-xs font-bold rounded">
                      LIFETIME
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">Could also be you</div>
                </div>
                <div className="font-mono font-bold text-xl text-brand-cyan">$1.50</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-brand-green/20 border border-brand-green/30 rounded-lg">
            <p className="text-sm text-gray-300 mb-2">
              <span className="font-semibold text-brand-green">If you are both Analyst AND Referral:</span>
            </p>
            <p className="text-lg font-mono font-bold text-brand-green">
              → You earn $5.00 on every trade. Forever.
            </p>
          </div>
        </div>

        {/* Edge Cases */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="font-semibold mb-2">No referral tracked?</div>
            <div className="text-gray-400">15% goes to Predictio treasury</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="font-semibold mb-2">Trade not copied?</div>
            <div className="text-gray-400">35% goes to Predictio treasury</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyLifetimeMattersSection() {
  return (
    <section className="py-20 px-4 bg-white/5">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-syne font-bold text-4xl text-center mb-4">
          Why Lifetime Matters
        </h2>
        <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          Most affiliate programs pay once. We pay forever.
        </p>

        <div className="p-8 bg-white/5 border border-white/10 rounded-xl">
          <div className="space-y-6 text-gray-300">
            <p className="text-lg leading-relaxed">
              Refer one active trader today. They trade $1,000/month. Your 15% = <span className="font-mono font-bold text-brand-green">$1.50/month</span> in fees.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
              <div className="text-center p-6 bg-brand-green/10 border border-brand-green/30 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">In one year</div>
                <div className="font-mono font-bold text-3xl text-brand-green">$18</div>
              </div>
              <div className="text-center p-6 bg-brand-green/10 border border-brand-green/30 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">In five years</div>
                <div className="font-mono font-bold text-3xl text-brand-green">$90</div>
              </div>
              <div className="text-center p-6 bg-brand-green/10 border border-brand-green/30 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">With 100 referrals</div>
                <div className="font-mono font-bold text-3xl text-brand-green">$1,800/year</div>
              </div>
            </div>

            <p className="text-lg leading-relaxed text-center">
              <span className="font-semibold text-white">Passive. Automatic. Forever.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalculatorSection() {
  const [copiers, setCopiers] = useState(10);
  const [avgVolume, setAvgVolume] = useState(1000);
  const [isReferral, setIsReferral] = useState(false);

  const analystRate = 0.35;
  const referralBonus = isReferral ? 0.15 : 0;
  const totalRate = analystRate + referralBonus;
  const monthlyFee = copiers * avgVolume * 0.01;
  const monthlyRewards = monthlyFee * totalRate;
  const annual = monthlyRewards * 12;

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-syne font-bold text-4xl text-center mb-4">
          Calculate Your Potential Rewards
        </h2>
        <p className="text-center text-gray-400 mb-12">
          See how much you could earn from your sports knowledge
        </p>

        <div className="p-8 bg-white/5 border border-white/10 rounded-xl">
          <div className="space-y-6 mb-8">
            {/* Active Copiers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="font-semibold">Active Copiers</label>
                <span className="font-mono font-bold text-brand-green">{copiers}</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                value={copiers}
                onChange={(e) => setCopiers(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Avg Monthly Volume */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="font-semibold">Avg Monthly Volume per Copier</label>
                <span className="font-mono font-bold text-brand-green">${avgVolume}</span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={avgVolume}
                onChange={(e) => setAvgVolume(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Referral Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <label className="font-semibold">I also referred these users</label>
              <button
                onClick={() => setIsReferral(!isReferral)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isReferral ? 'bg-brand-green' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isReferral ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4 p-6 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Monthly Fee Rewards:</span>
              <span className="font-mono font-bold text-2xl text-brand-green">
                ${monthlyRewards.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Annual Projection:</span>
              <span className="font-mono font-bold text-3xl text-brand-green">
                ${annual.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-gray-400">Your Fee Rate:</span>
              <span className="font-mono font-bold text-xl text-brand-cyan">
                {(totalRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            Works identically with $1,000 demo credit and real funds. 
            Affiliate rewards are always on. Minimum payout: €10 in USDC.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Connect & Trade",
      description: "Connect your wallet and start trading. You're instantly an Analyst — no application, no approval, no waiting. Your trades are public from day one."
    },
    {
      number: "02",
      title: "Get Copied",
      description: "Other users see your positions and copy your strategy. Every trade they copy generates fee rewards for you — automatically, on-chain, forever."
    },
    {
      number: "03",
      title: "Earn on Every Trade",
      description:
        "35% of taker fees from every copied trade goes to you. Refer a friend? Add 15% more. Deposit liquidity? Earn 50% of all platform fees. Lifetime.",
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-syne font-bold text-4xl text-center mb-4">
          How It Works
        </h2>
        <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          Three ways to earn. All automatic. All lifetime.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-brand-green/50 to-transparent" />
              )}
              <div className="bg-white/5 border border-white/10 rounded-lg p-8 hover:border-brand-green/30 transition-all">
                <div className="text-5xl font-mono font-bold text-brand-green/30 mb-4">
                  {step.number}
                </div>
                <h3 className="font-syne font-bold text-2xl mb-3">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedAnalystWalletLine({ wallet }: { wallet: string }) {
  const [copied, setCopied] = useState(false);
  const short = shortenWallet(wallet, 6, 5);

  return (
    <div className="mt-1 flex min-w-0 max-w-full items-center gap-1">
      <span
        className="min-w-0 flex-1 truncate font-mono text-xs text-gray-500 tabular-nums"
        title={wallet}
      >
        {short}
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(wallet);
            setCopied(true);
            walletToastSuccess("Address copied", { id: WALLET_TOAST_IDS.addressCopied });
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard denied — ignore */
          }
        }}
        className="shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
        title="Copy full address"
        aria-label="Copy analyst wallet address"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      {copied ? (
        <span className="shrink-0 text-[10px] font-medium text-brand-green">Copied</span>
      ) : null}
    </div>
  );
}

function FeaturedAnalystsSection() {
  const featured = mockAnalysts.slice(0, 3);

  return (
    <section className="py-20 px-4 bg-white/5">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-syne font-bold text-4xl text-center mb-4">
          Featured Analysts
        </h2>
        <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          Real analysts earning real money on Predictio.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featured.map((analyst) => (
            <div
              key={analyst.id}
              className="flex h-full flex-col bg-white/5 border border-white/10 rounded-lg p-6 min-w-0"
            >
              <div className="flex items-start gap-3 mb-4 min-w-0">
                <div className="w-16 h-16 shrink-0 bg-white/10 rounded-full flex items-center justify-center text-3xl">
                  {analyst.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-syne font-bold text-lg truncate">
                    {analyst.displayName}
                  </h3>
                  <FeaturedAnalystWalletLine wallet={analyst.wallet} />
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-4 italic">
                &ldquo;{analyst.featuredQuote ?? analyst.bio}&rdquo;
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-auto">
                <div>
                  <div className="text-xs text-gray-500">Total Earned</div>
                  <div className="font-mono font-bold text-brand-green">
                    ${analyst.totalEarned.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Win Rate</div>
                  <div className="font-mono font-bold text-brand-cyan">
                    {analyst.winRate}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NetworksSection({ onOpenContactModal }: { onOpenContactModal: () => void }) {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-lg p-12 text-center">
          <h2 className="font-syne font-bold text-3xl mb-4">
            For Affiliate Networks
          </h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Are you an affiliate network looking to add a DeFi prediction market to
            your portfolio?
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              "✓ Sub-affiliate tracking",
              "✓ Custom commission structures",
              "✓ Real-time reporting dashboard",
              "✓ USDC payouts",
              "✓ Dedicated account manager",
              "✓ White-label options",
              "✓ API access",
              "✓ Priority support",
            ].map((feature, i) => (
              <div key={i} className="text-sm text-gray-300">
                {feature}
              </div>
            ))}
          </div>

          <div className="mb-6">
            <div className="text-sm text-gray-400 mb-2">Verticals that convert:</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["⚽ Premier League", "⚽ Serie A", "⚽ Champions League", "⚽ Top European leagues"].map(
                (sport, i) => (
                  <div
                    key={i}
                    className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-sm"
                  >
                    {sport}
                  </div>
                )
              )}
            </div>
          </div>

          <button
            onClick={onOpenContactModal}
            className="px-8 py-4 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors cursor-pointer"
          >
            Contact Affiliate Manager →
          </button>
        </div>
      </div>
    </section>
  );
}

function FAQSection({
  openFaq,
  setOpenFaq,
}: {
  openFaq: number | null;
  setOpenFaq: (i: number | null) => void;
}) {
  const faqs = [
    {
      q: "How are rewards calculated?",
      a: "You earn 35% of the 1% taker fee generated by users who copy your trades. If you also referred that user, you earn an additional 15%, for a total of 50%. For example: User trades $1,000 → $10 fee → You earn $3.50 (or $5.00 if you referred them). No tiers, no thresholds, no complexity.",
    },
    {
      q: "When do I get paid?",
      a: "Rewards accumulate in your account and are paid out in USDC when you reach €10. During the demo phase, payouts are manual by the founder. After mainnet launch, payouts will be automatic via smart contract.",
    },
    {
      q: "Do I need to apply to become an analyst?",
      a: "No. Every wallet is automatically an analyst from the moment you connect. Just start trading and if users copy you, you earn. That's it. No application, no approval, no waiting.",
    },
    {
      q: "Can I promote on any channel?",
      a: "Yes! X/Twitter, YouTube, TikTok, Instagram, Telegram, podcasts, blogs — anywhere you have an audience. We provide tracking links and branded assets.",
    },
    {
      q: "Do my followers need KYC?",
      a: "No. Predictio is fully decentralized. Users just connect their wallet and start with $1,000 demo credit. No personal information required.",
    },
    {
      q: "Can I be both trader and analyst?",
      a: "Absolutely! Many of our top analysts also trade on their own predictions. You can earn from both your trades and your copiers' trades.",
    },
    {
      q: "What if I refer users but they don't copy me?",
      a: "You still earn 15% of their trading fees as referral rewards. The analyst share (35%) goes to whoever they choose to copy, or to the treasury if they trade independently.",
    },
    {
      q: "Is there a referral link for networks?",
      a: "Yes, affiliate networks get custom tracking and can manage their own sub-affiliates. Contact us for network partnerships.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-white/5">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-syne font-bold text-4xl text-center mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-gray-400 mb-12">
          Everything you need to know about the analyst program.
        </p>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span className="font-semibold">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 text-gray-400 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  const { isConnected } = useWalletStore();
  
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-green/20 rounded-full blur-3xl" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {isConnected ? (
          <>
            <h2 className="font-syne font-bold text-4xl md:text-5xl mb-6">
              You're Already an Analyst
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              View your analyst dashboard and get your referral link.
            </p>
            <Link
              to="/analyst-dashboard"
              className="inline-block px-12 py-5 bg-brand-green text-brand-bg font-bold text-lg rounded-lg hover:bg-brand-green/90 transition-colors mb-8"
            >
              View Dashboard →
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-syne font-bold text-4xl md:text-5xl mb-6">
              Ready to Monetize Your Sports Knowledge?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Every wallet is an analyst. Connect to start earning lifetime rewards.
            </p>
            <Link
              to="/"
              className="inline-block px-12 py-5 bg-brand-green text-brand-bg font-bold text-lg rounded-lg hover:bg-brand-green/90 transition-colors mb-8"
            >
              Connect Wallet →
            </Link>
          </>
        )}
        
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <a href="mailto:affiliate@predictio.live" className="hover:text-brand-green transition-colors cursor-pointer">
            affiliate@predictio.live
          </a>
          <span>·</span>
          <a href="https://x.com/predictio_io" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors cursor-pointer">
            𝕏 @predictio_io
          </a>
          <span>·</span>
          <a href="https://t.me/predictio_affiliate" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors cursor-pointer">
            ✈️ @predictio_affiliate
          </a>
        </div>
      </div>
    </section>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-bg border border-white/10 rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-syne font-bold text-2xl mb-4">Contact Affiliate Manager</h3>
        <p className="text-sm text-gray-400 mb-6">
          Tell us about your network and we'll get back to you within 24 hours.
        </p>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Company</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none"
              placeholder="Acme Affiliates"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none"
              placeholder="john@acme.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Message</label>
            <textarea
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:border-brand-green focus:outline-none resize-none"
              placeholder="Tell us about your network..."
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-brand-green text-brand-bg font-bold rounded hover:bg-brand-green/90 transition-colors cursor-pointer"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

