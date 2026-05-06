import { Link } from "@tanstack/react-router";
import { TrendingUp, Users, DollarSign } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Analyst } from "~/types/affiliate";
import { useTRPC } from "~/trpc/react";
import { useWalletStore } from "~/store/useWalletStore";
import { VerificationBadge } from "~/components/analyst/VerificationBadge";

interface AnalystCardProps {
  analyst: Analyst;
}

export function AnalystCard({ analyst }: AnalystCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const wallet = useWalletStore((state) => state.address);
  const openWalletModal = useWalletStore((state) => state.openWalletModal);

  // Check if user is already following this analyst
  const followStatusQuery = useQuery({
    ...trpc.isFollowingAnalyst.queryOptions({
      analystId: analyst.id,
      userWallet: wallet || '',
    }),
    enabled: !!wallet,
  });

  const isFollowing = followStatusQuery.data?.isFollowing ?? false;

  const followMutation = useMutation(
    trpc.followAnalyst.mutationOptions({
      onSuccess: () => {
        toast.success("Successfully followed analyst!");
        // Invalidate queries to refresh data
        const followStatusKey = trpc.isFollowingAnalyst.queryKey({
          analystId: analyst.id,
          userWallet: wallet || '',
        });
        const detailKey = trpc.getAnalystDetail.queryKey({ analystId: analyst.id });
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
          analystId: analyst.id,
          userWallet: wallet || '',
        });
        const detailKey = trpc.getAnalystDetail.queryKey({ analystId: analyst.id });
        queryClient.invalidateQueries({ queryKey: followStatusKey });
        queryClient.invalidateQueries({ queryKey: detailKey });
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to unfollow analyst");
      },
    })
  );

  const handleFollowToggle = () => {
    if (!wallet) {
      openWalletModal();
      return;
    }
    
    if (isFollowing) {
      unfollowMutation.mutate({
        analystId: analyst.id,
        userWallet: wallet,
      });
    } else {
      followMutation.mutate({
        analystId: analyst.id,
        userWallet: wallet,
      });
    }
  };

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all hover:border-brand-green/30">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
            {analyst.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-syne font-bold text-lg">{analyst.displayName}</h3>
              <VerificationBadge 
                isVerified={analyst.isVerified || false}
                verificationTier={analyst.verificationTier as any}
                size="sm"
                showLabel={false}
              />
            </div>
            <p className="text-xs text-gray-400 font-mono">{analyst.wallet}</p>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          35% commission
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{analyst.bio}</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-white/10">
        <div>
          <div className="text-xs text-gray-500 mb-1">ROI</div>
          <div className="font-mono font-bold text-brand-green">+{analyst.roi}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
          <div className="font-mono font-bold text-brand-cyan">{analyst.winRate}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Predictions</div>
          <div className="font-mono font-bold">{analyst.totalPredictions}</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <DollarSign className="w-4 h-4" />
            <span>Avg Odds</span>
          </div>
          <span className="font-mono font-semibold">{analyst.avgOdds}x</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span>Followers</span>
          </div>
          <span className="font-mono font-semibold">{analyst.followersCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <TrendingUp className="w-4 h-4" />
            <span>Vol Generated</span>
          </div>
          <span className="font-mono font-semibold text-brand-green">
            ${(analyst.volumeGenerated / 1000).toFixed(0)}K
          </span>
        </div>
      </div>

      {/* Win Rate Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Accuracy</span>
          <span>{analyst.winRate}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-green to-brand-cyan"
            style={{ width: `${analyst.winRate}%` }}
          />
        </div>
      </div>

      {/* Latest Prediction */}
      <div className="bg-white/5 rounded p-3 mb-4">
        <div className="text-xs text-gray-500 mb-1">Latest</div>
        <div className="text-sm font-semibold">Real Madrid Win</div>
        <div className="text-xs text-gray-400 mt-1">124 copied</div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={handleFollowToggle}
          disabled={isPending || followStatusQuery.isLoading}
          className={`px-4 py-2 border rounded font-semibold text-sm transition-colors cursor-pointer ${
            isFollowing
              ? "bg-white/10 text-gray-400 border-white/10 hover:bg-white/5 hover:text-white hover:border-white/20"
              : "bg-brand-green/20 text-brand-green border-brand-green/30 hover:bg-brand-green/30"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isFollowing ? `Unfollow ${analyst.displayName}` : `Follow ${analyst.displayName}`}
        >
          {isPending ? "..." : isFollowing ? "Following" : "Follow"}
        </button>
        <Link
          to="/analysts/$id"
          params={{ id: analyst.id }}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded font-semibold text-sm hover:bg-white/10 transition-colors text-center cursor-pointer"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
