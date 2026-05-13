import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, TrendingUp } from 'lucide-react';
import { useTRPC, useTRPCClient } from '~/trpc/react';
import { Market } from '~/data/mockMarkets';
import { useWallet } from '~/store/useWalletStore';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import {
  invalidateWalletNotifications,
  invalidateWalletPointsSummary,
} from '~/utils/invalidateWalletNotifications';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import {
  expressPlacePrediction,
  shouldUseExpressForWalletCritical,
} from '~/lib/expressCriticalWalletApi';

interface PredictionFormProps {
  market: Market;
  selectedOutcome: string | null;
}

const predictionSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(10000, 'Maximum prediction amount is $10,000'),
});

type PredictionFormData = z.infer<typeof predictionSchema>;

export function PredictionForm({ market, selectedOutcome }: PredictionFormProps) {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const { address, updateBalance } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PredictionFormData>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      amount: 100,
    },
  });

  const mapOutcomeToSide = (): 'YES' | 'NO' | 'DRAW' | null => {
    if (selectedOutcome === 'teamA') return 'YES';
    if (selectedOutcome === 'teamB') return 'NO';
    if (selectedOutcome === 'draw') return 'DRAW';
    return null;
  };

  const placePredictionMutation = useMutation({
    mutationFn: (input: {
      marketId: string;
      outcome: string;
      amount: number;
      walletAddress: string;
    }) => {
      if (shouldUseExpressForWalletCritical()) {
        return expressPlacePrediction(input);
      }
      return trpcClient.placePrediction.mutate(input);
    },
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.newBalance !== undefined) {
        updateBalance(data.newBalance);
      }
      reset();
      queryClient.invalidateQueries({
        queryKey: trpc.getMarketDetail.queryKey({ marketId: market.id }),
      });
      if (walletKey) {
        queryClient.invalidateQueries({
          queryKey: trpc.getUserPositions.queryKey({ walletAddress: walletKey, status: 'all' }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getPortfolioSummary.queryKey({ walletAddress: walletKey }),
        });
        invalidateWalletNotifications(queryClient, trpc.getNotifications.queryKey, walletKey);
        invalidateWalletPointsSummary(queryClient, trpc.getPointsSummary.queryKey, walletKey);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to place prediction');
    },
  });

  const onSubmit = (data: PredictionFormData) => {
    if (!selectedOutcome) {
      toast.error('Please select an outcome first');
      return;
    }
    if (!requireWallet()) return;
    if (!address) return;

    const side = mapOutcomeToSide();
    if (!side) {
      toast.error('Please select an outcome first');
      return;
    }
    if (!walletKey) return;

    placePredictionMutation.mutate({
      marketId: market.id,
      outcome: side.toLowerCase(),
      amount: data.amount,
      walletAddress: walletKey,
    });
  };

  const getOutcomeLabel = () => {
    if (!selectedOutcome) return 'No outcome selected';
    if (selectedOutcome === 'teamA') return market.teamA;
    if (selectedOutcome === 'teamB') return market.teamB;
    if (selectedOutcome === 'draw') return 'Draw';
    return selectedOutcome;
  };

  const getOutcomePercent = () => {
    if (!selectedOutcome) return 0;
    if (selectedOutcome === 'teamA') return market.percentA ?? 0;
    if (selectedOutcome === 'teamB') return market.percentB ?? 0;
    if (selectedOutcome === 'draw') return market.percentDraw || 0;
    return 0;
  };

  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg p-6">
      <h2 className="font-syne font-bold text-xl mb-4">Place Your Prediction</h2>

      {selectedOutcome ? (
        <div className="mb-4 p-4 bg-brand-green/10 border border-brand-green/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Selected Outcome</div>
              <div className="font-semibold text-lg">{getOutcomeLabel()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Current Odds</div>
              <div className="font-mono text-2xl font-bold text-brand-green">
                {getOutcomePercent()}%
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-500">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm">Select an outcome above to place a prediction</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
            Prediction Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-500" />
            </div>
            <input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="100.00"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-500">{errors.amount.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Minimum: $1 · Maximum: $10,000
          </p>
        </div>

        <button
          type="submit"
          disabled={!selectedOutcome || placePredictionMutation.isPending}
          className="w-full py-4 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {placePredictionMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Placing Prediction...
            </span>
          ) : (
            'Place Prediction'
          )}
        </button>
      </form>

      <div className="mt-4 p-4 bg-white/5 rounded-lg">
        <h3 className="text-sm font-semibold mb-2">How It Works</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Select an outcome you believe will happen</li>
          <li>• Enter the amount you want to predict</li>
          <li>• If your prediction is correct, you win based on the odds</li>
          <li>• Markets close at the scheduled time</li>
        </ul>
      </div>

      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}
