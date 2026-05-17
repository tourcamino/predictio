import { useState, useEffect } from 'react';
import { TransactionModal } from '../TransactionModal';
import { useWallet } from '~/store/useWalletStore';
import { useTRPC, useTRPCClient } from '~/trpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { provideLiquidityClient } from '~/lib/lpMutationsClient';
import { shouldUseExpressForWalletCritical } from '~/lib/expressCriticalWalletApi';
import toast from 'react-hot-toast';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { calculatePoolShare, calculateDailyEarnings, calculateMonthlyEarnings, getLPRiskBadge } from '~/utils/lpUtils';
import type { LPMarket } from '~/data/mockLP';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';
import { useWalletGate } from '~/hooks/useWalletGate';

type TransactionState = 'review' | 'pending' | 'mining' | 'success' | 'error';

interface AddLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: LPMarket;
  onSuccess?: () => void;
}

export function AddLiquidityModal({ isOpen, onClose, market, onSuccess }: AddLiquidityModalProps) {
  const { address } = useWallet();
  const { cashUsdc: paperCash } = usePaperWalletBalance();
  const { requireWalletAndChain } = useWalletGate();
  const walletKey = normalizeWalletForQuery(address);
  const [amount, setAmount] = useState('');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [transactionState, setTransactionState] = useState<TransactionState>('review');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const queryClient = useQueryClient();
  const provideLiquidityMutation = useMutation({
    mutationFn: (input: {
      marketId: string;
      amount: number;
      walletAddress: string;
      currentBalance: number;
    }) => provideLiquidityClient(trpcClient, input),
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setAmount('');
        setRiskAccepted(false);
        setTransactionState('review');
        setTxHash('');
        setError('');
      }, 300);
    }
  }, [isOpen]);

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum >= 10 && amountNum <= paperCash;
  const poolShare = calculatePoolShare(amountNum, market.poolSize);
  const dailyEarnings = calculateDailyEarnings(amountNum, market.poolSize, market.volume24h);
  const monthlyEarnings = calculateMonthlyEarnings(amountNum, market.poolSize, market.volume24h);
  const riskBadge = getLPRiskBadge(market.risk);

  const handleConfirm = async () => {
    if (!requireWalletAndChain()) return;
    if (!isValidAmount || !walletKey || !riskAccepted) return;

    setTransactionState('pending');
    setError('');

    try {
      const result = await provideLiquidityMutation.mutateAsync({
        marketId: market.id,
        amount: amountNum,
        walletAddress: walletKey,
        currentBalance: paperCash,
      });

      setTxHash(result.txHash);
      if (!shouldUseExpressForWalletCritical()) {
        setTransactionState('mining');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setTransactionState('success');
      toast.success('Liquidity added successfully!');

      if (walletKey) {
        invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setTransactionState('error');
      toast.error('Failed to add liquidity');
    }
  };

  const handleRetry = () => {
    setTransactionState('review');
    setError('');
  };

  const handleClose = () => {
    if (transactionState !== 'pending' && transactionState !== 'mining') {
      onClose();
    }
  };

  const quickAmounts = [50, 100, 250, 500].filter(a => a <= paperCash);

  return (
    <>
      {transactionState === 'review' && (
        <TransactionModal
          isOpen={isOpen}
          onClose={handleClose}
          state="review"
          type="deposit"
        >
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Market</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${riskBadge.bgColor} ${riskBadge.color}`}>
                  {riskBadge.label} Risk
                </span>
              </div>
              <p className="font-semibold mb-1">{market.name}</p>
              <p className="text-xs text-gray-400">{market.league}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-white/5 rounded-lg text-sm">
              <div>
                <div className="text-xs text-gray-400 mb-1">Pool Size</div>
                <div className="font-mono font-semibold">${(market.poolSize / 1000).toFixed(1)}K</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Est. APY</div>
                <div className="font-mono font-semibold text-brand-green">{market.apy.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">24h Volume</div>
                <div className="font-mono font-semibold">${(market.volume24h / 1000).toFixed(1)}K</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Amount to deposit (USDC)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="10"
                step="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-lg font-mono"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Wallet balance: ${paperCash.toFixed(2)} USDC
              </p>
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-colors text-sm font-semibold"
                >
                  ${quickAmount}
                </button>
              ))}
              {paperCash >= 10 && (
                <button
                  onClick={() => setAmount(Math.min(paperCash, 1000).toString())}
                  className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-colors text-sm font-semibold"
                >
                  MAX
                </button>
              )}
            </div>

            {/* Validation messages */}
            {amountNum > 0 && amountNum < 10 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                <span>Minimum deposit is $10 USDC</span>
              </div>
            )}

            {amountNum > paperCash && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>Insufficient balance</span>
              </div>
            )}

            {/* Estimates */}
            {isValidAmount && (
              <div className="p-4 bg-brand-green/5 border border-brand-green/20 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2 text-brand-green font-semibold mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Earnings Estimate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Your pool share:</span>
                  <span className="font-mono font-semibold">{poolShare.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. daily earn:</span>
                  <span className="font-mono font-semibold text-brand-green">${dailyEarnings.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. monthly earn:</span>
                  <span className="font-mono font-semibold text-brand-green">${monthlyEarnings.toFixed(2)} USDC</span>
                </div>
              </div>
            )}

            {/* Risk Disclosure */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <p className="font-semibold mb-1">Risk Disclosure</p>
                  <p className="text-yellow-200/80">
                    As an LP you may lose part of your deposit if the market resolves with a large imbalance. 
                    Only deposit what you can afford to lose.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={riskAccepted}
                  onChange={(e) => setRiskAccepted(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
                />
                <span className="text-sm text-white">I understand the risk</span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                className="flex-1 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValidAmount || !riskAccepted}
                className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deposit USDC
              </button>
            </div>
          </div>
        </TransactionModal>
      )}

      {(transactionState === 'pending' || transactionState === 'mining' || transactionState === 'success' || transactionState === 'error') && (
        <TransactionModal
          isOpen={isOpen}
          onClose={handleClose}
          state={transactionState}
          type="deposit"
          amount={amountNum}
          txHash={txHash}
          error={error}
          onRetry={handleRetry}
        />
      )}
    </>
  );
}
