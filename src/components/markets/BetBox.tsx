import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Loader2, Zap, Lock, CheckCircle, ChevronDown } from 'lucide-react';
import { useTRPC, useTRPCClient } from '~/trpc/react';
import { Market } from '~/data/mockMarkets';
import { useWallet } from '~/store/useWalletStore';
import { useWalletGate } from '~/hooks/useWalletGate';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { WalletGateModal } from '~/components/WalletGateModal';
import { TransactionModal } from '../TransactionModal';
import { calcFee } from '~/utils/marketUtils';
import {
  invalidateWalletNotifications,
  invalidateWalletPointsSummary,
} from '~/utils/invalidateWalletNotifications';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { executePlacePredictionWithDiagnostics } from '~/lib/executePlacePredictionWithDiagnostics';

interface BetBoxProps {
  market: Market;
  selectedOutcome: string | null;
}

const predictionSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(1, 'Minimum amount is $1')
    .max(10000, 'Maximum amount is $10,000'),
});

type PredictionFormData = z.infer<typeof predictionSchema>;

export function BetBox({ market, selectedOutcome }: BetBoxProps) {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const { isConnected: isWalletConnected, address, updateBalance } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isActive: isDemoActive, executeDemoTrade } = useDemoAccount();
  const [txModalState, setTxModalState] = useState<'review' | 'pending' | 'mining' | 'success' | 'error'>('review');
  const [txError, setTxError] = useState<string | undefined>(undefined);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<PredictionFormData>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      amount: 100,
    },
  });

  const amount = watch('amount') || 0;

  const placePredictionMutation = useMutation({
    mutationFn: (input: {
      marketId: string;
      outcome: string;
      amount: number;
      walletAddress: string;
    }) =>
      executePlacePredictionWithDiagnostics(
        (i) => trpcClient.placePrediction.mutate(i),
        input,
      ),
    onSuccess: (data) => {
      setTxModalState('success');
      if (data.newBalance !== undefined) {
        updateBalance(data.newBalance);
      }
      setTimeout(() => {
        setShowTxModal(false);
        reset();
      }, 2000);
      queryClient.invalidateQueries({
        queryKey: trpc.getMarketDetail.queryKey({ marketId: market.id }),
      });
      if (walletKey) {
        queryClient.invalidateQueries({
          queryKey: trpc.getUserPositions.queryKey({ walletAddress: walletKey, status: 'all' }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getUserPositions.queryKey({ walletAddress: walletKey, status: 'open' }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.getPortfolioSummary.queryKey({ walletAddress: walletKey }),
        });
        invalidateWalletNotifications(queryClient, trpc.getNotifications.queryKey, walletKey);
        invalidateWalletPointsSummary(queryClient, trpc.getPointsSummary.queryKey, walletKey);
      }
    },
    onError: (error: Error) => {
      setTxError(error.message || 'Trade failed. Please try again.');
      setTxModalState('error');
    },
  });

  const getOutcomeData = () => {
    if (!selectedOutcome) return null;
    
    let label = '';
    let percent = 0;
    
    if (selectedOutcome === 'teamA') {
      label = market.teamA + ' Win';
      percent = market.percentA ?? 0;
    } else if (selectedOutcome === 'teamB') {
      label = market.teamB + ' Win';
      percent = market.percentB ?? 0;
    } else if (selectedOutcome === 'draw') {
      label = 'Draw';
      percent = market.percentDraw || 0;
    }
    
    const odds = percent > 0 ? 100 / percent : 0;
    
    return { label, percent, odds };
  };

  const outcomeData = getOutcomeData();

  // Live calculations
  const potentialWin = outcomeData ? amount * outcomeData.odds : 0;
  const profit = potentialWin - amount;
  const currentPrice = outcomeData ? outcomeData.percent / 100 : 0.5;
  const dynamicFeeRate = calcFee(currentPrice);
  const fee = amount * dynamicFeeRate;
  const netProfit = profit - fee;

  const mapOutcomeToSide = (): 'YES' | 'NO' | 'DRAW' | null => {
    if (selectedOutcome === 'teamA') return 'YES';
    if (selectedOutcome === 'teamB') return 'NO';
    if (selectedOutcome === 'draw') return 'DRAW';
    return null;
  };

  const onSubmit = (_data: PredictionFormData) => {
    if (!selectedOutcome) {
      toast.error('Please select an outcome first');
      return;
    }

    if (isDemoActive) {
      setTxError(undefined);
      setTxModalState('review');
      setShowTxModal(true);
      return;
    }

    if (!requireWallet()) return;

    setTxError(undefined);
    setTxModalState('review');
    setShowTxModal(true);
  };

  const handleConfirmTransaction = () => {
    setTxError(undefined);

    if (isDemoActive) {
      const side = mapOutcomeToSide();
      if (!side) {
        setTxError('Invalid outcome');
        setTxModalState('error');
        return;
      }

      const stake = watch('amount');
      const price = currentPrice;

      setTxModalState('pending');
      void (async () => {
        await new Promise((r) => setTimeout(r, 600));
        setTxModalState('mining');
        const result = await executeDemoTrade({
          marketId: market.id,
          outcome: side,
          type: 'BUY',
          amount: stake,
          price,
          marketSnapshot: market,
        });
        if (result.success) {
          setTxModalState('success');
          setTimeout(() => {
            setShowTxModal(false);
            reset();
          }, 2000);
        } else {
          setTxError(result.message);
          setTxModalState('error');
        }
      })();
      return;
    }

    if (!requireWallet()) return;
    if (!address || !walletKey) return;
    setTxModalState('pending');

    // Simulate wallet approval
    setTimeout(() => {
      setTxModalState('mining');

      const side = mapOutcomeToSide();
      if (!side) {
        setTxError('Invalid outcome');
        setTxModalState('error');
        return;
      }

      placePredictionMutation.mutate({
        marketId: market.id,
        outcome: side.toLowerCase(),
        amount: watch('amount'),
        walletAddress: walletKey,
      });
    }, 1500);
  };

  const handleAskAI = () => {
    if (!aiQuestion.trim()) return;
    
    setIsAIThinking(true);
    
    // Mock AI response with typing effect
    setTimeout(() => {
      setAiResponse(
        `Based on the current volume distribution and historical patterns, ${market.teamA} at home in ${market.league} has covered this spread 71% of the time since 2018. The current odds at ${outcomeData?.odds.toFixed(2)}x represent a value opportunity given the market sentiment and recent form.`
      );
      setIsAIThinking(false);
    }, 2000);
  };

  const quickAmounts = [10, 50, 100, 500];

  const getButtonContent = () => {
    if (!isWalletConnected && !isDemoActive) {
      return 'Connect Wallet to Predict';
    }
    if (!selectedOutcome) {
      return 'Select an Outcome';
    }
    if (amount <= 0) {
      return 'Enter Amount';
    }
    if (isDemoActive) {
      return `Place Prediction (DEMO) · $${amount.toLocaleString()} virtual USDC`;
    }
    return `Place Prediction · $${amount.toLocaleString()} USDC`;
  };

  const isButtonDisabled = !selectedOutcome || amount <= 0;

  return (
    <div className="bg-brand-bg border-2 border-brand-green/30 rounded-lg p-6 shadow-lg" data-tour="bet-box">
      <h2 className="font-syne font-bold text-xl mb-4">Place Your Prediction</h2>

      {/* Selected Outcome Display */}
      {outcomeData ? (
        <div className="mb-4 p-4 bg-brand-green/10 border border-brand-green/30 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Selected</div>
          <div className="font-syne font-bold text-lg mb-2">{outcomeData.label}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Odds:</span>
            <span className="font-mono text-lg font-bold text-brand-green">
              {outcomeData.odds.toFixed(2)}x
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="text-sm text-yellow-500">
            ⚠️ Select an outcome above to continue
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
            Amount (USDC)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              $
            </span>
            <input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              className="w-full pl-8 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-lg font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="100.00"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-500">{errors.amount.message}</p>
          )}
          
          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mt-2">
            <span className="text-xs text-gray-400 mr-1 self-center">Quick:</span>
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setValue('amount', quickAmount)}
                className="px-3 py-1 text-xs font-semibold bg-white/5 border border-white/10 rounded hover:border-brand-green hover:bg-brand-green/10 transition-all"
              >
                ${quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Potential Win Display */}
        {outcomeData && amount > 0 && (
          <div className="space-y-2">
            <div className="p-5 bg-gradient-to-br from-brand-green/20 to-brand-green/5 border-2 border-brand-green/40 rounded-lg">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-300 mb-2">💰 If you win</div>
                <div className="text-4xl font-bold text-brand-green mb-2">
                  ${potentialWin.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400 leading-relaxed">
                  If you deposit <span className="font-semibold text-white">${amount.toFixed(2)}</span>, you will win <span className="font-semibold text-brand-green">${potentialWin.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Net Profit</div>
                  <div className="text-2xl font-bold text-brand-green">
                    +${netProfit.toFixed(2)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">ROI</div>
                  <div className="text-2xl font-bold text-brand-green">
                    +{((netProfit / amount) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-white/10 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Your stake:</span>
                  <span className="text-white font-semibold">${amount.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Fee ({(dynamicFeeRate * 100).toFixed(2)}%):</span>
                  <span>~${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Odds:</span>
                  <span className="text-brand-green font-semibold">{outcomeData.odds.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isButtonDisabled}
          className="w-full py-4 bg-brand-green text-brand-bg font-bold text-lg rounded-lg hover:bg-brand-green/90 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {getButtonContent()}
        </button>
      </form>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-green" />
          <span>Powered by Azuro</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-green" />
          <span>Non-custodial · USDC</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-brand-green" />
          <span>Resolves automatically</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 bg-white/5 rounded text-xs text-gray-500 leading-relaxed">
        Prediction markets involve financial risk. Only predict with amounts you can afford to lose. Must be 18+.
      </div>

      {/* AI Prediction Assistant */}
      <div className="mt-6 border-t border-white/10 pt-6">
        <button
          onClick={() => setShowAIAssistant(!showAIAssistant)}
          className="w-full flex items-center justify-between p-4 bg-brand-cyan/5 border border-brand-cyan/30 rounded-lg hover:bg-brand-cyan/10 transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="text-brand-cyan text-lg">🤖</span>
            <span className="font-semibold text-brand-cyan">Ask AI about this market</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-brand-cyan transition-transform ${
              showAIAssistant ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showAIAssistant && (
          <div className="mt-4 space-y-4 animate-slide-down">
            {/* Quick questions */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Quick questions:</p>
              {[
                'What does the volume pattern suggest?',
                `Is ${outcomeData?.percent}% accurate for ${outcomeData?.label}?`,
                'Historical accuracy of this market type?',
              ].map((question) => (
                <button
                  key={question}
                  onClick={() => {
                    setAiQuestion(question);
                    handleAskAI();
                  }}
                  className="block w-full text-left px-3 py-2 bg-white/5 border border-white/10 rounded text-sm hover:border-brand-cyan hover:bg-brand-cyan/5 transition-all"
                >
                  {question}
                </button>
              ))}
            </div>

            {/* Ask anything */}
            <div>
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask anything about this market..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan"
              />
              <button
                onClick={handleAskAI}
                disabled={isAIThinking}
                className="mt-2 w-full py-2 bg-brand-cyan text-brand-bg font-semibold rounded-lg hover:bg-brand-cyan/90 transition-all disabled:opacity-50 text-sm"
              >
                {isAIThinking ? 'AI is thinking...' : 'Ask AI →'}
              </button>
            </div>

            {/* AI Response */}
            {aiResponse && (
              <div className="p-4 bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-brand-cyan text-lg">🤖</span>
                  <span className="font-semibold text-brand-cyan text-sm">AI Analysis:</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{aiResponse}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={showTxModal}
        onClose={() => {
          setShowTxModal(false);
          setTxError(undefined);
        }}
        state={txModalState}
        type="bet"
        marketName={market.teamA + ' vs ' + market.teamB}
        marketId={market.id}
        outcome={outcomeData?.label}
        amount={amount}
        potentialWin={potentialWin}
        fee={fee}
        netProfit={netProfit}
        error={txError}
        onConfirm={handleConfirmTransaction}
        onRetry={() => {
          setTxError(undefined);
          setTxModalState('review');
        }}
        sportEmoji={market.sportEmoji}
        league={market.league}
        teamA={market.teamA}
        teamB={market.teamB}
        odds={outcomeData?.odds || 0}
      />

      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}
