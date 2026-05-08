import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "~/components/Header";
import { PredictionAnalyticsCharts } from "~/components/analyst/PredictionAnalyticsCharts";
import { TraderPerformanceCharts } from "~/components/analyst/TraderPerformanceCharts";
import { CopyPortfolioModal } from "~/components/trading/CopyPortfolioModal";
import { VerificationBadge } from "~/components/analyst/VerificationBadge";
import { useTRPC } from "~/trpc/react";
import { useWalletStore } from "~/store/useWalletStore";
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Target,
  Award,
  Share2,
  Copy,
  CheckCircle,
  XCircle,
  Send,
  Globe,
  X,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { 
  generateTraderPerformanceShareText,
  getTwitterShareUrl,
  getTelegramShareUrl,
  getAnalystProfileUrl,
} from "~/utils/shareUtils";

export const Route = createFileRoute("/analysts/$id/")({
  component: AnalystProfilePage,
});

function AnalystProfilePage() {
  const { id } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery(
    trpc.getAnalystDetail.queryOptions({ analystId: id })
  );
  
  const wallet = useWalletStore((state) => state.address);
  const openWalletModal = useWalletStore((state) => state.openWalletModal);
  
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showSharePerformanceModal, setShowSharePerformanceModal] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('90d');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'history'>('overview');

  // Check if user is following this analyst
  const followStatusQuery = useQuery({
    ...trpc.isFollowingAnalyst.queryOptions({
      analystId: id,
      userWallet: wallet || '',
    }),
    enabled: !!wallet,
  });

  const isFollowing = followStatusQuery.data?.isFollowing ?? false;

  // Check if user is copying this analyst
  const copyRelationshipQuery = useQuery({
    ...trpc.getCopyRelationship.queryOptions({
      copierWallet: wallet || '',
      analystWallet: data?.analyst?.wallet || '',
    }),
    enabled: !!wallet && !!data?.analyst,
  });

  const existingCopy = copyRelationshipQuery.data?.relationship || null;

  const followMutation = useMutation(
    trpc.followAnalyst.mutationOptions({
      onSuccess: () => {
        toast.success("Successfully followed analyst!");
        // Invalidate queries to refresh data
        const followStatusKey = trpc.isFollowingAnalyst.queryKey({
          analystId: id,
          userWallet: wallet || '',
        });
        const detailKey = trpc.getAnalystDetail.queryKey({ analystId: id });
        queryClient.invalidateQueries({ queryKey: followStatusKey });
        queryClient.invalidateQueries({ queryKey: detailKey });
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to follow analyst");
      },
    })
  );

  const unfollowMutation = useMutation(
    trpc.unfollowAnalyst.mutationOptions({
      onSuccess: () => {
        toast.success("Successfully unfollowed analyst!");
        // Invalidate queries to refresh data
        const followStatusKey = trpc.isFollowingAnalyst.queryKey({
          analystId: id,
          userWallet: wallet || '',
        });
        const detailKey = trpc.getAnalystDetail.queryKey({ analystId: id });
        queryClient.invalidateQueries({ queryKey: followStatusKey });
        queryClient.invalidateQueries({ queryKey: detailKey });
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to unfollow analyst");
      },
    })
  );

  // Fetch prediction analytics
  const analyticsQuery = useQuery({
    ...trpc.getAnalystPredictionAnalytics.queryOptions({
      analystId: id,
      timeRange: 'all',
    }),
    enabled: !!data?.analyst,
  });

  // Fetch trader performance history
  const performanceHistoryQuery = useQuery({
    ...trpc.getTraderPerformanceHistory.queryOptions({
      walletAddress: data?.analyst?.wallet || '',
      timeRange,
    }),
    enabled: !!data?.analyst && activeTab === 'performance',
  });

  const handleFollowToggle = () => {
    if (!wallet) {
      openWalletModal();
      return;
    }
    
    if (isFollowing) {
      unfollowMutation.mutate({
        analystId: id,
        userWallet: wallet,
      });
    } else {
      followMutation.mutate({
        analystId: id,
        userWallet: wallet,
      });
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-pulse">Loading analyst profile...</div>
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
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Analyst Not Found</h1>
            <p className="text-gray-400 mb-6">
              {error?.message || "The analyst you're looking for doesn't exist."}
            </p>
            <a
              href="/analysts"
              className="inline-block px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              Browse All Analysts
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { analyst, predictionHistory, followerGrowth, performanceData } = data;

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar & Info */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-4xl">
                  {analyst.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-syne font-bold text-3xl">{analyst.displayName}</h1>
                    <VerificationBadge 
                      isVerified={analyst.isVerified || false}
                      verificationTier={analyst.verificationTier as any}
                      size="md"
                    />
                  </div>
                  <p className="text-sm text-gray-400 font-mono mb-2">{analyst.wallet}</p>
                  <div className="flex flex-wrap gap-2">
                    {analyst.sport.map((sport) => (
                      <span
                        key={sport}
                        className="px-2 py-1 bg-white/10 rounded text-xs font-semibold"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleFollowToggle}
                  disabled={isPending || followStatusQuery.isLoading}
                  className={`px-8 py-3 font-bold rounded-lg transition-colors ${
                    isFollowing
                      ? "bg-white/10 text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer"
                      : "bg-brand-green text-brand-bg hover:bg-brand-green/90"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPending ? "..." : isFollowing ? "Following" : "Follow"}
                </button>
                <button
                  onClick={() => setShowCopyModal(true)}
                  className="px-6 py-3 bg-brand-cyan/20 border border-brand-cyan text-brand-cyan font-bold rounded-lg hover:bg-brand-cyan/30 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {existingCopy ? "Manage Copy" : "Copy Portfolio"}
                </button>
                <button
                  onClick={() => setShowSharePerformanceModal(true)}
                  className="px-6 py-3 bg-brand-green/20 border border-brand-green text-brand-green font-bold rounded-lg hover:bg-brand-green/30 transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share Stats
                </button>
                <button
                  onClick={handleShare}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {copiedLink ? <Copy className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Bio */}
            <p className="text-gray-300 mt-6 max-w-3xl">{analyst.bio}</p>

            {/* Social Links */}
            {(analyst.twitterUrl || analyst.telegramUrl || analyst.websiteUrl) && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs text-gray-500 mb-2">Connect with me</div>
                <div className="flex flex-wrap gap-2">
                  {analyst.twitterUrl && (
                    <a
                      href={analyst.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                      X
                    </a>
                  )}
                  {analyst.telegramUrl && (
                    <a
                      href={analyst.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Telegram
                    </a>
                  )}
                  {analyst.websiteUrl && (
                    <a
                      href={analyst.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">ROI</span>
              </div>
              <div className="font-mono font-bold text-3xl text-brand-green">
                +{analyst.roi}%
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Target className="w-5 h-5" />
                <span className="text-sm">Win Rate</span>
              </div>
              <div className="font-mono font-bold text-3xl text-brand-cyan">
                {analyst.winRate}%
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Award className="w-5 h-5" />
                <span className="text-sm">Predictions</span>
              </div>
              <div className="font-mono font-bold text-3xl">{analyst.totalPredictions}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">Followers</span>
              </div>
              <div className="font-mono font-bold text-3xl">{analyst.followersCount}</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 border-b border-white/10">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-semibold transition-colors relative ${
                activeTab === 'overview'
                  ? 'text-brand-green'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-3 font-semibold transition-colors relative ${
                activeTab === 'performance'
                  ? 'text-brand-green'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Performance Charts
              {activeTab === 'performance' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-semibold transition-colors relative ${
                activeTab === 'history'
                  ? 'text-brand-green'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Prediction History
              {activeTab === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
              )}
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {analyticsQuery.isLoading ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                  <div className="animate-pulse text-gray-400">Loading analytics...</div>
                </div>
              ) : analyticsQuery.data && analyticsQuery.data.sportBreakdown.length > 0 ? (
                <PredictionAnalyticsCharts
                  sportBreakdown={analyticsQuery.data.sportBreakdown}
                  leagueBreakdown={analyticsQuery.data.leagueBreakdown}
                  accuracyOverTime={analyticsQuery.data.accuracyOverTime}
                />
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center text-gray-400">
                  <p>No prediction analytics available yet</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Performance Chart */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h2 className="font-syne font-bold text-xl mb-4">Performance (12 Weeks)</h2>
                  <PerformanceChart data={performanceData} />
                </div>

                {/* Follower Growth */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h2 className="font-syne font-bold text-xl mb-4">Follower Growth (30 Days)</h2>
                  <FollowerGrowthChart data={followerGrowth} />
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Time Range Selector */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-gray-400">Time Range:</div>
                <div className="flex gap-2">
                  {(['7d', '30d', '90d', '1y', 'all'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        timeRange === range
                          ? 'bg-brand-green text-brand-bg'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {range === 'all' ? 'All Time' : range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Performance Charts */}
              {performanceHistoryQuery.isLoading ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                  <div className="animate-pulse text-gray-400">Loading performance data...</div>
                </div>
              ) : performanceHistoryQuery.data ? (
                <TraderPerformanceCharts
                  pnlHistory={performanceHistoryQuery.data.pnlHistory}
                  winRateHistory={performanceHistoryQuery.data.winRateHistory}
                  roiHistory={performanceHistoryQuery.data.roiHistory}
                  volumeHistory={performanceHistoryQuery.data.volumeHistory}
                  profitDistribution={performanceHistoryQuery.data.profitDistribution}
                />
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center text-gray-400">
                  <p>No performance data available for this time range</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="font-syne font-bold text-xl mb-6">Recent Predictions</h2>
              <PredictionHistoryTable predictions={predictionHistory} />
            </div>
          )}
        </div>
      </div>

      
      {analyst && (
        <CopyPortfolioModal
          isOpen={showCopyModal}
          onClose={() => setShowCopyModal(false)}
          analyst={{
            id: analyst.id,
            wallet: analyst.wallet,
            displayName: analyst.displayName,
            avatar: analyst.avatar,
            roi: analyst.roi,
            winRate: analyst.winRate,
            totalPredictions: analyst.totalPredictions,
            sport: analyst.sport,
          }}
          existingCopy={existingCopy}
        />
      )}

      {analyst && showSharePerformanceModal && (
        <SharePerformanceModal
          isOpen={showSharePerformanceModal}
          onClose={() => setShowSharePerformanceModal(false)}
          traderData={{
            displayName: analyst.displayName,
            wallet: analyst.wallet,
            totalPnl: analyst.totalEarned,
            roi: analyst.roi,
            winRate: analyst.winRate,
            totalTrades: analyst.totalPredictions,
            totalVolume: analyst.volumeGenerated,
            isVerified: analyst.isVerified || false,
            verificationTier: analyst.verificationTier,
          }}
          analystId={analyst.id}
        />
      )}
    </div>
  );
}

function SharePerformanceModal({
  isOpen,
  onClose,
  traderData,
  analystId,
}: {
  isOpen: boolean;
  onClose: () => void;
  traderData: any;
  analystId: string;
}) {
  const trpc = useTRPC();
  const [copied, setCopied] = useState(false);
  
  // Generate OG image
  const ogImageQuery = useQuery({
    ...trpc.generateTraderOGImage.queryOptions({
      walletAddress: traderData.wallet,
      analystId: analystId,
    }),
    enabled: isOpen,
  });

  const shareUrl = getAnalystProfileUrl(analystId);
  const shareText = generateTraderPerformanceShareText(traderData);

  const handleTwitterShare = () => {
    const twitterUrl = getTwitterShareUrl(shareText, shareUrl);
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    toast.success('Opening X (Twitter)...');
  };

  const handleTelegramShare = () => {
    const telegramUrl = getTelegramShareUrl(shareText, shareUrl);
    window.open(telegramUrl, '_blank', 'width=550,height=420');
    toast.success('Opening Telegram...');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      toast.success('Text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-bg border border-white/10 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-syne font-bold text-2xl">Share Your Performance</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Preview Card */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
              {traderData.displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{traderData.displayName}</span>
                <VerificationBadge 
                  isVerified={traderData.isVerified}
                  verificationTier={traderData.verificationTier}
                  size="sm"
                  showLabel={false}
                />
              </div>
              <span className="text-sm text-gray-400">@Predictio</span>
            </div>
          </div>
          
          <div className="whitespace-pre-wrap text-sm mb-4">{shareText}</div>
          
          {ogImageQuery.data?.url && (
            <img 
              src={ogImageQuery.data.url} 
              alt="Performance preview"
              className="w-full rounded-lg border border-white/10"
            />
          )}
        </div>

        {/* Share Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleTwitterShare}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green/30 transition-all group"
          >
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <X className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Share on X (Twitter)</span>
          </button>

          <button
            onClick={handleTelegramShare}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green/30 transition-all group"
          >
            <div className="w-10 h-10 bg-[#0088cc] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Share on Telegram</span>
          </button>
        </div>

        {/* Copy Text */}
        <button
          onClick={handleCopyText}
          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
            copied
              ? 'bg-brand-green text-brand-bg'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          {copied ? '✓ Copied!' : 'Copy Share Text'}
        </button>
      </div>
    </div>
  );
}

function PerformanceChart({ data }: { data: any[] }) {
  const maxRoi = Math.max(...data.map((d) => d.roi));
  const maxWinRate = 100;

  return (
    <div className="relative" style={{ height: "250px" }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {/* Grid */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.2"
          />
        ))}

        {/* ROI Line */}
        <path
          d={data
            .map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - (d.roi / maxRoi) * 100;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#00FF87"
          strokeWidth="2"
        />

        {/* Win Rate Line */}
        <path
          d={data
            .map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - (d.winRate / maxWinRate) * 100;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#00D4FF"
          strokeWidth="2"
        />
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-green rounded-full" />
          <span className="text-gray-400">ROI</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-cyan rounded-full" />
          <span className="text-gray-400">Win Rate</span>
        </div>
      </div>
    </div>
  );
}

function FollowerGrowthChart({ data }: { data: any[] }) {
  const maxFollowers = Math.max(...data.map((d) => d.followers));

  return (
    <div className="relative" style={{ height: "250px" }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {/* Grid */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.2"
          />
        ))}

        {/* Area */}
        <path
          d={
            data
              .map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = 100 - (d.followers / maxFollowers) * 100;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ") + ` L 100 100 L 0 100 Z`
          }
          fill="#00FF87"
          fillOpacity="0.2"
        />

        {/* Line */}
        <path
          d={data
            .map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - (d.followers / maxFollowers) * 100;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#00FF87"
          strokeWidth="2"
        />
      </svg>

      <div className="mt-4 text-sm text-gray-400">
        Growth: <span className="text-brand-green font-bold">+{data[data.length - 1].followers - data[0].followers}</span> followers
      </div>
    </div>
  );
}

function PredictionHistoryTable({ predictions }: { predictions: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Event</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Sport</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Odds</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Stake</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Result</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">P/L</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Copied</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((pred) => (
            <tr key={pred.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-3 px-4 font-semibold">{pred.event}</td>
              <td className="py-3 px-4 text-gray-400">{pred.sport}</td>
              <td className="py-3 px-4 font-mono">{pred.odds}x</td>
              <td className="py-3 px-4 font-mono">${pred.stake}</td>
              <td className="py-3 px-4">
                {pred.outcome === "Won" ? (
                  <span className="flex items-center gap-1 text-brand-green">
                    <CheckCircle className="w-4 h-4" />
                    Won
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    Lost
                  </span>
                )}
              </td>
              <td
                className={`py-3 px-4 font-mono font-bold ${
                  pred.profit > 0 ? "text-brand-green" : "text-red-400"
                }`}
              >
                {pred.profit > 0 ? "+" : ""}${pred.profit}
              </td>
              <td className="py-3 px-4 text-gray-400">{pred.copiedBy}</td>
              <td className="py-3 px-4 text-gray-400 text-sm">
                {new Date(pred.timestamp).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

