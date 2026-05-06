import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { useWallet } from '~/store/useWalletStore';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Send, AlertCircle } from 'lucide-react';
import { CHAIN_CONFIG } from '~/config/chain';
import { useState } from 'react';
import { DepositWithdrawModal } from '~/components/DepositWithdrawModal';

export const Route = createFileRoute('/wallet/')({
  component: WalletDashboard,
});

function WalletDashboard() {
  const {
    isConnected,
    openWalletModal,
    address,
    balanceUsdc,
    balanceUsdcAvailable,
    balanceUsdcInPositions,
    balanceEth,
    balanceEthUsd,
    transactions,
  } = useWallet();
  
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // Calculate estimated trades remaining
  const tradesRemaining = Math.floor(balanceEthUsd / CHAIN_CONFIG.gas.avgTradeCostUsd);
  const isEthLow = balanceEthUsd < CHAIN_CONFIG.gas.lowBalanceThresholdUsd;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header />
        <div className="pt-32 pb-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
                <Wallet className="w-12 h-12 text-gray-500" />
              </div>
            </div>
            
            <h1 className="font-syne font-bold text-4xl mb-4">
              Connect Your Wallet
            </h1>
            
            <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
              Connect your wallet to manage your funds and view transaction history.
            </p>
            
            <button
              onClick={openWalletModal}
              className="px-8 py-4 bg-brand-green text-brand-bg font-bold text-lg rounded-lg hover:bg-brand-green/90 transition-all shadow-xl shadow-brand-green/20"
            >
              Connect Wallet
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const recentTransactions = transactions.slice(0, 10);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Your Wallet</h1>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
          </div>

          {/* USDC Balance Card */}
          <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-lg">
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">USDC Balance</div>
              <div className="font-mono text-4xl font-bold text-white mb-4">
                ${balanceUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 mb-1">Available to trade</div>
                  <div className="font-mono font-semibold text-brand-green">
                    ${balanceUsdcAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">In open positions</div>
                  <div className="font-mono font-semibold">
                    ${balanceUsdcInPositions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDepositModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-colors"
              >
                <ArrowDownCircle className="w-4 h-4" />
                Deposit
              </button>
              <button
                onClick={() => setWithdrawModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Withdraw
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
                title="Send to another wallet (coming soon)"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>

          {/* ETH Balance Card */}
          <div className={`mb-8 p-6 border rounded-lg ${
            isEthLow ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/10'
          }`}>
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">ETH Balance (for gas)</div>
              <div className="flex items-baseline gap-3 mb-2">
                <div className="font-mono text-2xl font-bold">
                  {balanceEth.toFixed(4)} ETH
                </div>
                <div className="text-gray-400">
                  (~${balanceEthUsd.toFixed(2)})
                </div>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-400">Estimated trades remaining: </span>
                <span className={`font-semibold ${isEthLow ? 'text-yellow-500' : 'text-white'}`}>
                  ~{tradesRemaining}
                </span>
              </div>
            </div>

            {isEthLow && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-500">
                  <div className="font-semibold mb-1">Low ETH balance</div>
                  <div>You may not have enough ETH to cover transaction fees. Top up to continue trading.</div>
                </div>
              </div>
            )}

            <button
              className="w-full py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Top up ETH
            </button>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-syne font-bold text-2xl">Recent Activity</h2>
              <Link
                to="/wallet/transactions"
                className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
              >
                View all →
              </Link>
            </div>

            {recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' ? 'bg-brand-green/20 text-brand-green' :
                        tx.type === 'withdraw' ? 'bg-red-500/20 text-red-500' :
                        tx.type === 'claim' ? 'bg-purple-500/20 text-purple-500' :
                        tx.type === 'buy' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {tx.type === 'deposit' && <ArrowDownCircle className="w-5 h-5" />}
                        {tx.type === 'withdraw' && <ArrowUpCircle className="w-5 h-5" />}
                        {tx.type === 'claim' && '💰'}
                        {tx.type === 'buy' && '🟢'}
                        {tx.type === 'sell' && '🔴'}
                      </div>
                      <div>
                        <div className="font-semibold capitalize">{tx.type}</div>
                        <div className="text-sm text-gray-400">{tx.description}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-semibold ${
                        tx.type === 'deposit' || tx.type === 'claim' ? 'text-brand-green' :
                        tx.type === 'withdraw' || tx.type === 'buy' ? 'text-red-500' :
                        'text-white'
                      }`}>
                        {(tx.type === 'deposit' || tx.type === 'claim') && '+'}
                        {(tx.type === 'withdraw' || tx.type === 'buy') && '-'}
                        ${tx.amountUsdc.toFixed(2)}
                      </div>
                      <div className={`text-xs ${
                        tx.status === 'confirmed' ? 'text-brand-green' :
                        tx.status === 'pending' ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {tx.status === 'confirmed' && '✓ Completed'}
                        {tx.status === 'pending' && '⏳ Pending'}
                        {tx.status === 'failed' && '✗ Failed'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
                <Wallet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* Modals */}
      <DepositWithdrawModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        type="deposit"
      />
      <DepositWithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        type="withdraw"
      />
    </div>
  );
}
