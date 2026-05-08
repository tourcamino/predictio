import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "~/components/Header";
import { FeeBreakdownCard } from '~/components/FeeBreakdownCard';
import { GuestPageState } from "~/components/GuestPageState";
import { WalletGateModal } from "~/components/WalletGateModal";
import { useWalletGate } from "~/hooks/useWalletGate";
import { useTRPC } from "~/trpc/react";
import { useWalletStore } from "~/store/useWalletStore";
import {
  DollarSign,
  Users,
  TrendingUp,
  Copy,
  Share2,
  Edit,
  Save,
  X,
  ExternalLink,
  Target,
  MessageCircle,
  Send,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/analyst-dashboard/")({
  component: AnalystDashboardPage,
});

function AnalystDashboardPage() {
  const trpc = useTRPC();
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const wallet = useWalletStore((state) => state.address);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
    avatar: "",
    autoCompound: false,
    twitterUrl: "",
    telegramUrl: "",
    websiteUrl: "",
  });

  const [followersOffset, setFollowersOffset] = useState(0);
  const followersLimit = 10;

  const dashboardQuery = useQuery({
    ...trpc.getAnalystDashboard.queryOptions({ wallet: wallet || "" }),
    enabled: !!wallet,
  });

  const { data, isLoading, error } = dashboardQuery;
  const refetch = dashboardQuery.refetch;

  const followersQuery = useQuery({
    ...trpc.getAnalystFollowers.queryOptions({
      analystWallet: wallet || '',
      limit: followersLimit,
      offset: followersOffset,
    }),
    enabled: !!wallet && !!data,
  });

  // Initialize form when data loads
  useEffect(() => {
    if (data?.analyst && profileForm.displayName === "") {
      setProfileForm({
        displayName: data.analyst.displayName,
        bio: data.analyst.bio,
        avatar: data.analyst.avatar,
        autoCompound: data.analyst.autoCompound,
        twitterUrl: data.analyst.twitterUrl || "",
        telegramUrl: data.analyst.telegramUrl || "",
        websiteUrl: data.analyst.websiteUrl || "",
      });
    }
  }, [data?.analyst, profileForm.displayName]);

  const updateProfileMutation = useMutation(
    trpc.updateAnalystProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile updated successfully!");
        setIsEditingProfile(false);
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.message);
      },
    })
  );

  const claimRewardsMutation = useMutation(
    trpc.claimAnalystRewards.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Successfully claimed $${data.amountClaimed.toFixed(2)}!`);
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.message);
      },
    })
  );

  const handleSaveProfile = () => {
    if (!wallet) return;
    
    updateProfileMutation.mutate({
      wallet,
      ...profileForm,
    });
  };

  const handleClaimRewards = () => {
    if (!wallet) return;
    
    if (analyst.pendingRewards <= 0) {
      toast.error("No pending rewards to claim");
      return;
    }
    
    claimRewardsMutation.mutate({ wallet });
  };

  const handleCopyReferralLink = () => {
    if (!data?.analyst.referralCode) return;
    
    const link = `${window.location.origin}/join/${data.analyst.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-gray-400 mb-8">
              Track your performance, earnings, and referrals when connected.
            </p>
            <GuestPageState
              description="Connect wallet to access your analyst dashboard"
              onConnect={() => requireWallet()}
            />
          </div>
        </div>
        <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-pulse">Loading dashboard...</div>
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
      </div>
    );
  }

  const { analyst, earningsHistory, referralStats } = data;

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Analyst Dashboard</h1>
            <p className="text-gray-400">
              Track your performance, earnings, and referrals
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Pending Rewards</span>
              </div>
              <div className="font-mono font-bold text-3xl text-brand-green mb-3">
                ${analyst.pendingRewards.toFixed(2)}
              </div>
              <button
                onClick={handleClaimRewards}
                disabled={analyst.pendingRewards <= 0 || claimRewardsMutation.isPending}
                className="w-full px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {claimRewardsMutation.isPending ? "Claiming..." : "Claim Rewards"}
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Total Earned</span>
              </div>
              <div className="font-mono font-bold text-3xl text-brand-cyan">
                ${analyst.totalEarned.toFixed(2)}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Target className="w-5 h-5" />
                <span className="text-sm">Prediction Accuracy</span>
              </div>
              <div className="font-mono font-bold text-3xl text-brand-cyan">
                {analyst.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {analyst.totalPredictions} predictions
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">Valid Followers</span>
              </div>
              <div className="font-mono font-bold text-3xl">{analyst.validFollowers}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">Volume Generated</span>
              </div>
              <div className="font-mono font-bold text-3xl">
                ${(analyst.volumeGenerated / 1000).toFixed(0)}K
              </div>
            </div>
          </div>

          {/* Analyst Earnings Explanation */}
          <div className="bg-gradient-to-br from-brand-cyan/20 to-brand-cyan/5 border-2 border-brand-cyan/30 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-brand-cyan" />
              </div>
              <div className="flex-1">
                <h3 className="font-syne font-bold text-xl mb-2 text-brand-cyan">
                  How You Earn as an Analyst
                </h3>
                <p className="text-gray-300 mb-4">
                  As an analyst, you earn <span className="font-bold text-brand-cyan">35% of all trading fees</span> generated 
                  when other users copy your predictions. The more followers who copy your trades, the more you earn.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Your Commission Rate</div>
                    <div className="font-mono font-bold text-3xl text-brand-cyan mb-1">35%</div>
                    <div className="text-xs text-gray-400">Of all trading fees from copied trades</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Estimated Earnings</div>
                    <div className="font-mono font-bold text-2xl text-brand-green mb-1">
                      ${(analyst.volumeGenerated * 0.01 * 0.35).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">Based on ${analyst.volumeGenerated.toLocaleString()} volume generated</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Marketing Materials CTA */}
          <Link
            to="/analyst-dashboard/materials"
            className="block bg-gradient-to-r from-brand-green/20 to-brand-cyan/20 border border-brand-green/30 rounded-lg p-6 mb-8 hover:from-brand-green/30 hover:to-brand-cyan/30 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-syne font-bold text-xl mb-2">Marketing Materials</h3>
                <p className="text-gray-400 text-sm">
                  Get referral links, tracking tools, and downloadable assets to grow your network
                </p>
              </div>
              <ExternalLink className="w-6 h-6 text-brand-green flex-shrink-0" />
            </div>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Profile Management - Now takes full width on large screens */}
            <div className="lg:col-span-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-syne font-bold text-xl">Profile</h2>
                  {!isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        className="p-2 hover:bg-brand-green/20 text-brand-green rounded transition-colors"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                      <input
                        type="text"
                        value={profileForm.displayName}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, displayName: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Avatar (Emoji)</label>
                      <input
                        type="text"
                        value={profileForm.avatar}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, avatar: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
                        maxLength={2}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-400 mb-2">Bio</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, bio: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none"
                        rows={4}
                        maxLength={500}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        <MessageCircle className="w-4 h-4 inline mr-1" />
                        Twitter URL
                      </label>
                      <input
                        type="url"
                        value={profileForm.twitterUrl}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, twitterUrl: e.target.value })
                        }
                        placeholder="https://twitter.com/yourhandle"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        <Send className="w-4 h-4 inline mr-1" />
                        Telegram URL
                      </label>
                      <input
                        type="url"
                        value={profileForm.telegramUrl}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, telegramUrl: e.target.value })
                        }
                        placeholder="https://t.me/yourhandle"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        <Globe className="w-4 h-4 inline mr-1" />
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={profileForm.websiteUrl}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, websiteUrl: e.target.value })
                        }
                        placeholder="https://yourwebsite.com"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:outline-none text-sm"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoCompound"
                        checked={profileForm.autoCompound}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, autoCompound: e.target.checked })
                        }
                        className="w-4 h-4"
                      />
                      <label htmlFor="autoCompound" className="text-sm">
                        Auto-compound rewards
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-3xl">
                          {analyst.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-xl">{analyst.displayName}</div>
                          <div className="text-sm text-gray-400">
                            All analysts earn 35% of trading fees
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{analyst.bio}</p>
                    </div>

                    {(analyst.twitterUrl || analyst.telegramUrl || analyst.websiteUrl) && (
                      <div className="border-l border-white/10 pl-6">
                        <div className="text-xs text-gray-500 mb-3">Social Links</div>
                        <div className="flex flex-wrap gap-2">
                          {analyst.twitterUrl && (
                            <a
                              href={analyst.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Twitter
                            </a>
                          )}
                          {analyst.telegramUrl && (
                            <a
                              href={analyst.telegramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
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
                              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                            >
                              <Globe className="w-4 h-4" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border-l border-white/10 pl-6">
                      <div className="text-xs text-gray-500 mb-3">Settings</div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-400">Auto-compound:</span>{" "}
                          <span className="font-semibold">
                            {analyst.autoCompound ? "✓ Enabled" : "✗ Disabled"}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-400">Commission Rate:</span>{" "}
                          <span className="font-semibold text-brand-green">35%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Referral Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ReferralStatsCard
              referralStats={referralStats}
              referralCode={analyst.referralCode}
              onCopyLink={handleCopyReferralLink}
            />

            <div className="space-y-6">
              <EarningsChartCard earningsHistory={earningsHistory} />
              
              {/* Fee Breakdown Card */}
              <FeeBreakdownCard variant="default" />
            </div>
          </div>

          {/* Top Referrals */}
          <TopReferralsTable referrals={referralStats.topReferrals} />

          {/* Followers List */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-syne font-bold text-xl">Your Followers</h2>
              <div className="text-sm text-gray-400">
                {followersQuery.data?.validCount || 0} valid / {followersQuery.data?.totalCount || 0} total
              </div>
            </div>

            {followersQuery.isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading followers...</div>
            ) : followersQuery.isError ? (
              <div className="text-center py-8 text-red-400">Failed to load followers</div>
            ) : followersQuery.data?.followers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No followers yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Share your referral link to grow your follower base
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                          User
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                          Volume Generated
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                          Predictions
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                          Following Since
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {followersQuery.data?.followers.map((follower) => (
                        <tr key={follower.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-lg">
                                {follower.avatar}
                              </div>
                              <div>
                                <div className="font-semibold">{follower.displayName}</div>
                                <div className="font-mono text-xs text-gray-500">
                                  {follower.wallet.slice(0, 6)}...{follower.wallet.slice(-4)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-brand-cyan">
                            ${follower.totalVolume.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono">{follower.predictions}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                follower.isValid
                                  ? 'bg-brand-green/20 text-brand-green'
                                  : 'bg-yellow-500/20 text-yellow-500'
                              }`}
                            >
                              {follower.isValid ? 'Valid' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {new Date(follower.followedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {(followersQuery.data?.hasMore || followersOffset > 0) && (
                  <div className="flex items-center justify-between mt-6">
                    <button
                      onClick={() => setFollowersOffset(Math.max(0, followersOffset - followersLimit))}
                      disabled={followersOffset === 0}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-400">
                      Showing {followersOffset + 1} - {followersOffset + (followersQuery.data?.followers.length || 0)} of {followersQuery.data?.totalCount}
                    </span>
                    <button
                      onClick={() => setFollowersOffset(followersOffset + followersLimit)}
                      disabled={!followersQuery.data?.hasMore}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function ReferralStatsCard({ referralStats, referralCode, onCopyLink }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-xl mb-4">Referral Stats</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Total Referrals</div>
          <div className="font-mono font-bold text-2xl">{referralStats.totalReferrals}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Valid Referrals</div>
          <div className="font-mono font-bold text-2xl text-brand-green">
            {referralStats.validReferrals}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Pending</div>
          <div className="font-mono font-bold text-2xl text-yellow-500">
            {referralStats.pendingReferrals}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-xs text-gray-500 mb-1">Conversion</div>
          <div className="font-mono font-bold text-2xl">
            {referralStats.conversionRate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4">
        <div className="text-xs text-gray-400 mb-2">Your Referral Link</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono bg-black/20 px-3 py-2 rounded overflow-x-auto">
            {window.location.origin}/join/{referralCode}
          </code>
          <button
            onClick={onCopyLink}
            className="p-2 bg-brand-green text-brand-bg rounded hover:bg-brand-green/90 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EarningsChartCard({ earningsHistory }: any) {
  const maxEarnings = Math.max(...earningsHistory.map((d: any) => d.earnings));
  const totalEarnings = earningsHistory.reduce((sum: number, d: any) => sum + d.earnings, 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-xl mb-4">Earnings (30 Days)</h2>

      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-1">Total</div>
        <div className="font-mono font-bold text-3xl text-brand-green">
          ${totalEarnings.toFixed(2)}
        </div>
      </div>

      <div className="relative" style={{ height: "200px" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
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

          <path
            d={
              earningsHistory
                .map((d: any, i: number) => {
                  const x = (i / (earningsHistory.length - 1)) * 100;
                  const y = 100 - (d.earnings / maxEarnings) * 100;
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ") + ` L 100 100 L 0 100 Z`
            }
            fill="#00FF87"
            fillOpacity="0.2"
          />

          <path
            d={earningsHistory
              .map((d: any, i: number) => {
                const x = (i / (earningsHistory.length - 1)) * 100;
                const y = 100 - (d.earnings / maxEarnings) * 100;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#00FF87"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}

function TopReferralsTable({ referrals }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-xl mb-6">Top Referrals</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Wallet
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Volume Generated
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Earned from User
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((ref: any, i: number) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 px-4 font-mono text-sm">{ref.wallet}</td>
                <td className="py-3 px-4 font-mono font-bold text-brand-cyan">
                  ${ref.volumeGenerated.toLocaleString()}
                </td>
                <td className="py-3 px-4 font-mono font-bold text-brand-green">
                  ${ref.earnedFromUser.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-gray-400 text-sm">
                  {new Date(ref.joinedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

