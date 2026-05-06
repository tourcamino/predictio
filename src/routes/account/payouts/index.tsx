import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { useWallet } from '~/store/useWalletStore';
import { useState, useEffect } from 'react';
import { DollarSign, ChevronDown, ChevronUp, RefreshCw, TrendingUp, Clock } from 'lucide-react';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';

export const Route = createFileRoute('/account/payouts/')({
  component: PayoutHistoryPage,
});

function PayoutHistoryPage() {
  const { isConnected, address, openWalletModal } = useWallet();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const [offset, setOffset] = useState(0);
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);
  const limit = 10;

  const payoutsQuery = useQuery({
    ...trpc.getPayoutHistory.queryOptions({
      walletAddress: address || '',
      limit,
      offset,
    }),
    enabled: !!address && isConnected,
  });

  useEffect(() => {
    if (!isConnected) {
      const timer = setTimeout(() => {
        openWalletModal();
        navigate({ to: '/' });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isConnected, navigate, openWalletModal]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-gray-400">Redirecting to home...</p>
          </div>
        </div>
      </div>
    );
  }

  const PAYOUT_THRESHOLD_EUR = 10;

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Payout History</h1>
            <p className="text-gray-400">
              Track your referral and analyst reward payouts
            </p>
          </div>

          {/* Loading State */}
          {payoutsQuery.isLoading && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-4 animate-spin" />
              <p className="text-gray-400">Loading payout history...</p>
            </div>
          )}

          {/* Error State */}
          {payoutsQuery.isError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
              <p className="text-red-500">Failed to load payout history</p>
            </div>
          )}

          {/* Content */}
          {payoutsQuery.data && (
            <>
              {/* Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-sm">Total Paid (All Time)</span>
                  </div>
                  <div className="font-mono font-bold text-3xl text-brand-green">
                    ${payoutsQuery.data.summary.totalPaidUsd.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    €{payoutsQuery.data.summary.totalPaidEur.toFixed(2)} EUR
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm">Last Payout</span>
                  </div>
                  {payoutsQuery.data.summary.lastPayout ? (
                    <>
                      <div className="font-mono font-bold text-3xl">
                        ${payoutsQuery.data.summary.lastPayout.amountUsd.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(payoutsQuery.data.summary.lastPayout.date).toLocaleDateString()}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">No payouts yet</div>
                  )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-sm">Pending Payout</span>
                  </div>
                  <div className="font-mono font-bold text-3xl text-purple-400">
                    ${payoutsQuery.data.summary.pendingUsd.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    €{payoutsQuery.data.summary.pendingEur.toFixed(2)} EUR
                  </div>
                </div>
              </div>

              {/* Progress to Threshold */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Progress to €{PAYOUT_THRESHOLD_EUR} Threshold</span>
                  <span className="text-sm font-mono font-bold text-purple-400">
                    {payoutsQuery.data.summary.progressToThreshold.toFixed(0)}%
                  </span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, payoutsQuery.data.summary.progressToThreshold)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  €{Math.max(0, PAYOUT_THRESHOLD_EUR - payoutsQuery.data.summary.pendingEur).toFixed(2)} EUR remaining until next payout
                </p>
              </div>

              {/* Payouts Table */}
              {payoutsQuery.data.payouts.length > 0 ? (
                <>
                  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Amount USDC</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Amount EUR</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Reference</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Rewards</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {payoutsQuery.data.payouts.map((payout) => {
                            const isExpanded = expandedPayoutId === payout.id;
                            return (
                              <>
                                <tr
                                  key={payout.id}
                                  className="hover:bg-white/5 cursor-pointer"
                                  onClick={() => setExpandedPayoutId(isExpanded ? null : payout.id)}
                                >
                                  <td className="px-6 py-4">
                                    <div className="text-sm">
                                      {new Date(payout.date).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(payout.date).toLocaleTimeString()}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 font-mono font-bold text-brand-green">
                                    ${payout.amountUsd.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 font-mono">
                                    €{payout.amountEur.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-brand-green/20 text-brand-green">
                                      Paid
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="font-mono text-sm">{payout.reference}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-400">
                                    {payout.rewardsIncluded.length} reward{payout.rewardsIncluded.length !== 1 ? 's' : ''}
                                  </td>
                                  <td className="px-6 py-4">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={7} className="px-6 py-4 bg-white/5">
                                      <div className="space-y-2">
                                        <div className="text-sm font-semibold mb-3">Included Rewards:</div>
                                        {payout.rewardsIncluded.map((reward) => (
                                          <div
                                            key={reward.id}
                                            className="flex items-center justify-between p-3 bg-white/5 rounded"
                                          >
                                            <div className="flex-1">
                                              <div className="text-sm">
                                                {new Date(reward.date).toLocaleDateString()} - {reward.type}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Volume: ${reward.volumeUsd.toFixed(2)} · Fee: ${reward.feeUsd.toFixed(2)}
                                              </div>
                                            </div>
                                            <div className="font-mono font-semibold text-brand-green">
                                              +${reward.rewardUsd.toFixed(2)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {(payoutsQuery.data.hasMore || offset > 0) && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-400">
                        Showing {offset + 1} - {offset + payoutsQuery.data.payouts.length} of {payoutsQuery.data.totalCount}
                      </span>
                      <button
                        onClick={() => setOffset(offset + limit)}
                        disabled={!payoutsQuery.data.hasMore}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Empty State */
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                  <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No payouts yet</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Rewards are paid in USDC when they reach €{PAYOUT_THRESHOLD_EUR}.
                  </p>
                  {payoutsQuery.data.summary.pendingEur > 0 && (
                    <div className="max-w-md mx-auto">
                      <div className="bg-white/5 rounded-lg p-4 mb-4">
                        <div className="text-sm text-gray-400 mb-2">Current pending:</div>
                        <div className="font-mono text-2xl font-bold text-purple-400">
                          €{payoutsQuery.data.summary.pendingEur.toFixed(2)}
                        </div>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
                          style={{ width: `${payoutsQuery.data.summary.progressToThreshold}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info Note */}
              <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-xs text-gray-400">
                  <strong>Note:</strong> Payouts are processed in USDC on Base. Minimum payout threshold: €{PAYOUT_THRESHOLD_EUR}. 
                  Demo phase: manual transfer by founder.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
