import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "~/components/Header";
import { Footer } from "~/components/Footer";
import {
  TierBadge,
  verificationToRewardTier,
} from "~/components/affiliate/TierBadge";
import { useTRPC } from "~/trpc/react";
import { useWalletStore } from "~/store/useWalletStore";
import {
  Copy,
  Download,
  ExternalLink,
  Link2,
  Share2,
  ImageIcon,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/analyst-dashboard/materials/")({
  component: MaterialsPage,
});

function MaterialsPage() {
  const trpc = useTRPC();
  const wallet = useWalletStore((state) => state.address);
  const openWalletModal = useWalletStore((state) => state.openWalletModal);

  const [utmSource, setUtmSource] = useState("twitter");
  const [utmMedium, setUtmMedium] = useState("social");
  const [utmCampaign, setUtmCampaign] = useState("referral");
  const [customUtm, setCustomUtm] = useState("");

  const dashboardQuery = useQuery({
    ...trpc.getAnalystDashboard.queryOptions({ wallet: wallet || "" }),
    enabled: !!wallet,
  });

  const handleCopyLink = (link: string, label: string) => {
    navigator.clipboard.writeText(link);
    toast.success(`${label} copied to clipboard!`);
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-gray-400 mb-6">
              Please connect your wallet to access marketing materials.
            </p>
            <button
              onClick={openWalletModal}
              className="px-8 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (dashboardQuery.isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-pulse">Loading materials...</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Analyst Profile Not Found</h1>
            <p className="text-gray-400 mb-6">
              You need to register as an analyst first.
            </p>
            <Link
              to="/affiliates"
              className="inline-block px-8 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              Join Analyst Program
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { analyst } = dashboardQuery.data;
  const baseReferralLink = `${window.location.origin}/join/${analyst.referralCode}`;
  
  // Build tracking link with UTM parameters
  const buildTrackingLink = () => {
    const params = new URLSearchParams();
    if (utmSource) params.append("utm_source", utmSource);
    if (utmMedium) params.append("utm_medium", utmMedium);
    if (utmCampaign) params.append("utm_campaign", utmCampaign);
    if (customUtm) params.append("utm_content", customUtm);
    
    return `${baseReferralLink}?${params.toString()}`;
  };

  const trackingLink = buildTrackingLink();

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link
            to="/analyst-dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="font-syne font-bold text-4xl">Marketing Materials</h1>
              <TierBadge
                tier={verificationToRewardTier(analyst.verificationTier)}
                size="md"
              />
            </div>
            <p className="text-gray-400">
              Resources to help you promote Predictio and grow your referrals
            </p>
          </div>

          {/* Referral Link Generator */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-brand-green" />
              <h2 className="font-syne font-bold text-xl">Referral Link</h2>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Share this link to earn commissions on your referrals' trading activity
            </p>

            <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4 mb-4">
              <div className="text-xs text-gray-400 mb-2">Your Base Referral Link</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-black/20 px-3 py-2 rounded overflow-x-auto">
                  {baseReferralLink}
                </code>
                <button
                  onClick={() => handleCopyLink(baseReferralLink, "Referral link")}
                  className="p-2 bg-brand-green text-brand-bg rounded hover:bg-brand-green/90 transition-colors flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickCopyButton
                icon={<Share2 className="w-4 h-4" />}
                label="Twitter/X"
                onClick={() =>
                  handleCopyLink(
                    `Check out Predictio - the best platform for sports prediction markets! Join me: ${baseReferralLink}`,
                    "Twitter message"
                  )
                }
              />
              <QuickCopyButton
                icon={<Share2 className="w-4 h-4" />}
                label="Telegram"
                onClick={() =>
                  handleCopyLink(
                    `🎯 Trade sports outcomes on Predictio!\n\nJoin using my referral link: ${baseReferralLink}`,
                    "Telegram message"
                  )
                }
              />
              <QuickCopyButton
                icon={<Share2 className="w-4 h-4" />}
                label="Discord"
                onClick={() =>
                  handleCopyLink(
                    `Hey! Check out Predictio for sports prediction markets: ${baseReferralLink}`,
                    "Discord message"
                  )
                }
              />
            </div>
          </div>

          {/* Tracking Link Builder */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="w-5 h-5 text-brand-cyan" />
              <h2 className="font-syne font-bold text-xl">Tracking Link Builder</h2>
            </div>

            <p className="text-gray-400 text-sm mb-6">
              Add UTM parameters to track which channels drive the most referrals
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Source</label>
                <select
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-cyan focus:outline-none"
                >
                  <option value="twitter">Twitter</option>
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                  <option value="reddit">Reddit</option>
                  <option value="youtube">YouTube</option>
                  <option value="email">Email</option>
                  <option value="website">Website</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Medium</label>
                <select
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-cyan focus:outline-none"
                >
                  <option value="social">Social</option>
                  <option value="post">Post</option>
                  <option value="dm">Direct Message</option>
                  <option value="story">Story</option>
                  <option value="video">Video</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Campaign</label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="e.g., summer2024"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Custom Label (Optional)
                </label>
                <input
                  type="text"
                  value={customUtm}
                  onChange={(e) => setCustomUtm(e.target.value)}
                  placeholder="e.g., banner-ad"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-cyan focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-2">Generated Tracking Link</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-black/20 px-3 py-2 rounded overflow-x-auto">
                  {trackingLink}
                </code>
                <button
                  onClick={() => handleCopyLink(trackingLink, "Tracking link")}
                  className="p-2 bg-brand-cyan text-brand-bg rounded hover:bg-brand-cyan/90 transition-colors flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Downloadable Assets */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-brand-green" />
              <h2 className="font-syne font-bold text-xl">Brand Assets</h2>
            </div>

            <p className="text-gray-400 text-sm mb-6">
              Download official Predictio graphics and banners for your promotions
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AssetCard
                title="Logo Pack"
                description="PNG and SVG logos in various colors"
                icon={<ImageIcon className="w-6 h-6" />}
                downloadUrl="#"
              />
              <AssetCard
                title="Social Banners"
                description="1200x628px banners for social media"
                icon={<ImageIcon className="w-6 h-6" />}
                downloadUrl="#"
              />
              <AssetCard
                title="Twitter Headers"
                description="1500x500px header images"
                icon={<ImageIcon className="w-6 h-6" />}
                downloadUrl="#"
              />
              <AssetCard
                title="Instagram Stories"
                description="1080x1920px story templates"
                icon={<ImageIcon className="w-6 h-6" />}
                downloadUrl="#"
              />
              <AssetCard
                title="Discord Banners"
                description="960x540px server banners"
                icon={<ImageIcon className="w-6 h-6" />}
                downloadUrl="#"
              />
              <AssetCard
                title="Brand Guidelines"
                description="PDF with usage guidelines"
                icon={<FileText className="w-6 h-6" />}
                downloadUrl="#"
              />
            </div>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-500">
                <strong>Note:</strong> Please follow our brand guidelines when using these
                assets. Do not modify logos or use unofficial color schemes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function QuickCopyButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function AssetCard({
  title,
  description,
  icon,
  downloadUrl,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  downloadUrl: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-brand-green/20 rounded-lg text-brand-green">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <a
        href={downloadUrl}
        download
        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-brand-green/20 text-brand-green rounded-lg hover:bg-brand-green/30 transition-all text-sm font-semibold"
      >
        <Download className="w-4 h-4" />
        Download
      </a>
    </div>
  );
}
