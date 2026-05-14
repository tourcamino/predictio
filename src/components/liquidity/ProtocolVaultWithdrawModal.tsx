import { useState, useEffect } from 'react';
import { TransactionModal } from '../TransactionModal';
import { useWallet } from '~/store/useWalletStore';
import { useTRPC } from '~/trpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertCircle, Droplet } from 'lucide-react';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';
import { useWalletGate } from '~/hooks/useWalletGate';

type TransactionState = 'review' | 'pending' | 'mining' | 'success' | 'error';

interface ProtocolVaultWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    id: string;
    deposited: number;
    currentValue: number;
    poolShare: number;
    feesEarned: number;
    feesPending: number;
    apy: number;
    openSince: Date;
    pnl: number;
    pnlPct: number;
  };
  onSuccess?: () => void;
}

export function ProtocolVaultWithdrawModal({ 
  isOpen, 
  onClose, 
  position, 
  onSuccess 
}: ProtocolVaultWithdrawModalProps) {
  const { balance, address, updateBalance } = useWallet();
  const { requireWalletAndChain } = useWalletGate();
  const walletKey = normalizeWalletForQuery(address);
  const [amount, setAmount] = useState('');
  const [claimFees, setClaimFees] = useState(true);
  const [transactionState, setTransactionState] = useState<TransactionState>('review');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const withdrawMutation = useMutation(trpc.withdrawLiquidity.mutationOptions());

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setAmount('');
        setClaimFees(true);
        setTransactionState('review');
        setTxHash('');
        setError('');
      }, 300);
    }
  }, [isOpen]);

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= position.currentValue;
  const totalReceive = amountNum + (claimFees ? position.feesPending : 0);
  const isFullWithdrawal = amountNum >= position.currentValue;

  const handleConfirm = async () => {
    if (!requireWalletAndChain()) return;
    if (!isValidAmount || !walletKey) return;

    setTransactionState('pending');
    setError('');

    try {
      const result = await withdrawMutation.mutateAsync({
        positionId: position.id,
        amount: amountNum,
        claimFees,
        walletAddress: walletKey,
      });

      setTxHash(result.txHash);
      setTransactionState('mining');

      if (result.newBalance !== undefined) {
        updateBalance(result.newBalance);
      }

      // Simulate mining delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setTransactionState('success');
      toast.success('Withdrawal successful!');

      if (walletKey) {
        invalidateWalletPortfolioLpQueries(queryClient, trpc, walletKey);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setTransactionState('error');
      toast.error('Failed to withdraw');
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

  return (
    <>
      {transactionState === 'review' && (
        <TransactionModal
          isOpen={isOpen}
          onClose={handleClose}
          state="review"
          type="withdraw"
        >
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="w-5 h-5 text-brand-cyan" />
                <span className="font-semibold">Protocol Vault</span>
              </div>
              <div className="text-xs text-gray-400">
                Single pool across all markets
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <div className="text-sm text-gray-400 mb-2">Available to withdraw</div>
              <div className="font-mono font-bold text-2xl">${position.currentValue.toFixed(2)} USDC</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">
                  Principal: ${position.deposited.toFixed(2)}
                </span>
                <span className={`text-xs ${position.pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                  P&L: {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)} ({position.pnl >= 0 ? '+' : ''}{position.pnlPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                max={position.currentValue}
                step="0.01"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green text-lg font-mono"
                autoFocus
              />
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setAmount((position.currentValue * 0.25).toFixed(2))}
                className="py-2 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-colors text-sm font-semibold"
              >
                25%
              </button>
              <button
                onClick={() => setAmount((position.currentValue * 0.5).toFixed(2))}
                className="py-2 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-colors text-sm font-semibold"
              >
                50%
              </button>
              <button
                onClick={() => setAmount((position.currentValue * 0.75).toFixed(2))}
                className="py-2 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-colors text-sm font-semibold"
              >
                75%
              </button>
              <button
                onClick={() => setAmount(position.currentValue.toFixed(2))}
                className="py-2 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-colors text-sm font-semibold"
              >
                MAX
              </button>
            </div>

            {/* Validation messages */}
            {amountNum > position.currentValue && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>Amount exceeds available balance</span>
              </div>
            )}

            {/* Fees Option */}
            {position.feesPending > 0 && (
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Unclaimed fees</span>
                  <span className="font-mono font-semibold text-brand-green">${position.feesPending.toFixed(2)} USDC</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={claimFees}
                    onChange={(e) => setClaimFees(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
                  />
                  <span className="text-sm">Also claim fees (+${position.feesPending.toFixed(2)})</span>
                </label>
              </div>
            )}

            {/* Summary */}
            {isValidAmount && (
              <div className="p-4 bg-brand-green/5 border border-brand-green/20 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Principal withdrawn:</span>
                  <span className="font-mono font-semibold">${amountNum.toFixed(2)} USDC</span>
                </div>
                {claimFees && position.feesPending > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fees claimed:</span>
                    <span className="font-mono font-semibold text-brand-green">${position.feesPending.toFixed(2)} USDC</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Withdrawal fee:</span>
                  <span className="font-mono font-semibold">$0.00 USDC</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="font-semibold">You receive:</span>
                  <span className="font-mono font-bold text-brand-green">${totalReceive.toFixed(2)} USDC</span>
                </div>
              </div>
            )}

            {/* Warning for partial withdrawal */}
            {isValidAmount && !isFullWithdrawal && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Partial withdrawals reduce your vault share and future earnings.</span>
              </div>
            )}

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
                disabled={!isValidAmount}
                className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw
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
          type="withdraw"
          amount={totalReceive}
          txHash={txHash}
          error={error}
          onRetry={handleRetry}
        />
      )}
    </>
  );
}
