import { Star } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { normalizeWalletForQuery } from '~/utils/walletQuery';

interface WatchlistButtonProps {
  marketId: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
}

export function WatchlistButton({ marketId, variant = 'icon', size = 'md' }: WatchlistButtonProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { address, isConnected, openWalletModal } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const [isHovered, setIsHovered] = useState(false);

  // Check if market is in watchlist
  const watchlistQuery = useQuery({
    ...trpc.getWatchlist.queryOptions({
      walletAddress: walletKey,
    }),
    enabled: !!walletKey && isConnected,
  });

  const isInWatchlist = watchlistQuery.data?.marketIds.includes(marketId) || false;

  const addMutation = useMutation(
    trpc.addToWatchlist.mutationOptions({
      onSuccess: () => {
        toast.success('Added to watchlist');
        queryClient.invalidateQueries({
          queryKey: trpc.getWatchlist.queryKey({ walletAddress: walletKey }),
        });
      },
      onError: (error: any) => {
        if (error.message.includes('already in your watchlist')) {
          toast.error('Already in watchlist');
        } else {
          toast.error('Failed to add to watchlist');
        }
      },
    })
  );

  const removeMutation = useMutation(
    trpc.removeFromWatchlist.mutationOptions({
      onSuccess: () => {
        toast.success('Removed from watchlist');
        queryClient.invalidateQueries({
          queryKey: trpc.getWatchlist.queryKey({ walletAddress: walletKey }),
        });
      },
      onError: () => {
        toast.error('Failed to remove from watchlist');
      },
    })
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isConnected) {
      openWalletModal();
      return;
    }

    if (isInWatchlist) {
      removeMutation.mutate({
        walletAddress: walletKey,
        marketId,
      });
    } else {
      addMutation.mutate({
        walletAddress: walletKey,
        marketId,
      });
    }
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6';
  const isPending = addMutation.isPending || removeMutation.isPending;

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isPending}
        className={`p-2 rounded-lg transition-all hover:bg-white/10 disabled:opacity-50 ${
          isInWatchlist ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
        }`}
        title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <Star
          className={`${iconSize} transition-all ${
            isInWatchlist || isHovered ? 'fill-current' : ''
          }`}
        />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 ${
        isInWatchlist
          ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/30'
          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-yellow-500'
      }`}
    >
      <Star className={`${iconSize} ${isInWatchlist ? 'fill-current' : ''}`} />
      <span className="text-sm">
        {isPending ? 'Loading...' : isInWatchlist ? 'Watchlist' : 'Add to Watchlist'}
      </span>
    </button>
  );
}
