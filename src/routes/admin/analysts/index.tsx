import { createFileRoute } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { VerificationBadge } from '~/components/analyst/VerificationBadge';
import { CheckCircle, XCircle, Shield, Star, Award } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/admin/analysts/')({
  component: AdminAnalystsPage,
});

function AdminAnalystsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedAnalyst, setSelectedAnalyst] = useState<any>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Fetch all analysts
  const analystsQuery = useQuery({
    ...trpc.getAnalystLeaderboard.queryOptions({
      limit: 100,
      sortBy: 'earned',
    }),
  });

  const verifyMutation = useMutation(
    trpc.verifyAnalyst.mutationOptions({
      onSuccess: () => {
        toast.success('Analyst verified successfully!');
        setShowVerifyModal(false);
        setSelectedAnalyst(null);
        // Invalidate queries to refresh data
        const leaderboardKey = trpc.getAnalystLeaderboard.queryKey({
          limit: 100,
          sortBy: 'earned',
        });
        queryClient.invalidateQueries({ queryKey: leaderboardKey });
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to verify analyst');
      },
    })
  );

  const unverifyMutation = useMutation(
    trpc.unverifyAnalyst.mutationOptions({
      onSuccess: () => {
        toast.success('Analyst unverified successfully!');
        // Invalidate queries to refresh data
        const leaderboardKey = trpc.getAnalystLeaderboard.queryKey({
          limit: 100,
          sortBy: 'earned',
        });
        queryClient.invalidateQueries({ queryKey: leaderboardKey });
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to unverify analyst');
      },
    })
  );

  const handleVerify = (analyst: any) => {
    setSelectedAnalyst(analyst);
    setShowVerifyModal(true);
  };

  const handleUnverify = (analyst: any) => {
    if (window.confirm(`Are you sure you want to remove verification from ${analyst.displayName}?`)) {
      unverifyMutation.mutate({ analystId: analyst.id });
    }
  };

  const analysts = analystsQuery.data?.leaderboard || [];
  const verifiedCount = analysts.filter((a: any) => a.isVerified).length;
  const unverifiedCount = analysts.length - verifiedCount;

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Analyst Verification</h1>
            <p className="text-gray-400">
              Manage verification status and tiers for analysts
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-1">Total Analysts</div>
              <div className="font-mono font-bold text-3xl">{analysts.length}</div>
            </div>
            <div className="bg-white/5 border border-brand-green/30 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-1">Verified</div>
              <div className="font-mono font-bold text-3xl text-brand-green">{verifiedCount}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-1">Unverified</div>
              <div className="font-mono font-bold text-3xl text-gray-400">{unverifiedCount}</div>
            </div>
            <div className="bg-white/5 border border-yellow-500/30 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-1">Elite Traders</div>
              <div className="font-mono font-bold text-3xl text-yellow-400">
                {analysts.filter((a: any) => a.verificationTier === 'elite').length}
              </div>
            </div>
          </div>

          {/* Analysts Table */}
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Analyst
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      ROI
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Followers
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Total Earned
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {analystsQuery.isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        Loading analysts...
                      </td>
                    </tr>
                  ) : analysts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        No analysts found
                      </td>
                    </tr>
                  ) : (
                    analysts.map((analyst: any) => (
                      <tr key={analyst.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm">
                              {analyst.avatar}
                            </div>
                            <div>
                              <div className="font-semibold">{analyst.displayName}</div>
                              <div className="text-xs text-gray-500 font-mono">
                                {analyst.wallet.slice(0, 6)}...{analyst.wallet.slice(-4)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <VerificationBadge
                            isVerified={analyst.isVerified || false}
                            verificationTier={analyst.verificationTier}
                            size="sm"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-semibold text-brand-green">
                            +{analyst.roi.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-semibold text-brand-cyan">
                            {analyst.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono">
                          {analyst.followersCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-brand-green">
                            ${analyst.totalEarned.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {analyst.isVerified ? (
                              <button
                                onClick={() => handleUnverify(analyst)}
                                disabled={unverifyMutation.isPending}
                                className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors text-sm font-semibold disabled:opacity-50"
                              >
                                Unverify
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerify(analyst)}
                                disabled={verifyMutation.isPending}
                                className="px-3 py-1 bg-brand-green/20 text-brand-green border border-brand-green/30 rounded hover:bg-brand-green/30 transition-colors text-sm font-semibold disabled:opacity-50"
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>


      {/* Verify Modal */}
      {showVerifyModal && selectedAnalyst && (
        <VerifyModal
          analyst={selectedAnalyst}
          onClose={() => {
            setShowVerifyModal(false);
            setSelectedAnalyst(null);
          }}
          onVerify={(tier: 'trusted' | 'elite' | 'partner') => {
            verifyMutation.mutate({
              analystId: selectedAnalyst.id,
              verificationTier: tier,
            });
          }}
          isLoading={verifyMutation.isPending}
        />
      )}
    </div>
  );
}

function VerifyModal({
  analyst,
  onClose,
  onVerify,
  isLoading,
}: {
  analyst: any;
  onClose: () => void;
  onVerify: (tier: 'trusted' | 'elite' | 'partner') => void;
  isLoading: boolean;
}) {
  const [selectedTier, setSelectedTier] = useState<'trusted' | 'elite' | 'partner'>('trusted');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-bg border border-white/10 rounded-xl max-w-md w-full p-6">
        <h3 className="font-syne font-bold text-2xl mb-4">
          Verify {analyst.displayName}
        </h3>

        <p className="text-gray-400 mb-6">
          Select a verification tier for this analyst. This will display a badge on their profile
          and in leaderboards.
        </p>

        {/* Tier Selection */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedTier('trusted')}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
              selectedTier === 'trusted'
                ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <CheckCircle className="w-6 h-6 text-[#00D4FF]" />
            <div className="flex-1 text-left">
              <div className="font-semibold">Trusted</div>
              <div className="text-sm text-gray-400">Standard verification for reliable traders</div>
            </div>
          </button>

          <button
            onClick={() => setSelectedTier('elite')}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
              selectedTier === 'elite'
                ? 'border-[#FFD700] bg-[#FFD700]/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <Star className="w-6 h-6 text-[#FFD700]" />
            <div className="flex-1 text-left">
              <div className="font-semibold">Elite</div>
              <div className="text-sm text-gray-400">Top-performing traders with exceptional stats</div>
            </div>
          </button>

          <button
            onClick={() => setSelectedTier('partner')}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
              selectedTier === 'partner'
                ? 'border-[#9333EA] bg-[#9333EA]/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <Shield className="w-6 h-6 text-[#9333EA]" />
            <div className="flex-1 text-left">
              <div className="font-semibold">Partner</div>
              <div className="text-sm text-gray-400">Official partners and sponsored traders</div>
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onVerify(selectedTier)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-brand-green text-brand-bg rounded-lg hover:bg-brand-green/90 transition-colors font-bold disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );
}

