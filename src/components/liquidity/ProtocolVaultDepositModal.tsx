import { useState, useEffect } from 'react';
import { TransactionModal } from '../TransactionModal';
import { useWallet } from '~/store/useWalletStore';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { useTRPC } from '~/trpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertCircle, TrendingUp, Droplet } from 'lucide-react';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { invalidateWalletPortfolioLpQueries } from '~/utils/invalidateWalletPortfolioLpQueries';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';

type TransactionState = 'review' | 'pending' | 'mining' | 'success' | 'error';

interface ProtocolVaultDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultStats?: {
    totalLiquidity: number;
    vaultAPY: number | null;
    marketsActive: number;
  };
  onSuccess?: () => void;
}

export function ProtocolVaultDepositModal({ 
  isOpen, 
  onClose, 
  vaultStats,
  onSuccess 
}: ProtocolVaultDepositModalProps) {
  const { address, isConnected } = useWallet();
  const { cashUsdc: paperCash } = usePaperWalletBalance();
  const walletKey = normalizeWalletForQuery(address);
  const { requireWallet, requireWalletAndChain, showGateModal, closeGateModal } = useWalletGate();
  const [amount, setAmount] = useState('');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [transactionState, setTransactionState] = useState<TransactionState>('review');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const provideLiquidityMutation = useMutation(trpc.provideLiquidity.mutationOptions());

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
  
  // Calculate estimates based on vault stats
  const estimatedPoolShare = vaultStats 
    ? (amountNum / (vaultStats.totalLiquidity + amountNum)) * 100 
    : 0;
  
  const estimatedMonthlyEarnings = vaultStats && vaultStats.vaultAPY
    ? (amountNum * (vaultStats.vaultAPY / 100) / 12)
    : 0;
  
  const estimatedDailyEarnings = estimatedMonthlyEarnings / 30;

  const handleConfirm = async () => {
    if (!requireWalletAndChain()) return;
    if (!isValidAmount || !walletKey || !riskAccepted) return;

    setTransactionState('pending');
    setError('');

    try {
      // Use "protocol-vault" as a special marketId to represent the Protocol Vault
      const result = await provideLiquidityMutation.mutateAsync({
        marketId: 'protocol-vault',
        amount: amountNum,
        walletAddress: walletKey,
        currentBalance: paperCash,
      });

      setTxHash(result.txHash);
      setTransactionState('mining');

      // Simulate mining delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setTransactionState('success');
      toast.success('Liquidity added to Protocol Vault!');

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

  // If not connected, prompt to connect wallet
  const handleConnectWallet = () => {
    onClose();
    requireWallet();
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
            {/* Wallet Connection Check */}
            {!isConnected ? (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-500 mb-1">Wallet Not Connected</p>
                      <p className="text-yellow-200/80">
                        You need to connect your wallet to add liquidity to the Protocol Vault.
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleConnectWallet}
                  className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                >
                  Connect Wallet
                </button>
                
                <button
                  onClick={handleClose}
                  className="w-full py-3 border border-white/20 rounded-lg hover:bg-white/5 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {/* Protocol Vault Info */}
                <div className="p-4 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Droplet className="w-6 h-6 text-brand-cyan" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Protocol Vault</h3>
                      <p className="text-xs text-gray-400">Single pool across all markets</p>
                    </div>
                  </div>
                  
                  {vaultStats && (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Total Liquidity</div>
                        <div className="font-mono font-semibold">${(vaultStats.totalLiquidity / 1000).toFixed(1)}K</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Vault APY</div>
                        <div className="font-mono font-semibold text-brand-green">
                          {vaultStats.vaultAPY ? `${vaultStats.vaultAPY.toFixed(1)}%` : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Markets</div>
                        <div className="font-mono font-semibold">{vaultStats.marketsActive}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount Input */}
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
                {isValidAmount && vaultStats && (
                  <div className="p-4 bg-brand-green/5 border border-brand-green/20 rounded-lg space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-brand-green font-semibold mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Earnings Estimate</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your vault share:</span>
                      <span className="font-mono font-semibold">{estimatedPoolShare.toFixed(3)}%</span>
                    </div>
                    {vaultStats.vaultAPY && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Est. daily earn:</span>
                          <span className="font-mono font-semibold text-brand-green">
                            ${estimatedDailyEarnings.toFixed(2)} USDC
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Est. monthly earn:</span>
                          <span className="font-mono font-semibold text-brand-green">
                            ${estimatedMonthlyEarnings.toFixed(2)} USDC
                          </span>
                        </div>
                      </>
                    )}
                    <div className="pt-2 border-t border-white/10 text-xs text-gray-500">
                      Estimates based on current APY. Actual earnings may vary.
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
                        As a liquidity provider, you may lose part of your deposit if markets resolve 
                        with large imbalances. Your funds are automatically allocated across all active 
                        markets. Only deposit what you can afford to lose.
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
                    <span className="text-sm text-white">I understand the risks</span>
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
              </>
            )}
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
      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </>
  );
}
