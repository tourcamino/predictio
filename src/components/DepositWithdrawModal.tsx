import { useState, useEffect } from 'react';
import { TransactionModal } from './TransactionModal';
import { useWallet } from '~/store/useWalletStore';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { useTRPC } from '~/trpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import { invalidateWalletPointsSummary } from '~/utils/invalidateWalletNotifications';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';

type TransactionState = 'review' | 'pending' | 'mining' | 'success' | 'error';

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
}

export function DepositWithdrawModal({ isOpen, onClose, type }: DepositWithdrawModalProps) {
  const { address } = useWallet();
  const { cashUsdc: paperCash } = usePaperWalletBalance();
  const walletKey = normalizeWalletForQuery(address);
  const [amount, setAmount] = useState('');
  const [transactionState, setTransactionState] = useState<TransactionState>('review');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const depositMutation = useMutation(trpc.depositUSDC.mutationOptions());
  const withdrawMutation = useMutation(trpc.withdrawUSDC.mutationOptions());

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setAmount('');
        setTransactionState('review');
        setTxHash('');
        setError('');
      }, 300);
    }
  }, [isOpen]);

  const amountNum = parseFloat(amount) || 0;
  const fee = amountNum * 0.001;
  const netAmount = type === 'deposit' ? amountNum - fee : amountNum - fee;
  const isValidAmount =
    amountNum > 0 &&
    (type === 'deposit' ? netAmount >= 1 : amountNum <= paperCash && amountNum >= 1);

  const handleConfirm = async () => {
    if (!isValidAmount || !walletKey) return;

    setTransactionState('pending');
    setError('');

    try {
      const result =
        type === 'withdraw'
          ? await withdrawMutation.mutateAsync({
              amount: amountNum,
              walletAddress: walletKey,
            })
          : await depositMutation.mutateAsync({
              amount: Math.max(1, netAmount),
              walletAddress: walletKey,
            });

      setTxHash(result.txHash);
      setTransactionState('mining');

      await new Promise((resolve) => setTimeout(resolve, 600));

      setTransactionState('success');
      toast.success(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} successful!`);
      if (walletKey) {
        invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);
        invalidateWalletPointsSummary(
          queryClient,
          trpc.getPointsSummary.queryKey,
          walletKey,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      setError(msg);
      setTransactionState('error');
      toast.error(`${type === 'deposit' ? 'Deposit' : 'Withdrawal'} failed`);
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

  const quickAmounts =
    type === 'deposit'
      ? [10, 50, 100, 500]
      : [10, 50, Math.min(100, paperCash), Math.min(paperCash, 500)].filter((a) => a > 0);

  return (
    <>
      {transactionState === 'review' && (
        <TransactionModal
          isOpen={isOpen}
          onClose={handleClose}
          state="review"
          type={type}
          amount={amountNum}
          fee={fee}
          potentialWin={0}
          netProfit={0}
          onConfirm={handleConfirm}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount (USDC)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-lg font-mono"
                autoFocus
              />
              {type === 'withdraw' && (
                <p className="text-xs text-gray-400 mt-1">
                  Available (paper): ${paperCash.toFixed(2)} USDC
                </p>
              )}
            </div>

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
              {type === 'withdraw' && paperCash > 0 && (
                <button
                  onClick={() => setAmount(paperCash.toString())}
                  className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-colors text-sm font-semibold"
                >
                  Max
                </button>
              )}
            </div>

            {amountNum > 0 && type === 'withdraw' && amountNum > paperCash && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>Insufficient balance</span>
              </div>
            )}

            {amountNum > 0 && amountNum < 1 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                <AlertCircle className="w-4 h-4" />
                <span>Minimum amount is $1 USDC</span>
              </div>
            )}

            {isValidAmount && (
              <div className="p-4 bg-white/5 rounded-lg space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-bold">${amountNum.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network Fee:</span>
                  <span>${fee.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="font-semibold">
                    {type === 'deposit' ? 'You will receive:' : 'You will send:'}
                  </span>
                  <span className="text-brand-green font-bold">${netAmount.toFixed(2)} USDC</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                className="flex-1 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValidAmount}
                className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm {type === 'deposit' ? 'Deposit' : 'Withdrawal'}
              </button>
            </div>
          </div>
        </TransactionModal>
      )}

      {(transactionState === 'pending' ||
        transactionState === 'mining' ||
        transactionState === 'success' ||
        transactionState === 'error') && (
        <TransactionModal
          isOpen={isOpen}
          onClose={handleClose}
          state={transactionState}
          type={type}
          amount={amountNum}
          fee={fee}
          txHash={txHash}
          error={error}
          onRetry={handleRetry}
        />
      )}
    </>
  );
}
