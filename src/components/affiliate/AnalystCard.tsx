import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, Users, DollarSign, Copy } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Analyst } from "~/types/affiliate";
import { useTRPC } from "~/trpc/react";
import { useWalletStore } from "~/store/useWalletStore";
import { VerificationBadge } from "~/components/analyst/VerificationBadge";
import {
  formatRoiPct,
  formatWinRatePct,
  roiTextClass,
  shortenWallet,
  toFiniteNumber,
} from "~/utils/formatCopyTrading";

interface AnalystCardProps {
  analyst: Analyst & {
    latestTradeLabel?: string | null;
  };
}

export function AnalystCard({ analyst }: AnalystCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const wallet = useWalletStore((state) => state.address);
  const openWalletModal = useWalletStore((state) => state.openWalletModal);
  const [addressCopied, setAddressCopied] = useState(false);

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

  const copyWalletAddress = async () => {
    try {
      await navigator.clipboard.writeText(analyst.wallet);
      setAddressCopied(true);
      toast.success("Address copied");
      setTimeout(() => setAddressCopied(false), 1600);
    } catch {
      toast.error("Could not copy address");
    }
  };

  const roi = toFiniteNumber(analyst.roi, 0);
  const isUnderwater = roi < 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)] transition-all ${
        isUnderwater
          ? "border-red-500/30 bg-gradient-to-br from-red-500/10 to-white/[0.02] hover:border-red-400/40"
          : "border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] hover:border-brand-green/35 hover:shadow-[0_0_32px_rgba(0,255,135,0.06)]"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:via-brand-green/35"
        aria-hidden
      />
      {/* Header */}
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl">
            {analyst.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-syne text-lg font-bold">{analyst.displayName}</h3>
              <VerificationBadge 
                isVerified={analyst.isVerified || false}
                verificationTier={analyst.verificationTier as any}
                size="sm"
                showLabel={false}
              />
            </div>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Platform analyst · paper-tracked activity
            </p>
            <div className="mt-1 flex max-w-full items-center gap-1.5">
              <p
                className="truncate font-mono text-[11px] leading-tight text-gray-400 sm:text-xs"
                title={analyst.wallet}
              >
                {shortenWallet(analyst.wallet, 6, 5)}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  void copyWalletAddress();
                }}
                className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-brand-green"
                title="Copy full address"
                aria-label="Copy wallet address"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {addressCopied ? (
                <span className="shrink-0 text-[10px] text-brand-green">Copied</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="shrink-0 self-start rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-right">
          <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Analyst share
          </div>
          <div className="whitespace-nowrap font-mono text-xs text-gray-200">35% of fees</div>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{analyst.bio}</p>

      {isUnderwater ? (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100/95">
          Net loss on record — copying carries risk of further losses. Review history before following.
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="mb-4 grid grid-cols-3 gap-2 border-b border-white/10 pb-4 sm:gap-4">
        <div className="min-w-0">
          <div className="mb-1 text-[10px] text-gray-500 sm:text-xs">ROI</div>
          <div
            className={`truncate font-mono text-sm font-bold sm:text-base ${roiTextClass(analyst.roi)}`}
          >
            {formatRoiPct(analyst.roi)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-[10px] text-gray-500 sm:text-xs">Win Rate</div>
          <div className="truncate font-mono text-sm font-bold text-brand-cyan sm:text-base">
            {formatWinRatePct(analyst.winRate)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-[10px] text-gray-500 sm:text-xs">Predictions</div>
          <div className="truncate font-mono text-sm font-bold sm:text-base">
            {analyst.totalPredictions}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <DollarSign className="w-4 h-4" />
            <span>Avg Odds</span>
          </div>
          <span className="font-mono font-semibold">
            {Number(analyst.avgOdds).toFixed(2)}x
          </span>
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
          <span className="font-mono font-semibold text-gray-200">
            ${(analyst.volumeGenerated / 1000).toFixed(0)}K
          </span>
        </div>
      </div>

      {/* Win Rate Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Accuracy</span>
          <span>{formatWinRatePct(analyst.winRate)}</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-green to-brand-cyan"
            style={{ width: `${analyst.winRate}%` }}
          />
        </div>
      </div>

      {/* Latest activity — real label from leaderboard when orders exist */}
      <div className="bg-white/5 rounded p-3 mb-4">
        <div className="text-xs text-gray-500 mb-1">Latest activity</div>
        <div className="text-sm font-semibold truncate" title={analyst.latestTradeLabel ?? undefined}>
          {analyst.latestTradeLabel ?? "No recent paper trades"}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {analyst.followersCount} active copiers
        </div>
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
