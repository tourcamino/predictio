import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import {
  TierBadge,
  verificationToRewardTier,
} from '~/components/affiliate/TierBadge';
import { VerificationBadge } from '~/components/analyst/VerificationBadge';
import { TrendingUp, Target, Award, Users, UserMinus, ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { formatRoiPct, roiTextClass } from '~/utils/formatCopyTrading';

interface FollowedAnalystsTabProps {
  userWallet: string;
}

export function FollowedAnalystsTab({ userWallet }: FollowedAnalystsTabProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  const followedQuery = useQuery({
    ...trpc.getFollowedAnalysts.queryOptions({ userWallet }),
    enabled: !!userWallet,
  });

  const unfollowMutation = useMutation(
    trpc.unfollowAnalyst.mutationOptions({
      onSuccess: () => {
        toast.success('Successfully unfollowed analyst');
        // Invalidate queries to refresh data
        const followedKey = trpc.getFollowedAnalysts.queryKey({ userWallet });
        queryClient.invalidateQueries({ queryKey: followedKey });
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to unfollow analyst');
      },
    })
  );

  const handleUnfollow = (analystId: string, analystName: string) => {
    if (window.confirm(`Are you sure you want to unfollow ${analystName}?`)) {
      unfollowMutation.mutate({
        analystId,
        userWallet,
      });
    }
  };

  if (followedQuery.isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
        <div className="animate-pulse">Loading followed analysts...</div>
      </div>
    );
  }

  if (followedQuery.isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
        <p className="text-red-500">Failed to load followed analysts</p>
      </div>
    );
  }

  if (!followedQuery.data?.analysts.length) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
        <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 mb-2">You're not following any analysts yet</p>
        <p className="text-sm text-gray-500 mb-6">
          Follow top analysts to track their predictions and performance
        </p>
        <Link
          to="/analysts"
          className="inline-block px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
        >
          Browse Analysts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Following {followedQuery.data.totalCount} {followedQuery.data.totalCount === 1 ? 'Analyst' : 'Analysts'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {followedQuery.data.analysts.map((analyst) => (
          <div
            key={analyst.id}
            className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-brand-green/50 transition-all"
          >
            {/* Analyst Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-2xl">
                  {analyst.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to="/analysts/$id"
                      params={{ id: analyst.id }}
                      className="font-bold hover:text-brand-green transition-colors"
                    >
                      {analyst.displayName}
                    </Link>
                    <VerificationBadge 
                      isVerified={(analyst as any).isVerified || false}
                      verificationTier={(analyst as any).verificationTier}
                      size="sm"
                      showLabel={false}
                    />
                  </div>
                  <div>
                    <TierBadge
                      tier={verificationToRewardTier(
                        (analyst as { verificationTier?: string | null })
                          .verificationTier
                      )}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleUnfollow(analyst.id, analyst.displayName)}
                disabled={unfollowMutation.isPending}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all disabled:opacity-50"
                title="Unfollow"
              >
                <UserMinus className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded p-3">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>ROI</span>
                </div>
                <div className={`font-mono font-bold ${roiTextClass(analyst.roi)}`}>
                  {formatRoiPct(analyst.roi)}
                </div>
              </div>
              <div className="bg-white/5 rounded p-3">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <Target className="w-3 h-3" />
                  <span>Win Rate</span>
                </div>
                <div className="font-mono font-bold text-brand-cyan">{analyst.winRate}%</div>
              </div>
              <div className="bg-white/5 rounded p-3">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <Award className="w-3 h-3" />
                  <span>Predictions</span>
                </div>
                <div className="font-mono font-bold">{analyst.totalPredictions}</div>
              </div>
              <div className="bg-white/5 rounded p-3">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                  <Users className="w-3 h-3" />
                  <span>Followers</span>
                </div>
                <div className="font-mono font-bold">{analyst.followersCount}</div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{analyst.bio}</p>

            {/* Sports */}
            <div className="flex flex-wrap gap-1 mb-4">
              {analyst.sport.slice(0, 3).map((sport) => (
                <span
                  key={sport}
                  className="px-2 py-1 bg-white/10 rounded text-xs font-medium"
                >
                  {sport}
                </span>
              ))}
              {analyst.sport.length > 3 && (
                <span className="px-2 py-1 bg-white/10 rounded text-xs font-medium text-gray-400">
                  +{analyst.sport.length - 3}
                </span>
              )}
            </div>

            {/* Following Since */}
            <div className="text-xs text-gray-500 mb-3">
              Following since {new Date(analyst.followedAt).toLocaleDateString()}
            </div>

            {/* Actions */}
            <Link
              to="/analysts/$id"
              params={{ id: analyst.id }}
              className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm font-semibold"
            >
              View Profile
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
