import { createFileRoute, Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Send, AlertCircle, Trophy, TrendingUp } from 'lucide-react';
import { CHAIN_CONFIG } from '~/config/chain';
import { useState } from 'react';
import { DepositWithdrawModal } from '~/components/DepositWithdrawModal';
import { useWalletGate } from '~/hooks/useWalletGate';
import { WalletGateModal } from '~/components/WalletGateModal';
import { GuestPageState } from '~/components/GuestPageState';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { normalizeWalletForQuery, clientChainScopeForTrpc } from '~/utils/walletQuery';
import {
  dbActivityAmountPrefix,
  dbActivityPrimaryLine,
  dbActivitySecondaryLine,
  dbActivityTypeLabel,
} from '~/lib/wallet/dbActivityDisplay';

export const Route = createFileRoute('/wallet/')({
  component: WalletDashboard,
});

function WalletDashboard() {
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const { isConnected, address, balanceEth, balanceEthUsd, chainId } = useWallet();
  const { cashUsdc, inOpenPositions, totalAtCost } = usePaperWalletBalance();
  const trpc = useTRPC();
  const walletKey = normalizeWalletForQuery(address);
  const chainScope = clientChainScopeForTrpc(chainId);

  const recentActivityQuery = useQuery({
    ...trpc.getTransactionHistory.queryOptions({
      walletAddress: walletKey,
      limit: 10,
      offset: 0,
      type: 'all',
      clientChainId: chainScope,
    }),
    enabled: !!walletKey && isConnected,
  });

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const tradesRemaining = Math.floor(balanceEthUsd / CHAIN_CONFIG.gas.avgTradeCostUsd);
  const isEthLow = balanceEthUsd < CHAIN_CONFIG.gas.lowBalanceThresholdUsd;

  const rows = recentActivityQuery.data?.transactions ?? [];

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Your Wallet</h1>
            <div className="flex items-center gap-2 text-gray-400">
              {isConnected && address ? (
                <span className="font-mono text-sm">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              ) : (
                <span className="text-sm text-gray-500">Guest — connect to manage funds on-chain</span>
              )}
            </div>
          </div>

          {!isConnected ? (
            <GuestPageState onConnect={() => requireWallet()} />
          ) : (
            <>
              <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-lg">
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">USDC Balance</div>
                  <div className="font-mono text-4xl font-bold text-white mb-4">
                    ${totalAtCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Available to trade</div>
                      <div className="font-mono font-semibold text-brand-green">
                        ${cashUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">In open positions</div>
                      <div className="font-mono font-semibold">
                        ${inOpenPositions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDepositModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-colors"
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    Withdraw
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
                    title="Send to another wallet (coming soon)"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              </div>

              <div
                className={`mb-8 p-6 border rounded-lg ${
                  isEthLow ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">ETH Balance (for gas)</div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <div className="font-mono text-2xl font-bold">{balanceEth.toFixed(4)} ETH</div>
                    <div className="text-gray-400">(~${balanceEthUsd.toFixed(2)})</div>
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
                  type="button"
                  className="w-full py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-colors"
                >
                  Top up ETH
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-syne font-bold text-2xl">Recent activity</h2>
                  <Link
                    to="/wallet/transactions"
                    className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Source: database (tRPC) · chain scope {chainScope}
                  {import.meta.env.DEV && import.meta.env.VITE_ACTIVITY_DEBUG === '1'
                    ? ` · updatedAt ${recentActivityQuery.dataUpdatedAt || '—'}`
                    : ''}
                </p>

                {recentActivityQuery.isLoading ? (
                  <div className="p-8 bg-white/5 border border-white/10 rounded-lg text-center text-gray-400">
                    Loading activity…
                  </div>
                ) : recentActivityQuery.isError ? (
                  <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-lg text-center text-red-200 text-sm">
                    Could not load activity.
                  </div>
                ) : rows.length > 0 ? (
                  <div className="space-y-2">
                    {rows.map((tx) => {
                      const prefix = dbActivityAmountPrefix(tx);
                      const secondary = dbActivitySecondaryLine(tx);
                      const icon =
                        tx.type === 'wallet_deposit' || tx.type === 'deposit' ? (
                          <ArrowDownCircle className="w-5 h-5" />
                        ) : tx.type === 'wallet_withdrawal' || tx.type === 'withdrawal' ? (
                          <ArrowUpCircle className="w-5 h-5" />
                        ) : tx.type === 'position_settlement_win' ||
                          tx.type === 'lp_reward_claim' ||
                          tx.type === 'holding_reward' ||
                          tx.type === 'analyst_reward' ||
                          tx.type === 'affiliate_reward' ||
                          tx.type === 'bet_won' ||
                          tx.type === 'reward_claim' ||
                          tx.type === 'lp_fee_claim' ? (
                          <Trophy className="w-5 h-5" />
                        ) : tx.type === 'position_open' || tx.type === 'bet_placed' ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <Wallet className="w-5 h-5" />
                        );
                      const iconWrap =
                        tx.type === 'wallet_deposit' || tx.type === 'deposit'
                          ? 'bg-brand-green/20 text-brand-green'
                          : tx.type === 'wallet_withdrawal' || tx.type === 'withdrawal'
                            ? 'bg-red-500/20 text-red-500'
                            : tx.type === 'position_settlement_win' ||
                                tx.type === 'lp_reward_claim' ||
                                tx.type === 'holding_reward' ||
                                tx.type === 'analyst_reward' ||
                                tx.type === 'affiliate_reward' ||
                                tx.type === 'bet_won' ||
                                tx.type === 'reward_claim' ||
                                tx.type === 'lp_fee_claim'
                              ? 'bg-purple-500/20 text-purple-400'
                              : tx.type === 'position_open' || tx.type === 'bet_placed'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-gray-500/20 text-gray-400';

                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
                              {icon}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate">{dbActivityTypeLabel(tx.type)}</div>
                              <div className="text-sm text-gray-400 truncate">{dbActivityPrimaryLine(tx)}</div>
                              {secondary ? (
                                <div className="text-xs text-gray-500 truncate">{secondary}</div>
                              ) : null}
                              <div className="text-xs text-gray-500">
                                {new Date(tx.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div
                              className={`font-mono font-semibold ${
                                prefix === '+' ? 'text-brand-green' : prefix === '-' ? 'text-red-400' : 'text-white'
                              }`}
                            >
                              {prefix}${tx.amount.toFixed(2)}
                            </div>
                            <div
                              className={`text-xs ${
                                tx.status === 'completed' ? 'text-brand-green' : tx.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
                              }`}
                            >
                              {tx.status === 'completed' && '✓ Completed'}
                              {tx.status === 'pending' && '⏳ Pending'}
                              {tx.status === 'failed' && '✗ Failed'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 bg-white/5 border border-white/10 rounded-lg text-center">
                    <Wallet className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No ledger rows yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

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
      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}
