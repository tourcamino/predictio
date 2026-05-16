import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { useWallet } from '~/store/useWalletStore';
import { useState, useEffect, useMemo } from 'react';
import { User, FileText, Wallet, BarChart3, Settings, Copy, ExternalLink, TrendingUp, Trophy, Calendar, ArrowDownCircle, ArrowUpCircle, TrendingDown, RefreshCw, Users, Hexagon, CheckCircle, Circle, Gift, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { WALLET_TOAST_IDS, walletToastSuccess } from '~/lib/walletToast';
import { ShareButton } from '~/components/ShareButton';
import { generateWinShareText, generatePredictionShareText } from '~/utils/shareUtils';
import { DepositWithdrawModal } from '~/components/DepositWithdrawModal';
import { FollowedAnalystsTab } from '~/components/account/FollowedAnalystsTab';
import { ReferralDashboardTab } from '~/components/account/ReferralDashboardTab';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { useUserPositions } from '~/hooks/useUserPositions';
import { usePortfolioSummary } from '~/hooks/usePortfolioSummary';
import { useTransactionHistory } from '~/hooks/useTransactionHistory';
import type { LedgerHistoryFilter } from '~/lib/ledger/ledgerTransactionTypes';
import { dbActivityAmountPrefix, dbActivityTypeLabel } from '~/lib/wallet/dbActivityDisplay';
import { usePaperWalletBalance } from '~/hooks/usePaperWalletBalance';
import { usePointsSummary } from '~/hooks/usePointsSummary';

const ACCOUNT_TAB_KEYS = [
  'overview',
  'predictions',
  'wallet',
  'history',
  'stats',
  'points',
  'followed-analysts',
  'referral-earnings',
  'payout-history',
  'analytics',
  'settings',
] as const;

type TabType = (typeof ACCOUNT_TAB_KEYS)[number];

const accountSearchSchema = z.object({
  tab: fallback(z.enum(ACCOUNT_TAB_KEYS), 'overview').default('overview'),
});

export const Route = createFileRoute('/account/')({
  validateSearch: zodValidator(accountSearchSchema),
  component: AccountPage,
});

function AccountPage() {
  const { isConnected, address, openWalletModal, disconnectWallet, chainId } = useWallet();
  const { cashUsdc: paperCash, inOpenPositions, totalAtCost } = usePaperWalletBalance();
  const navigate = useNavigate({ from: '/account' });
  const { tab: activeTab } = Route.useSearch();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');
  const [depositWithdrawModal, setDepositWithdrawModal] = useState<{ isOpen: boolean; type: 'deposit' | 'withdraw' }>({
    isOpen: false,
    type: 'deposit',
  });

  const trpc = useTRPC();
  const walletKey = normalizeWalletForQuery(address);
  const [transactionType, setTransactionType] = useState<LedgerHistoryFilter>('all');
  const [transactionOffset, setTransactionOffset] = useState(0);
  const transactionLimit = 20;
  const [predictionStatusFilter, setPredictionStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const positionsQuery = useUserPositions({
    status: 'all',
    enabled: !!walletKey && (activeTab === 'overview' || activeTab === 'predictions'),
  });

  const positionsEarly = positionsQuery.data?.positions ?? [];
  const positionMarketIds = useMemo(() => {
    const ids = new Set<string>();
    positionsEarly.forEach((p) => ids.add(p.marketId));
    return [...ids];
  }, [positionsEarly]);

  const marketSummariesQuery = useQuery({
    ...trpc.getMarketSummaries.queryOptions({
      marketIds: positionMarketIds,
    }),
    enabled:
      !!walletKey &&
      (activeTab === 'overview' || activeTab === 'predictions') &&
      positionMarketIds.length > 0,
    staleTime: 30_000,
  });

  const marketById = marketSummariesQuery.data ?? {};

  const filteredAccountPredictions = useMemo(() => {
    const list = positionsQuery.data?.positions ?? [];
    if (predictionStatusFilter === 'all') return list;
    if (predictionStatusFilter === 'open') return list.filter((p) => p.status === 'open');
    return list.filter((p) => p.status !== 'open');
  }, [positionsQuery.data?.positions, predictionStatusFilter]);

  const summaryQuery = usePortfolioSummary({
    enabled: !!walletKey && (activeTab === 'overview' || activeTab === 'predictions' || activeTab === 'stats'),
  });

  const pointsQuery = usePointsSummary({
    enabled: !!walletKey && activeTab === 'points',
  });
  
  const getTierColor = (tier: string | undefined) => {
    switch (tier) {
      case 'DIAMOND': return '#00D4FF';
      case 'GOLD': return '#FFD700';
      case 'SILVER': return '#C0C0C0';
      case 'BRONZE': return '#CD7F32';
      default: return '#CD7F32';
    }
  };
  
  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      WALLET_CONNECTED: 'Wallet connected',
      FIRST_TRADE: 'First trade',
      TRADE_PLACED: 'Trade placed',
      TRADE_CLOSED: 'Position closed / reduced',
      DAILY_LOGIN: 'Daily login',
      MARKET_RESOLVED_WIN: 'Won a market',
      LIQUIDITY_ADDED: 'Added liquidity',
      STREAK_7_DAYS: '7-day streak',
      STREAK_30_DAYS: '30-day streak',
      REFERRAL_CONVERTED: 'Referral converted',
      DEPOSIT_COMPLETED: 'Deposit completed',
      WITHDRAW_COMPLETED: 'Withdrawal completed',
      LP_WAITLIST_JOINED: 'LP waitlist joined',
    };
    return labels[actionType] || actionType.replace(/_/g, ' ');
  };

  const formatPointsActivityDetails = (meta: unknown) => {
    if (!meta || typeof meta !== 'object') return '—';
    const m = meta as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof m.marketLabel === 'string' && m.marketLabel.trim()) {
      parts.push(m.marketLabel.trim());
    } else if (typeof m.marketEvent === 'string' && m.marketEvent.trim()) {
      parts.push(m.marketEvent.trim());
    }
    if (typeof m.amount === 'number' && Number.isFinite(m.amount)) {
      parts.push(`$${m.amount.toFixed(2)}`);
    }
    if (typeof m.winningOutcome === 'string') {
      parts.push(`${m.winningOutcome} won`);
    }
    if (typeof m.marketId === 'string' && m.marketId.length > 0 && parts.length === 0) {
      parts.push(`Market …${m.marketId.slice(-8)}`);
    }
    return parts.length ? parts.join(' · ') : '—';
  };

  const transactionHistoryQuery = useTransactionHistory({
    limit: transactionLimit,
    offset: transactionOffset,
    type: transactionType,
    enabled: !!walletKey && activeTab === 'history',
  });

  // Load saved settings from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('predictio_display_name') || '';
    const savedAvatar = localStorage.getItem('predictio_avatar') || '🦁';
    setDisplayName(savedName);
    setSelectedAvatar(savedAvatar);
  }, []);

  // Handle wallet not connected - do this after all hooks are called
  useEffect(() => {
    if (!isConnected) {
      // Use a timeout to avoid navigation during render
      const timer = setTimeout(() => {
        openWalletModal();
        navigate({ to: '/' });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isConnected, navigate, openWalletModal]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    }
  };

  const saveDisplayName = () => {
    localStorage.setItem('predictio_display_name', displayName);
    toast.success('Display name saved!');
  };

  const saveAvatar = (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('predictio_avatar', avatar);
    toast.success('Avatar updated!');
  };

  // If not connected, show a loading state instead of returning null
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-gray-400">Redirecting to home...</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'predictions', label: 'My Predictions', icon: FileText },
    { key: 'points', label: 'Points', icon: Hexagon },
    { key: 'wallet', label: 'Wallet & Balance', icon: Wallet },
    { key: 'history', label: 'Transaction History', icon: Calendar },
    { key: 'stats', label: 'Stats & Achievements', icon: BarChart3 },
    { key: 'followed-analysts', label: 'Followed Analysts', icon: Users },
    { key: 'referral-earnings', label: 'Referral Earnings', icon: Gift },
    { key: 'payout-history', label: 'Payout History', icon: DollarSign },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const avatarOptions = ['🦁', '🐺', '🦅', '🐯', '🐻', '🦊', '🐉', '🦈'];

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">My Account</h1>
            <p className="text-gray-400">
              Manage your predictions, wallet, and settings
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8 border-b border-white/10 overflow-x-auto">
            <div className="flex gap-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() =>
                      navigate({
                        search: { tab: tab.key as TabType },
                        replace: true,
                      })
                    }
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-brand-green text-brand-green'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Total Balance</div>
                  <div className="font-mono text-3xl font-bold text-brand-green">
                    ${totalAtCost.toLocaleString()} USDC
                  </div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Active Predictions</div>
                  <div className="font-mono text-3xl font-bold">
                    {summaryQuery.data?.openPositionsCount || 0}
                  </div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Total Profit</div>
                  <div className={`font-mono text-3xl font-bold ${
                    (summaryQuery.data?.resolvedPnL || 0) >= 0 ? 'text-brand-green' : 'text-red-500'
                  }`}>
                    {(summaryQuery.data?.resolvedPnL || 0) >= 0 ? '+' : ''}${(summaryQuery.data?.resolvedPnL || 0).toFixed(0)}
                  </div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Win Rate</div>
                  <div className="font-mono text-3xl font-bold text-brand-cyan">
                    {(summaryQuery.data?.winRate || 0).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() =>
                    navigate({
                      search: { tab: 'predictions' },
                      replace: true,
                    })
                  }
                  className="p-6 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-all text-left"
                >
                  <FileText className="w-8 h-8 text-brand-green mb-3" />
                  <h3 className="font-semibold mb-1">View My Predictions</h3>
                  <p className="text-sm text-gray-400">
                    See all your active and past predictions
                  </p>
                </button>
                <button
                  onClick={() =>
                    navigate({
                      search: { tab: 'wallet' },
                      replace: true,
                    })
                  }
                  className="p-6 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-all text-left"
                >
                  <Wallet className="w-8 h-8 text-brand-cyan mb-3" />
                  <h3 className="font-semibold mb-1">Manage Wallet</h3>
                  <p className="text-sm text-gray-400">
                    Deposit, withdraw, and view transactions
                  </p>
                </button>
                <button
                  onClick={() =>
                    navigate({
                      search: { tab: 'stats' },
                      replace: true,
                    })
                  }
                  className="p-6 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-all text-left"
                >
                  <BarChart3 className="w-8 h-8 text-purple-400 mb-3" />
                  <h3 className="font-semibold mb-1">View Stats</h3>
                  <p className="text-sm text-gray-400">
                    Track your performance and achievements
                  </p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    { key: 'all' as const, label: 'All' },
                    { key: 'open' as const, label: 'Open' },
                    { key: 'resolved' as const, label: 'Resolved' },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPredictionStatusFilter(key)}
                    className={`px-4 py-2 border rounded-lg transition-all text-sm ${
                      predictionStatusFilter === key
                        ? 'bg-brand-green/20 border-brand-green text-brand-green'
                        : 'bg-white/5 border-white/10 hover:border-brand-green'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Loading State */}
              {positionsQuery.isLoading && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-4 animate-spin" />
                  <p className="text-gray-400">Loading predictions...</p>
                </div>
              )}

              {/* Error State */}
              {positionsQuery.isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
                  <p className="text-red-500">Failed to load predictions</p>
                </div>
              )}

              {/* Predictions List */}
              {positionsQuery.data && positionsQuery.data.positions.length > 0 ? (
                filteredAccountPredictions.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                    <p className="text-gray-400 mb-2">No predictions match this filter</p>
                    <p className="text-sm text-gray-500">Try &quot;All&quot; or switch filter.</p>
                  </div>
                ) : (
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Event</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Outcome</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Shares</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Avg Price</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">P&L</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {filteredAccountPredictions.map((position) => {
                          const market = marketById[position.marketId];
                          if (!market) return null;

                          const isOpen = position.status === 'open';
                          const currentPrice = position.outcome.toUpperCase() === 'YES' ? market.yesPrice : market.noPrice;
                          const shares = position.shares || 0;
                          const avgPrice = position.avgPrice || 0;
                          
                          let pnl = 0;
                          let pnlDisplay = '—';
                          
                          if (isOpen) {
                            // Calculate unrealized P&L
                            const value = shares * currentPrice;
                            const cost = shares * avgPrice;
                            pnl = value - cost;
                            pnlDisplay = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
                          } else {
                            // Use realized P&L
                            pnl = position.pnl || 0;
                            pnlDisplay = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
                          }

                          const potentialWin = shares * 1.0; // Each winning share = $1
                          const odds = avgPrice > 0 ? (1 / avgPrice) : 0;

                          return (
                            <tr key={position.id} className="hover:bg-white/5">
                              <td className="px-6 py-4">
                                <div className="font-semibold">
                                  {position.market.event || `${market.teamA} vs ${market.teamB}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {market.sportEmoji} {market.league}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  position.outcome.toUpperCase() === 'YES'
                                    ? 'bg-brand-green/20 text-brand-green'
                                    : 'bg-red-500/20 text-red-500'
                                }`}>
                                  {position.outcome.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono">${position.amount.toFixed(2)}</td>
                              <td className="px-6 py-4 font-mono">{shares.toFixed(1)}</td>
                              <td className="px-6 py-4 font-mono text-brand-cyan">
                                ${avgPrice.toFixed(2)}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  isOpen
                                    ? 'bg-brand-green/20 text-brand-green'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {isOpen ? '🟢 OPEN' : '✓ RESOLVED'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`font-mono font-semibold ${
                                  pnl >= 0 ? 'text-brand-green' : 'text-red-500'
                                }`}>
                                  {pnlDisplay}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <ShareButton
                                  text={generatePredictionShareText({
                                    marketName: position.market.event || `${market.teamA} vs ${market.teamB}`,
                                    teamA: market.teamA,
                                    teamB: market.teamB,
                                    outcome: position.outcome.toUpperCase(),
                                    amount: position.amount,
                                    odds: odds,
                                    potentialWin: potentialWin,
                                    sportEmoji: market.sportEmoji,
                                    league: market.league,
                                  })}
                                  url={typeof window !== 'undefined' ? window.location.origin : ''}
                                  variant="ghost"
                                  size="sm"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )
              ) : positionsQuery.data && positionsQuery.data.positions.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No predictions yet</p>
                  <p className="text-sm text-gray-500">Start making predictions to see them here</p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'points' && (
            <div className="space-y-6">
              {/* Loading State */}
              {pointsQuery.isPointsLoading && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-4 animate-spin" />
                  <p className="text-gray-400">Loading rewards…</p>
                </div>
              )}

              {/* Error State */}
              {pointsQuery.pointsLoadFailed && (
                <div
                  className="bg-white/5 border border-white/10 rounded-lg p-6 text-center space-y-3"
                >
                  <p className="text-gray-300 font-medium">Unable to load rewards data</p>
                  <p className="text-sm text-gray-500 max-w-lg mx-auto">
                    Rewards data temporarily unavailable. Retrying…
                  </p>
                  <button
                    type="button"
                    onClick={() => void pointsQuery.refetch()}
                    className="text-sm text-brand-green hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Points Summary */}
              {pointsQuery.data && (
                <>
                  <div className="bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-lg p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Hexagon className="w-8 h-8 text-brand-green" />
                      <div>
                        <h2 className="font-syne font-bold text-2xl">SEASON 1 · POINTS PROGRAM</h2>
                        <p className="text-sm text-gray-400">Trade, earn points, climb the leaderboard</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Your Points</div>
                        <div className="font-mono text-4xl font-bold text-brand-green">
                          {pointsQuery.data.totalPoints.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Tier</div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: getTierColor(pointsQuery.data.tier) }}
                          />
                          <span className="font-mono text-2xl font-bold" style={{ color: getTierColor(pointsQuery.data.tier) }}>
                            {pointsQuery.data.tier}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Global Rank</div>
                        <div className="font-mono text-4xl font-bold text-brand-cyan">
                          #{pointsQuery.data.globalRank || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Progress to Next Tier */}
                    {pointsQuery.data.nextTier ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Next: {pointsQuery.data.nextTier}</span>
                          <span className="text-sm text-gray-400">
                            {(pointsQuery.data.pointsToNextTier ?? 0).toLocaleString()} pts to go
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-green to-brand-cyan transition-all duration-500"
                            style={{
                              width: `${(() => {
                                const t = pointsQuery.data.totalPoints;
                                const g = pointsQuery.data.pointsToNextTier ?? 0;
                                const denom = t + g;
                                if (denom <= 0) return 0;
                                return Math.min(100, (t / denom) * 100);
                              })()}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        {pointsQuery.data.tier === 'DIAMOND'
                          ? 'Top tier reached for Season 1 — keep earning for future seasons.'
                          : 'Tier progress unavailable.'}
                      </p>
                    )}
                  </div>

                  {/* How to Earn */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="font-syne font-bold text-lg mb-4">HOW TO EARN</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Rewards match your on-platform activity. Repeatable rows show how many times you&apos;ve been credited.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(pointsQuery.data.earnGuide ?? []).map((item) => {
                        const done = item.repeatable
                          ? item.timesEarned > 0
                          : item.completed;
                        return (
                          <div
                            key={item.actionType}
                            className="flex items-start gap-3 p-3 bg-white/5 rounded"
                          >
                            {done ? (
                              <CheckCircle className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm">{item.label}</div>
                              {item.repeatable && item.timesEarned > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Credited {item.timesEarned}×
                                </div>
                              )}
                            </div>
                            <span className="font-mono text-sm text-brand-green font-semibold whitespace-nowrap">
                              {item.pointsLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-white/5 border-b border-white/10">
                      <h3 className="font-syne font-bold text-lg">RECENT ACTIVITY</h3>
                    </div>
                    {((pointsQuery.data.recentActivity ?? []).length) === 0 ? (
                      <div className="p-12 text-center">
                        <Hexagon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No activity yet</p>
                        <p className="text-sm text-gray-500 mt-1">Start trading to earn points</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Action</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Details</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Points</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {(pointsQuery.data.recentActivity ?? []).map((activity: any, index: number) => (
                              <tr key={index} className="hover:bg-white/5">
                                <td className="px-6 py-4">
                                  <span className="text-sm font-semibold">{getActionLabel(activity.actionType)}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-400">
                                    {formatPointsActivityDetails(activity.metadata)}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`font-mono font-semibold ${
                                      activity.points >= 0 ? 'text-brand-green' : 'text-red-400'
                                    }`}
                                  >
                                    {activity.points >= 0 ? '+' : ''}
                                    {activity.points}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-400">
                                    {new Date(activity.createdAt).toLocaleDateString()}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-6">
              {/* Wallet Info */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-syne font-bold text-lg mb-4">Connected Wallet</h3>
                <div className="flex items-center gap-3 mb-4">
                  <code className="flex-1 font-mono text-sm bg-white/5 px-4 py-2 rounded">
                    {address}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    title="Copy address"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`https://basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-sm text-gray-400">Network: BASE ✅</p>
              </div>

              {/* Balance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Available Balance</div>
                  <div className="font-mono text-3xl font-bold text-brand-green">
                    ${paperCash.toLocaleString()} USDC
                  </div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">In Active Predictions</div>
                  <div className="font-mono text-3xl font-bold">
                    ${inOpenPositions.toFixed(0)} USDC
                  </div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">Total Portfolio Value</div>
                  <div className="font-mono text-3xl font-bold text-brand-cyan">
                    ${totalAtCost.toLocaleString()} USDC
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button 
                  onClick={() => setDepositWithdrawModal({ isOpen: true, type: 'deposit' })}
                  className="flex-1 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all"
                >
                  Deposit USDC
                </button>
                <button 
                  onClick={() => setDepositWithdrawModal({ isOpen: true, type: 'withdraw' })}
                  className="flex-1 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-all"
                >
                  Withdraw
                </button>
                <button 
                  onClick={openWalletModal}
                  className="flex-1 py-3 bg-white/5 border border-white/10 font-semibold rounded-lg hover:bg-white/10 transition-all"
                >
                  Buy USDC
                </button>
              </div>

              {/* Transaction History Preview */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-syne font-bold text-lg">Recent Transactions</h3>
                  <button
                    onClick={() =>
                      navigate({
                        search: { tab: 'history' },
                        replace: true,
                      })
                    }
                    className="text-sm text-brand-green hover:text-brand-green/80"
                  >
                    View All →
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Switch to the Transaction History tab to see all your transactions
                </p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all' as const, label: 'All' },
                  { value: 'credits' as const, label: 'Credits' },
                  { value: 'wallet_deposit' as const, label: 'Wallet in' },
                  { value: 'wallet_withdrawal' as const, label: 'Wallet out' },
                  { value: 'position_open' as const, label: 'Open' },
                  { value: 'position_sell' as const, label: 'Sell' },
                  { value: 'position_settlement_win' as const, label: 'Settle win' },
                  { value: 'position_settlement_loss' as const, label: 'Settle loss' },
                  { value: 'lp_deposit' as const, label: 'LP in' },
                  { value: 'lp_withdraw' as const, label: 'LP out' },
                  { value: 'lp_reward_claim' as const, label: 'LP fees' },
                  { value: 'holding_reward' as const, label: 'Holding' },
                  { value: 'analyst_reward' as const, label: 'Analyst' },
                  { value: 'affiliate_reward' as const, label: 'Affiliate' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => {
                      setTransactionType(filter.value);
                      setTransactionOffset(0);
                    }}
                    className={`px-4 py-2 border rounded-lg transition-all text-sm font-medium ${
                      transactionType === filter.value
                        ? 'bg-brand-green/20 border-brand-green text-brand-green'
                        : 'bg-white/5 border-white/10 hover:border-brand-green'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Transaction List */}
              {transactionHistoryQuery.isLoading ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-4 animate-spin" />
                  <p className="text-gray-400">Loading transactions...</p>
                </div>
              ) : transactionHistoryQuery.isError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
                  <p className="text-red-500">Failed to load transaction history</p>
                </div>
              ) : transactionHistoryQuery.data?.transactions.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No transactions found</p>
                  <p className="text-sm text-gray-500">Your transaction history will appear here</p>
                </div>
              ) : (
                <>
                  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Details</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Amount</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">TX</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {transactionHistoryQuery.data?.transactions.map((tx) => {
                            const t = tx.type;
                            const isDeposit = t === 'wallet_deposit' || t === 'deposit';
                            const isWithdrawal = t === 'wallet_withdrawal' || t === 'withdrawal';
                            const isBet = t === 'position_open' || t === 'bet_placed';
                            const isWin = t === 'position_settlement_win' || t === 'bet_won';
                            const isLoss = t === 'position_settlement_loss' || t === 'bet_lost';
                            const isReward =
                              t === 'holding_reward' ||
                              t === 'analyst_reward' ||
                              t === 'affiliate_reward' ||
                              t === 'lp_reward_claim' ||
                              t === 'reward_claim' ||
                              t === 'lp_fee_claim';
                            const isLpMove = t === 'lp_deposit' || t === 'lp_withdraw';
                            const isSell = t === 'position_sell';

                            const typeConfig =
                              {
                                wallet_deposit: { icon: ArrowDownCircle, color: 'text-brand-green' },
                                deposit: { icon: ArrowDownCircle, color: 'text-brand-green' },
                                wallet_withdrawal: { icon: ArrowUpCircle, color: 'text-yellow-400' },
                                withdrawal: { icon: ArrowUpCircle, color: 'text-yellow-400' },
                                position_open: { icon: TrendingUp, color: 'text-brand-cyan' },
                                bet_placed: { icon: TrendingUp, color: 'text-brand-cyan' },
                                position_sell: { icon: TrendingUp, color: 'text-brand-cyan' },
                                position_settlement_win: { icon: Trophy, color: 'text-brand-green' },
                                bet_won: { icon: Trophy, color: 'text-brand-green' },
                                position_settlement_loss: { icon: TrendingDown, color: 'text-red-400' },
                                bet_lost: { icon: TrendingDown, color: 'text-red-400' },
                                position_refund: { icon: RefreshCw, color: 'text-gray-400' },
                                bet_refund: { icon: RefreshCw, color: 'text-gray-400' },
                                lp_deposit: { icon: ArrowDownCircle, color: 'text-brand-cyan' },
                                lp_withdraw: { icon: ArrowUpCircle, color: 'text-yellow-400' },
                                lp_reward_claim: { icon: Gift, color: 'text-brand-green' },
                                holding_reward: { icon: Gift, color: 'text-brand-green' },
                                analyst_reward: { icon: Gift, color: 'text-brand-green' },
                                affiliate_reward: { icon: Gift, color: 'text-brand-green' },
                                reward_claim: { icon: Gift, color: 'text-brand-green' },
                                lp_fee_claim: { icon: Gift, color: 'text-brand-green' },
                              }[t] || { icon: Calendar, color: 'text-gray-400' };

                            const Icon = typeConfig.icon;
                            const metadata = tx.metadata as any;
                            const prefix = dbActivityAmountPrefix(tx);

                            return (
                              <tr key={tx.id} className="hover:bg-white/5">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                                    <span className="font-semibold text-sm">{dbActivityTypeLabel(t)}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {isBet || isWin || isLoss || isSell ? (
                                    <div>
                                      <div className="font-medium text-sm">
                                        {metadata?.marketEvent || tx.market?.event || 'Unknown Market'}
                                      </div>
                                      {metadata?.outcome && (
                                        <div className="text-xs text-gray-500">
                                          {metadata.outcome} @ {metadata.odds}x
                                        </div>
                                      )}
                                      {isSell && typeof metadata?.realizedPnL === 'number' ? (
                                        <div className="text-xs text-gray-500">
                                          Realized PnL {metadata.realizedPnL >= 0 ? '+' : ''}$
                                          {Number(metadata.realizedPnL).toFixed(2)}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : isReward || isLpMove ? (
                                    <div className="text-sm text-gray-300">
                                      {metadata?.description ||
                                        metadata?.label ||
                                        tx.market?.event ||
                                        (isLpMove ? 'Liquidity' : 'Credit')}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-400">
                                      {isDeposit ? 'Wallet funding in' : isWithdrawal ? 'Wallet funding out' : '—'}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div
                                    className={`font-mono font-semibold ${
                                      prefix === '+'
                                        ? 'text-brand-green'
                                        : prefix === '-'
                                          ? 'text-red-400'
                                          : 'text-gray-400'
                                    }`}
                                  >
                                    {prefix}${tx.amount.toLocaleString()}
                                  </div>
                                  {metadata?.potentialWin && isBet && (
                                    <div className="text-xs text-gray-500">
                                      Potential: ${metadata.potentialWin.toLocaleString()}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    tx.status === 'completed' ? 'bg-brand-green/20 text-brand-green' :
                                    tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                    'bg-red-500/20 text-red-500'
                                  }`}>
                                    {tx.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm">
                                    {new Date(tx.createdAt).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(tx.createdAt).toLocaleTimeString()}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {tx.txHash ? (
                                    <a
                                      href={`https://basescan.org/tx/${tx.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-brand-cyan hover:text-brand-cyan/80 text-xs"
                                    >
                                      <span className="font-mono">{tx.txHash.slice(0, 6)}...</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <span className="text-gray-500 text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination */}
                  {(transactionHistoryQuery.data?.hasMore || transactionOffset > 0) && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setTransactionOffset(Math.max(0, transactionOffset - transactionLimit))}
                        disabled={transactionOffset === 0}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-400">
                        Showing {transactionOffset + 1} - {transactionOffset + (transactionHistoryQuery.data?.transactions.length || 0)} of {transactionHistoryQuery.data?.totalCount}
                      </span>
                      <button
                        onClick={() => setTransactionOffset(transactionOffset + transactionLimit)}
                        disabled={!transactionHistoryQuery.data?.hasMore}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-brand-green mb-3" />
                  <div className="text-sm text-gray-400 mb-2">Total Predictions</div>
                  <div className="font-mono text-3xl font-bold">
                    {summaryQuery.data?.totalPositions || 0}
                  </div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <Trophy className="w-8 h-8 text-yellow-400 mb-3" />
                  <div className="text-sm text-gray-400 mb-2">Won / Lost</div>
                  <div className="font-mono text-3xl font-bold text-brand-green">
                    {summaryQuery.data?.wonPositions || 0} / {summaryQuery.data?.lostPositions || 0}
                  </div>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                  <Calendar className="w-8 h-8 text-brand-cyan mb-3" />
                  <div className="text-sm text-gray-400 mb-2">Win Rate</div>
                  <div className="font-mono text-3xl font-bold text-brand-cyan">
                    {(summaryQuery.data?.winRate || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Financial Stats */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-syne font-bold text-lg mb-4">Financial Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total Deposited</div>
                    <div className="font-mono text-lg font-semibold">
                      ${(summaryQuery.data?.totalDeposited || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total Withdrawn</div>
                    <div className="font-mono text-lg font-semibold">
                      ${(summaryQuery.data?.totalWithdrawn || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Currently Invested</div>
                    <div className="font-mono text-lg font-semibold">
                      ${(summaryQuery.data?.totalInvested || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Realized P&L</div>
                    <div className={`font-mono text-lg font-semibold ${
                      (summaryQuery.data?.resolvedPnL || 0) >= 0 ? 'text-brand-green' : 'text-red-500'
                    }`}>
                      {(summaryQuery.data?.resolvedPnL || 0) >= 0 ? '+' : ''}${(summaryQuery.data?.resolvedPnL || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Holding Rewards Stats */}
              {summaryQuery.data?.holdingRewards && (
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-lg p-6">
                  <h3 className="font-syne font-bold text-lg mb-4 flex items-center gap-2">
                    <span>Holding Rewards</span>
                    <span className="text-2xl">💎</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Total Earned</div>
                      <div className="font-mono text-lg font-semibold text-brand-green">
                        ${summaryQuery.data.holdingRewards.totalEarned.toFixed(2)} USDC
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Claimed</div>
                      <div className="font-mono text-lg font-semibold">
                        ${summaryQuery.data.holdingRewards.claimed.toFixed(2)} USDC
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Pending</div>
                      <div className="font-mono text-lg font-semibold text-brand-cyan">
                        ${summaryQuery.data.holdingRewards.pending.toFixed(2)} USDC
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Longest Hold</div>
                      <div className="font-mono text-lg font-semibold">
                        {summaryQuery.data.holdingRewards.longestHoldDays} days
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Best Rate</div>
                      <div className="font-mono text-lg font-semibold text-purple-400">
                        {(summaryQuery.data.holdingRewards.bestHoldingRate * 100).toFixed(1)}% 🚀
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sport Distribution - Mock for now */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-syne font-bold text-lg mb-4">Predictions by Sport</h3>
                <p className="text-sm text-gray-400">
                  Sport breakdown will be available once you have more predictions
                </p>
              </div>

              {/* Achievements */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-syne font-bold text-lg mb-4">Achievements</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: '🎯', label: 'First Prediction', unlocked: (summaryQuery.data?.totalPositions || 0) > 0 },
                    { icon: '🔥', label: '5 Wins', unlocked: (summaryQuery.data?.wonPositions || 0) >= 5 },
                    { icon: '💎', label: '10 Predictions', unlocked: (summaryQuery.data?.totalPositions || 0) >= 10 },
                    { icon: '🏆', label: 'Profitable', unlocked: (summaryQuery.data?.resolvedPnL || 0) > 0 },
                  ].map((achievement) => (
                    <div
                      key={achievement.label}
                      className={`p-4 rounded-lg text-center ${
                        achievement.unlocked
                          ? 'bg-brand-green/20 border border-brand-green/50'
                          : 'bg-white/5 border border-white/10 opacity-50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <div className="text-xs font-semibold">{achievement.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'followed-analysts' && (
            <FollowedAnalystsTab userWallet={walletKey} />
          )}

          {activeTab === 'referral-earnings' && (
            <ReferralDashboardTab userWallet={walletKey} />
          )}

          {activeTab === 'payout-history' && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-gray-400 mb-4">
                  View your complete payout history on the dedicated page
                </p>
                <button
                  onClick={() => navigate({ to: '/account/payouts' })}
                  className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                >
                  Go to Payout History
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-gray-400 mb-4">
                  View detailed analytics on the dedicated page
                </p>
                <button
                  onClick={() => navigate({ to: '/account/analytics' })}
                  className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                >
                  Go to Analytics
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Profile Settings */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-syne font-bold text-lg mb-4">Profile</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Display Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g., CryptoSharpe"
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                      />
                      <button
                        onClick={saveDisplayName}
                        className="px-6 py-2 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Avatar</label>
                    <div className="flex gap-2">
                      {avatarOptions.map((avatar) => (
                        <button
                          key={avatar}
                          onClick={() => saveAvatar(avatar)}
                          className={`w-12 h-12 text-2xl rounded-lg transition-all ${
                            selectedAvatar === avatar
                              ? 'bg-brand-green/20 border-2 border-brand-green'
                              : 'bg-white/5 border border-white/10 hover:border-brand-green'
                          }`}
                        >
                          {avatar}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications (Mock) */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-syne font-bold text-lg mb-4">Notifications</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Market closing reminders (1h before)', checked: true },
                    { label: 'Resolution results', checked: true },
                    { label: 'Large P&L movements', checked: false },
                    { label: 'Weekly performance summary', checked: false },
                    { label: 'New markets in my sports', checked: false },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={item.checked}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-brand-green"
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h3 className="font-syne font-bold text-lg mb-4">Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Odds Format</label>
                    <div className="flex gap-2">
                      {['Decimal', 'American', 'Fractional'].map((format) => (
                        <button
                          key={format}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-brand-green transition-all text-sm"
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                <h3 className="font-syne font-bold text-lg mb-4 text-red-500">Danger Zone</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to disconnect your wallet?')) {
                        disconnectWallet();
                        walletToastSuccess('Wallet disconnected', {
                          id: WALLET_TOAST_IDS.disconnected,
                          duration: 4200,
                        });
                        navigate({ to: '/' });
                      }
                    }}
                    className="w-full py-2 bg-red-500/20 border border-red-500/50 text-red-500 font-semibold rounded-lg hover:bg-red-500/30 transition-all"
                  >
                    Disconnect Wallet
                  </button>
                  <button className="w-full py-2 bg-white/5 border border-white/10 text-gray-400 font-semibold rounded-lg hover:bg-white/10 transition-all">
                    Clear All Local Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      
      <DepositWithdrawModal
        isOpen={depositWithdrawModal.isOpen}
        onClose={() => setDepositWithdrawModal({ ...depositWithdrawModal, isOpen: false })}
        type={depositWithdrawModal.type}
      />
    </div>
  );
}

