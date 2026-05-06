import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { Edit, UserMinus, Copy, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { CopyPortfolioModal } from './CopyPortfolioModal';

interface CopyingAnalystsSectionProps {
  userWallet: string;
}

export function CopyingAnalystsSection({ userWallet }: CopyingAnalystsSectionProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editingAnalyst, setEditingAnalyst] = useState<any>(null);

  // Fetch analysts the user is copying
  const followedQuery = useQuery({
    ...trpc.getFollowedAnalysts.queryOptions({ userWallet }),
    enabled: !!userWallet,
  });

  // For each followed analyst, check if we have a copy relationship
  const analysts = followedQuery.data?.analysts || [];

  const stopCopyMutation = useMutation(
    trpc.stopCopyTrading.mutationOptions({
      onSuccess: () => {
        toast.success('Stopped copying analyst');
        queryClient.invalidateQueries();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to stop copy trading');
      },
    })
  );

  const handleStopCopy = (analystWallet: string, analystName: string) => {
    if (window.confirm(`Are you sure you want to stop copying ${analystName}?`)) {
      stopCopyMutation.mutate({
        copierWallet: userWallet,
        analystWallet,
      });
    }
  };

  if (followedQuery.isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!analysts || analysts.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
        <Copy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 mb-2">You're not copying any analysts yet</p>
        <p className="text-sm text-gray-500">
          Browse analysts and start copy trading to see them here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h3 className="font-syne font-bold text-xl">Who I'm Copying</h3>
        
        <div className="space-y-3">
          {analysts.map((analyst) => {
            // Mock copy relationship data - in production this would come from getCopyRelationship
            const copyData = {
              copyMode: 'all' as const,
              selectedMarkets: [] as string[],
              maxPerTradeUsd: 50,
              totalVolumeCopied: 0,
            };

            return (
              <div
                key={analyst.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-brand-green/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xl">
                      {analyst.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{analyst.displayName}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        {analyst.wallet.slice(0, 6)}...{analyst.wallet.slice(-4)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          Mode: {copyData.copyMode === 'all' 
                            ? 'All markets' 
                            : `${copyData.selectedMarkets.length} markets selected`}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          Max: ${copyData.maxPerTradeUsd}/trade
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingAnalyst({
                        ...analyst,
                        existingCopy: {
                          id: 'mock-id',
                          ...copyData,
                        },
                      })}
                      className="p-2 text-brand-cyan hover:bg-brand-cyan/10 rounded transition-colors"
                      title="Edit filters"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStopCopy(analyst.wallet, analyst.displayName)}
                      disabled={stopCopyMutation.isPending}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      title="Stop copying"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {copyData.totalVolumeCopied > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-brand-green" />
                      <span className="text-gray-400">Total volume copied:</span>
                      <span className="font-mono font-bold text-brand-green">
                        ${copyData.totalVolumeCopied.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingAnalyst && (
        <CopyPortfolioModal
          isOpen={!!editingAnalyst}
          onClose={() => setEditingAnalyst(null)}
          analyst={editingAnalyst}
          existingCopy={editingAnalyst.existingCopy}
        />
      )}
    </>
  );
}
