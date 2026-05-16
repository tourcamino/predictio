import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "~/components/Header";
import { PredictionAnalyticsCharts } from "~/components/analyst/PredictionAnalyticsCharts";
import { TraderPerformanceCharts } from "~/components/analyst/TraderPerformanceCharts";
import { CopyPortfolioModal } from "~/components/trading/CopyPortfolioModal";
import { VerificationBadge } from "~/components/analyst/VerificationBadge";
import { useTRPC } from "~/trpc/react";
import { useCopyRelationship } from "~/hooks/useCopyRelationship";
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
import { TradingModalShell } from "~/components/ui/TradingModalShell";
import {
  formatRoiPct,
  formatWinRatePct,
  roiTextClass,
  shortenWallet,
  toFiniteNumber,
} from "~/utils/formatCopyTrading";

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
  const copyRelationshipQuery = useCopyRelationship({
    copierWallet: wallet || '',
    analystWallet: data?.analyst?.wallet || '',
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
  const summaryRoi = toFiniteNumber(analyst.roi, 0);
  const isLossMaking = summaryRoi < 0;
  const avgOddsN = toFiniteNumber(analyst.avgOdds, 0);
  const riskTags: string[] = [];
  if (isLossMaking) riskTags.push("Currently underwater on headline ROI");
  if (analyst.winRate < 52) riskTags.push("Win rate below coin-flip territory");
  if (avgOddsN >= 2.2) riskTags.push("Higher average odds — payoff skew / volatility");

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
                  <p
                    className="mb-2 max-w-full truncate font-mono text-sm text-gray-400"
                    title={analyst.wallet}
                  >
                    {shortenWallet(analyst.wallet, 10, 8)}
                  </p>
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
              <div className="flex w-full flex-shrink-0 flex-wrap gap-2 md:w-auto md:justify-end">
                <button
                  onClick={handleFollowToggle}
                  disabled={isPending || followStatusQuery.isLoading}
                  className={`min-h-[44px] flex-1 px-6 py-2.5 text-sm font-bold transition-colors sm:flex-initial sm:py-3 sm:text-base ${
                    isFollowing
                      ? "cursor-pointer rounded-lg bg-white/10 text-gray-400 hover:border-white/20 hover:bg-white/5 hover:text-white"
                      : "rounded-lg bg-brand-green text-brand-bg hover:bg-brand-green/90"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isPending ? "..." : isFollowing ? "Following" : "Follow"}
                </button>
                <button
                  onClick={() => setShowCopyModal(true)}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-brand-cyan bg-brand-cyan/20 px-4 py-2.5 text-sm font-bold text-brand-cyan transition-colors hover:bg-brand-cyan/30 sm:flex-initial sm:px-6 sm:py-3 sm:text-base"
                >
                  <Copy className="h-4 w-4 shrink-0" />
                  {existingCopy ? "Manage Copy" : "Copy Portfolio"}
                </button>
                <button
                  onClick={() => setShowSharePerformanceModal(true)}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-brand-green bg-brand-green/20 px-4 py-2.5 text-sm font-bold text-brand-green transition-colors hover:bg-brand-green/30 sm:flex-initial sm:px-6 sm:py-3 sm:text-base"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  Share Stats
                </button>
                <button
                  onClick={handleShare}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 sm:h-[52px] sm:w-[52px]"
                  aria-label="Copy link"
                >
                  {copiedLink ? <Copy className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
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

            {/* Risk & transparency */}
            {(isLossMaking || riskTags.length > 0) && (
              <div
                className={`mb-8 rounded-lg border px-5 py-4 ${
                  isLossMaking
                    ? "border-red-500/35 bg-red-500/[0.07]"
                    : "border-amber-500/25 bg-amber-500/[0.06]"
                }`}
              >
                <p className="text-sm font-semibold text-white">
                  {isLossMaking
                    ? "Copying this trader could lose money"
                    : "Risk snapshot"}
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {isLossMaking
                    ? "Public ROI is negative over the tracked window. Past paper trades are not a guarantee of future results — size positions accordingly."
                    : "Markets are volatile. Review prediction history and max loss before mirroring trades."}
                </p>
                {riskTags.length > 0 && (
                  <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-gray-400">
                    {riskTags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="min-w-0 rounded-lg border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-2 flex items-center gap-2 text-gray-400">
                <TrendingUp className="h-5 w-5 shrink-0" />
                <span className="truncate text-sm">ROI</span>
              </div>
              <div
                className={`truncate font-mono text-2xl font-bold sm:text-3xl ${roiTextClass(analyst.roi)}`}
              >
                {formatRoiPct(analyst.roi)}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-2 flex items-center gap-2 text-gray-400">
                <Target className="h-5 w-5 shrink-0" />
                <span className="truncate text-sm">Win Rate</span>
              </div>
              <div className="truncate font-mono text-2xl font-bold text-brand-cyan sm:text-3xl">
                {formatWinRatePct(analyst.winRate)}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-2 flex items-center gap-2 text-gray-400">
                <Award className="h-5 w-5 shrink-0" />
                <span className="truncate text-sm">Predictions</span>
              </div>
              <div className="truncate font-mono text-2xl font-bold sm:text-3xl">
                {analyst.totalPredictions}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-2 flex items-center gap-2 text-gray-400">
                <Users className="h-5 w-5 shrink-0" />
                <span className="truncate text-sm">Followers</span>
              </div>
              <div className="truncate font-mono text-2xl font-bold sm:text-3xl">
                {analyst.followersCount}
              </div>
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
    <TradingModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Share performance"
      description="Preview and share your public stats card."
      size="lg"
    >
        {/* Preview Card */}
        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl">
              {traderData.displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-bold">{traderData.displayName}</span>
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
          
          <div className="mb-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">
            {shareText}
          </div>
          
          {ogImageQuery.data?.url && (
            <img 
              src={ogImageQuery.data.url} 
              alt="Performance preview"
              className="max-h-48 w-full rounded-lg border border-white/10 object-contain sm:max-h-56"
            />
          )}
        </div>

        {/* Share Buttons */}
        <div className="mb-4 space-y-2">
          <button
            type="button"
            onClick={handleTwitterShare}
            className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-all hover:border-brand-green/30 hover:bg-white/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black">
              <X className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold">Share on X</span>
          </button>

          <button
            type="button"
            onClick={handleTelegramShare}
            className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-all hover:border-brand-green/30 hover:bg-white/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0088cc]">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold">Share on Telegram</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopyText}
          className={`w-full rounded-lg px-4 py-3 font-semibold transition-all ${
            copied
              ? "bg-brand-green text-brand-bg"
              : "border border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          {copied ? "Copied" : "Copy share text"}
        </button>
    </TradingModalShell>
  );
}

function PerformanceChart({ data }: { data: any[] }) {
  const rois = data.map((d) => d.roi as number);
  const minRoi = Math.min(...rois, 0);
  const maxRoi = Math.max(...rois, 0);
  const span = Math.max(maxRoi - minRoi, 1e-3);
  const maxWinRate = 100;
  const lastRoi = rois[rois.length - 1] ?? 0;
  const roiStroke = lastRoi >= 0 ? "#00FF87" : "#f87171";

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

        {/* Zero baseline when ROI crosses negative/positive */}
        {minRoi < 0 && maxRoi > 0 ? (
          <line
            x1="0"
            x2="100"
            y1={100 - ((0 - minRoi) / span) * 100}
            y2={100 - ((0 - minRoi) / span) * 100}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="0.25"
            strokeDasharray="1 1"
          />
        ) : null}

        {/* ROI Line */}
        <path
          d={data
            .map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - ((d.roi - minRoi) / span) * 100;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ")}
          fill="none"
          stroke={roiStroke}
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
      <div className="flex flex-wrap gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: roiStroke }}
          />
          <span className="text-gray-400">ROI (scaled)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-brand-cyan" />
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
                {pred.outcome === "Open" ? (
                  <span className="flex items-center gap-1 text-gray-400">Open</span>
                ) : pred.outcome === "Won" ? (
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
                  pred.outcome === "Open"
                    ? "text-gray-500"
                    : pred.profit > 0
                      ? "text-brand-green"
                      : "text-red-400"
                }`}
              >
                {pred.outcome === "Open"
                  ? "—"
                  : `${pred.profit > 0 ? "+" : ""}$${pred.profit}`}
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

