import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { ShareModal } from './ShareModal';

interface ShareButtonProps {
  text: string;
  url?: string;
  marketId?: string;
  marketData?: {
    homeTeam: string;
    awayTeam: string;
    competition: string;
    yesPrice: number;
    volume: number;
    closesAt: Date;
    isLive: boolean;
  };
  userPosition?: {
    outcome: 'YES' | 'NO';
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    shares: number;
  };
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ShareButton({ 
  text, 
  url, 
  marketId,
  marketData: providedMarketData,
  userPosition,
  variant = 'secondary',
  size = 'md',
  className = '' 
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const trpc = useTRPC();

  // Fetch market data if marketId is provided but marketData is not
  const marketQuery = useQuery({
    ...trpc.getMarketDetail.queryOptions({
      marketId: marketId || '',
    }),
    enabled: !!marketId && !providedMarketData,
  });

  const marketData = providedMarketData || (marketQuery.data ? {
    homeTeam: marketQuery.data.market.teamA,
    awayTeam: marketQuery.data.market.teamB,
    competition: marketQuery.data.market.league,
    yesPrice: marketQuery.data.market.yesPrice,
    volume: marketQuery.data.market.volume,
    closesAt: marketQuery.data.market.closesAt,
    isLive: marketQuery.data.market.status === 'closing-soon',
  } : undefined);

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
      primary: 'bg-brand-green text-brand-bg hover:bg-brand-green/90',
      secondary: 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-green',
      ghost: 'hover:bg-white/5',
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className={getButtonClasses()}
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        marketId={marketId}
        marketData={marketData}
        userPosition={userPosition}
      />
    </>
  );
}
