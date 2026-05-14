import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { TrendingUp, Clock, HelpCircle, Loader2 } from 'lucide-react';
import { useTRPC } from '~/trpc/react';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';
import { normalizeWalletForQuery } from '~/utils/walletQuery';

interface HoldingRewardsSectionProps {
  walletAddress: string;
  accrued: number;
  earningRate: number;
  activePositions: number;
  nextUpdate?: string;
}

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center"
      >
        {children}
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900 border border-white/20 rounded-lg text-xs text-gray-300 leading-relaxed shadow-xl">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

export function HoldingRewardsSection({
  walletAddress,
  accrued,
  earningRate,
  activePositions,
  nextUpdate = '43 min',
}: HoldingRewardsSectionProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);

  const claimMutation = useMutation(
    trpc.claimHoldingRewards.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        const w = normalizeWalletForQuery(walletAddress);
        if (w) {
          invalidateWalletPortfolioLpQueries(queryClient, trpc, w);
        }
        setIsClaiming(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to claim rewards');
        setIsClaiming(false);
      },
    })
  );

  const handleClaim = () => {
    if (accrued < 0.01) {
      toast.error('Minimum claim amount is $0.01 USDC');
      return;
    }
    setIsClaiming(true);
    claimMutation.mutate({ walletAddress });
  };

  const canClaim = accrued >= 0.01;

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-syne font-bold text-xl">Holding Rewards</h3>
          <Tooltip content="Earn passive rewards just by holding open positions. The longer you hold, the higher your earning rate. Rewards accrue hourly and can be claimed anytime.">
            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-brand-green transition-colors" />
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-400 mb-1">Accrued rewards</div>
          <div className="font-mono text-2xl font-bold text-brand-green">
            ${accrued.toFixed(2)} USDC
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Earning rate</div>
          <div className="font-mono text-2xl font-bold text-brand-cyan">
            ~${earningRate.toFixed(2)} / day
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Active positions</div>
          <div className="font-mono text-2xl font-bold">
            {activePositions} earning
          </div>
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={!canClaim || isClaiming}
        className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
      >
        {isClaiming ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Claiming...
          </>
        ) : (
          <>
            Claim ${accrued.toFixed(2)}
            {!canClaim && ' (min $0.01)'}
          </>
        )}
      </button>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">No fees on reward claims</span>
        <div className="flex items-center gap-1 text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Next update in {nextUpdate}</span>
        </div>
      </div>
    </div>
  );
}
