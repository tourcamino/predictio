import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTRPC } from '~/trpc/react';
import { invalidateAllPointsSummaryQueries } from '~/utils/invalidateWalletNotifications';
import { useTradingStore } from '~/store/tradingStore';

/**
 * Hook that polls Azuro Protocol every 5 minutes to check for resolved markets
 * Shows toast notifications when markets are resolved
 */
export function useAzuroResolutionPolling() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const positions = useTradingStore(state => state.positions);
  const updatePosition = useTradingStore(state => state.updatePosition);
  const notifiedMarkets = useRef(new Set<string>());
  
  // Get list of active market IDs from user positions
  const activeMarketIds = positions
    .filter(p => p.status === 'live' || p.status === 'soon')
    .map(p => p.marketId);
  
  // Mutation to resolve paper positions
  const resolveMutation = useMutation(trpc.resolvePaperPositions.mutationOptions());
  
  // Poll every 5 minutes (300000ms)
  const resolutionQuery = useQuery({
    ...trpc.checkAzuroResolutions.queryOptions({
      activeMarketIds,
    }),
    enabled: activeMarketIds.length > 0,
    refetchInterval: 300000, // 5 minutes
    staleTime: 290000, // 4 minutes 50 seconds
  });
  
  // Handle resolved markets
  useEffect(() => {
    if (!resolutionQuery.data?.resolvedMarkets) return;
    
    resolutionQuery.data.resolvedMarkets.forEach(async (resolved) => {
      // Skip if already notified
      if (notifiedMarkets.current.has(resolved.marketId)) return;
      
      // Find affected positions
      const affectedPositions = positions.filter(p => p.marketId === resolved.marketId);
      
      if (affectedPositions.length > 0) {
        // Mark as notified
        notifiedMarkets.current.add(resolved.marketId);
        
        // Resolve paper positions in the database
        try {
          await resolveMutation.mutateAsync({
            marketId: resolved.marketId,
            winningOutcome: resolved.result as 'YES' | 'NO',
          });
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({
            queryKey: trpc.getUserPositions.queryKey({ walletAddress: '', status: 'all' }),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.getPortfolioSummary.queryKey({ walletAddress: '' }),
          });
          invalidateAllPointsSummaryQueries(queryClient);

          console.log(`[Paper Trading] Resolved positions for market ${resolved.marketId}`);
        } catch (error) {
          console.error(`[Paper Trading] Failed to resolve positions for market ${resolved.marketId}:`, error);
        }
        
        // Update position status in store
        affectedPositions.forEach(position => {
          updatePosition(position.id, {
            status: 'resolved',
            resolvedAt: new Date(),
          });
        });
        
        // Show toast notification
        toast.success(
          `Market resolved! Check your portfolio to see results.`,
          {
            duration: 5000,
            icon: '✅',
          }
        );
        
        console.log(`[Azuro] Market ${resolved.marketId} resolved: ${resolved.result}`);
      }
    });
  }, [resolutionQuery.data, positions, updatePosition, resolveMutation, queryClient, trpc]);
  
  return {
    isPolling: resolutionQuery.isFetching,
    lastChecked: resolutionQuery.data?.checkedAt,
  };
}
