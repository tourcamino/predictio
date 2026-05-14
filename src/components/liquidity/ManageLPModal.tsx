import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, TrendingUp, Calendar } from 'lucide-react';
import { formatLPDuration } from '~/utils/lpUtils';
import { AddLiquidityModal } from './AddLiquidityModal';
import { WithdrawLPModal } from './WithdrawLPModal';
import { APYTrendChart } from './APYTrendChart';
import { LPPerformanceChart } from './LPPerformanceChart';
import { useTRPC } from '~/trpc/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '~/store/useWalletStore';
import toast from 'react-hot-toast';
import type { LPPosition } from '~/data/mockLP';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';
import { useWalletGate } from '~/hooks/useWalletGate';

interface ManageLPModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: LPPosition;
  onSuccess?: () => void;
}

export function ManageLPModal({ isOpen, onClose, position, onSuccess }: ManageLPModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'apy-trend' | 'performance'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [apyTimeRange, setApyTimeRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  
  const { address } = useWallet();
  const { requireWalletAndChain } = useWalletGate();
  const walletKey = normalizeWalletForQuery(address);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const claimFeesMutation = useMutation(trpc.claimLPFees.mutationOptions());

  // Fetch APY history
  const apyHistoryQuery = useQuery({
    ...trpc.getMarketAPYHistory.queryOptions({
      marketId: position.marketId,
      timeRange: apyTimeRange,
    }),
  });

  const pnl = position.currentValue - position.deposited;
  const pnlPct = position.deposited > 0 ? (pnl / position.deposited) * 100 : 0;
  const duration = formatLPDuration(position.openSince);

  const handleClaimFees = async () => {
    if (!requireWalletAndChain()) return;
    if (!walletKey || position.feesPending <= 0) return;

    try {
      const result = await claimFeesMutation.mutateAsync({
        positionId: position.id,
        walletAddress: walletKey,
      });

      toast.success(`Claimed $${result.amount.toFixed(2)} in fees!`);

      if (walletKey) {
        invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      toast.error('Failed to claim fees');
    }
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-250"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-brand-navy border border-brand-green/30 shadow-2xl transition-all">
                  {/* Header */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <Dialog.Title className="font-syne text-2xl font-bold mb-2">
                          Manage LP Position
                        </Dialog.Title>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-xl">{position.sportEmoji}</span>
                          <span>{position.marketName}</span>
                        </div>
                      </div>
                      <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mt-6">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-2 px-1 font-medium transition-colors ${
                          activeTab === 'overview'
                            ? 'text-brand-green border-b-2 border-brand-green'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab('performance')}
                        className={`pb-2 px-1 font-medium transition-colors ${
                          activeTab === 'performance'
                            ? 'text-brand-green border-b-2 border-brand-green'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Performance
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-2 px-1 font-medium transition-colors ${
                          activeTab === 'history'
                            ? 'text-brand-green border-b-2 border-brand-green'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        History
                      </button>
                      <button
                        onClick={() => setActiveTab('apy-trend')}
                        className={`pb-2 px-1 font-medium transition-colors ${
                          activeTab === 'apy-trend'
                            ? 'text-brand-green border-b-2 border-brand-green'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        APY Trend
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-xs text-gray-400 mb-1">Deposited</div>
                            <div className="font-mono font-bold text-lg">${position.deposited.toFixed(2)}</div>
                          </div>
                          <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-xs text-gray-400 mb-1">Current Value</div>
                            <div className="font-mono font-bold text-lg">${position.currentValue.toFixed(2)}</div>
                            <div className={`text-xs mt-1 ${pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                              {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                            </div>
                          </div>
                          <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-xs text-gray-400 mb-1">Pool Share</div>
                            <div className="font-mono font-bold text-lg">{(position.poolShare * 100).toFixed(2)}%</div>
                          </div>
                          <div className="p-4 bg-white/5 rounded-lg">
                            <div className="text-xs text-gray-400 mb-1">APY</div>
                            <div className="font-mono font-bold text-lg text-brand-green">{position.apy.toFixed(1)}%</div>
                          </div>
                        </div>

                        {/* Fees Section */}
                        <div className="p-4 bg-brand-green/5 border border-brand-green/20 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="text-sm text-gray-400 mb-1">Fees Earned</div>
                              <div className="font-mono font-bold text-2xl text-brand-green">
                                ${position.feesEarned.toFixed(2)} USDC
                              </div>
                            </div>
                            <TrendingUp className="w-8 h-8 text-brand-green" />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Unclaimed fees:</span>
                            <span className="font-mono font-semibold">${position.feesPending.toFixed(2)} USDC</span>
                          </div>
                        </div>

                        {/* Position Info */}
                        <div className="p-4 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span>Position open since {position.openSince.toLocaleDateString()}</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            Duration: {duration}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={handleClaimFees}
                            disabled={position.feesPending <= 0 || claimFeesMutation.isPending}
                            className="py-3 bg-brand-green/20 text-brand-green border border-brand-green/30 font-semibold rounded-lg hover:bg-brand-green/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {claimFeesMutation.isPending ? 'Claiming...' : `Claim $${position.feesPending.toFixed(2)}`}
                          </button>
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
                          >
                            Add More
                          </button>
                          <button
                            onClick={() => setShowWithdrawModal(true)}
                            className="py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'performance' && (
                      <div>
                        <LPPerformanceChart
                          data={(() => {
                            // Build performance data from position history
                            const performanceData: Array<{
                              timestamp: Date;
                              type: 'deposit' | 'withdrawal' | 'fee';
                              amount: number;
                              cumulativeDeposits: number;
                              cumulativeWithdrawals: number;
                              cumulativeFees: number;
                              totalValue: number;
                            }> = [];

                            let cumulativeDeposits = 0;
                            const cumulativeWithdrawals = 0;
                            let cumulativeFees = 0;

                            // Add initial deposit
                            cumulativeDeposits = position.deposited;
                            performanceData.push({
                              timestamp: position.openSince,
                              type: 'deposit',
                              amount: position.deposited,
                              cumulativeDeposits,
                              cumulativeWithdrawals,
                              cumulativeFees,
                              totalValue: position.deposited,
                            });

                            // Add fee earnings from history
                            position.feeHistory.forEach((feeEntry, index) => {
                              cumulativeFees = feeEntry.cumulative;
                              const totalValue = cumulativeDeposits - cumulativeWithdrawals + cumulativeFees;
                              
                              // Parse date from string format "MMM DD"
                              const currentYear = new Date().getFullYear();
                              const [monthRaw, dayRaw] = feeEntry.date.split(' ');
                              const month = monthRaw ?? 'Jan';
                              const dayStr = dayRaw ?? '1';
                              const monthIndex = new Date(`${month} 1, 2000`).getMonth();
                              const timestamp = new Date(currentYear, monthIndex, parseInt(dayStr, 10));
                              
                              performanceData.push({
                                timestamp,
                                type: 'fee',
                                amount: feeEntry.amount,
                                cumulativeDeposits,
                                cumulativeWithdrawals,
                                cumulativeFees,
                                totalValue,
                              });
                            });

                            // Sort by timestamp
                            performanceData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                            return performanceData;
                          })()}
                          summary={{
                            totalDeposited: position.deposited,
                            totalWithdrawn: 0,
                            totalFeesEarned: position.feesEarned,
                            currentValue: position.currentValue,
                            netDeposits: position.deposited,
                            roi: ((position.currentValue - position.deposited) / position.deposited) * 100,
                          }}
                          marketName={position.marketName}
                        />
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <div className="space-y-4">
                        <h3 className="font-semibold mb-4">Fee Earnings History</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="border-b border-white/10">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Date</th>
                                <th className="px-4 py-3 text-right text-xs font-mono text-gray-400 uppercase">Fees Earned</th>
                                <th className="px-4 py-3 text-right text-xs font-mono text-gray-400 uppercase">Cumulative</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {position.feeHistory.map((entry, index) => (
                                <tr key={index} className="hover:bg-white/5 transition-colors">
                                  <td className="px-4 py-3 text-sm">{entry.date}</td>
                                  <td className="px-4 py-3 text-sm text-right font-mono text-brand-green">
                                    +${entry.amount.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                                    ${entry.cumulative.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeTab === 'apy-trend' && (
                      <div>
                        {apyHistoryQuery.isLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
                          </div>
                        ) : apyHistoryQuery.error ? (
                          <div className="text-center py-12 text-red-500">
                            Failed to load APY history
                          </div>
                        ) : apyHistoryQuery.data ? (
                          <APYTrendChart
                            data={apyHistoryQuery.data.history}
                            summary={apyHistoryQuery.data.summary}
                            timeRange={apyTimeRange}
                            onTimeRangeChange={setApyTimeRange}
                            marketName={position.marketName}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Add Liquidity Modal */}
      {showAddModal && (
        <AddLiquidityModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          market={{
            id: position.marketId,
            name: position.marketName,
            sport: position.sport,
            sportEmoji: position.sportEmoji,
            league: position.league,
            poolSize: 50000, // Mock - would come from API
            apy: position.apy,
            volume24h: 10000, // Mock
            risk: 'medium',
            myShare: position.poolShare,
            myDeposit: position.deposited,
            myValue: position.currentValue,
            feesEarned: position.feesEarned,
            feesPending: position.feesPending,
            closesAt: new Date(),
            status: 'open',
          }}
          onSuccess={() => {
            setShowAddModal(false);
            if (onSuccess) onSuccess();
          }}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <WithdrawLPModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          position={position}
          onSuccess={() => {
            setShowWithdrawModal(false);
            onClose();
            if (onSuccess) onSuccess();
          }}
        />
      )}
    </>
  );
}
