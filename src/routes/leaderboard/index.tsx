import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Trophy, Medal, TrendingUp, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';
import { useLeaderboard } from '~/hooks/useLeaderboard';
import { usePointsLeaderboard } from '~/hooks/usePointsLeaderboard';
import { useAnalystLeaderboard } from '~/hooks/useAnalystLeaderboard';
import { mockAnalysts } from "~/data/mockAffiliates";
import {
  TierBadge,
  verificationToRewardTier,
} from "~/components/affiliate/TierBadge";
import { VerificationBadge } from "~/components/analyst/VerificationBadge";
import { MetaTags } from "~/components/MetaTags";
import { isFootballFocusEnabled } from '~/config/footballFocus';

export const Route = createFileRoute('/leaderboard/')({
  component: LeaderboardPage,
});

interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName?: string;
  wins: number;
  losses: number;
  winRate: number;
  volume: number;
  pnl: number;
  favoriteSport: string;
  avatar: string;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, address: '0x7f3a8b2c4e2b9f1a', displayName: 'CryptoSharpe', wins: 234, losses: 87, winRate: 72.9, volume: 456000, pnl: 89400, favoriteSport: '⚽', avatar: '🦁' },
  { rank: 2, address: '0x2c1d5e8f9a3b7c4d', displayName: 'BetAlpha', wins: 198, losses: 76, winRate: 72.3, volume: 389000, pnl: 76200, favoriteSport: '🏀', avatar: '🐺' },
  { rank: 3, address: '0x9b1c3d5e7f2a4b6c', displayName: 'QuanTrader', wins: 187, losses: 89, winRate: 67.8, volume: 412000, pnl: 68900, favoriteSport: '🎾', avatar: '🦅' },
  { rank: 4, address: '0x4e8f1a2b5c9d3e7f', wins: 156, losses: 67, winRate: 69.9, volume: 298000, pnl: 54300, favoriteSport: '🥊', avatar: '🐯' },
  { rank: 5, address: '0x5c9d2e7f3a1b4e8f', wins: 143, losses: 71, winRate: 66.8, volume: 267000, pnl: 48700, favoriteSport: '🏏', avatar: '🐻' },
];

// Generate more entries
for (let i = 6; i <= 50; i++) {
  mockLeaderboard.push({
    rank: i,
    address: `0x${Math.random().toString(16).slice(2, 18)}`,
    wins: Math.floor(Math.random() * 150) + 50,
    losses: Math.floor(Math.random() * 100) + 30,
    winRate: Math.random() * 30 + 50,
    volume: Math.floor(Math.random() * 200000) + 50000,
    pnl: Math.floor(Math.random() * 40000) + 10000,
    favoriteSport: ['⚽', '🏀', '🎾', '🥊', '🏏'][Math.floor(Math.random() * 5)] ?? '⚽',
    avatar: ['🦁', '🐺', '🦅', '🐯', '🐻', '🦊', '🐉', '🦈'][Math.floor(Math.random() * 8)] ?? '🦁',
  });
}

function LeaderboardPage() {
  const trpc = useTRPC();
  const { address } = useWallet();
  const [activeTab, setActiveTab] = useState<'monthly' | 'all-time' | 'analysts' | 'lps'>('monthly');
  const [rankingType, setRankingType] = useState<'pnl' | 'points'>('pnl');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [lpSortBy, setLPSortBy] = useState<'deposits' | 'fees'>('fees');

  const leaderboardQuery = useLeaderboard({
    limit: 50,
    currentUserWallet: address || undefined,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const pointsLeaderboardQuery = usePointsLeaderboard({
    limit: 50,
    currentUserWallet: address || undefined,
    enabled: rankingType === 'points' && activeTab !== 'analysts',
    refetchInterval: 60000,
    staleTime: 55000,
  });

  const analystLeaderboardQuery = useAnalystLeaderboard({
    limit: 50,
    sortBy: 'earned',
    currentUserWallet: address || undefined,
    enabled: activeTab === 'analysts',
  });

  // Fetch LP leaderboard
  const lpLeaderboardQuery = useQuery({
    ...trpc.getLPLeaderboard.queryOptions({
      limit: 50,
      sortBy: lpSortBy,
      currentUserWallet: address || undefined,
    }),
    enabled: activeTab === 'lps',
    refetchInterval: 60000,
    staleTime: 55000,
  });

  const leaderboard = leaderboardQuery.data?.leaderboard || [];
  const pointsLeaderboard = pointsLeaderboardQuery.data?.leaderboard || [];
  const analystLeaderboard = analystLeaderboardQuery.data?.leaderboard || [];
  const lpLeaderboard = lpLeaderboardQuery.data?.leaderboard || [];
  const topThree = leaderboard.slice(0, 3);
  const podium1 = topThree[0];
  const podium2 = topThree[1];
  const podium3 = topThree[2];

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-orange-400';
      default: return 'text-gray-500';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'DIAMOND': return '#00D4FF';
      case 'GOLD': return '#FFD700';
      case 'SILVER': return '#C0C0C0';
      case 'BRONZE': return '#CD7F32';
      default: return '#CD7F32';
    }
  };

  return (
    <>
      <MetaTags
        title="Leaderboard — Top Traders on Predictio.live"
        description="See who's winning on the #1 DeFi sports prediction market on Base."
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />
      <div className="min-h-screen bg-brand-bg">
        <div className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-8 h-8 text-brand-green" />
                <h1 className="font-syne font-bold text-4xl md:text-5xl">Global Leaderboard</h1>
              </div>
              <p className="text-gray-400 text-lg">
                {isFootballFocusEnabled() 
                  ? 'Top sports traders ranked by performance'
                  : 'Top traders on Predictio ranked by performance'
                }
              </p>
              <p className="text-sm text-gray-500 mt-2 font-mono">
                Updated every hour
              </p>
            </div>

            {/* Narrow sport-scope notice (when football focus mode is on) */}
            {isFootballFocusEnabled() && (
              <div className="max-w-4xl mx-auto mb-8 p-4 bg-brand-green/10 border border-brand-green/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚽</span>
                  <div>
                    <div className="font-semibold text-brand-green mb-1">
                      Sports traders — focused book
                    </div>
                    <p className="text-sm text-gray-400">
                      Rankings based on sports market trading activity. Champions League, Serie A, and top European competitions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ranking Type Toggle */}
            {activeTab !== 'analysts' && activeTab !== 'lps' && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  onClick={() => setRankingType('pnl')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                    rankingType === 'pnl'
                      ? 'bg-brand-green/20 text-brand-green border border-brand-green/50'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  P&L Ranking
                </button>
                <button
                  onClick={() => setRankingType('points')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                    rankingType === 'points'
                      ? 'bg-brand-green/20 text-brand-green border border-brand-green/50'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  Points Ranking
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {[
                { key: 'monthly', label: '🏆 Top Traders' },
                { key: 'analysts', label: '📊 Top Analysts' },
                { key: 'lps', label: '💧 Top LPs' },
                { key: 'all-time', label: '🌍 All Time' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-brand-green text-brand-bg'
                      : 'bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Top 3 Podium */}
            {!leaderboardQuery.isLoading && podium1 && podium2 && podium3 && activeTab !== 'analysts' && activeTab !== 'lps' && rankingType === 'pnl' && (
              <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
                {/* 2nd Place */}
                <div className="flex flex-col items-center pt-8">
                  <div className="w-16 h-16 bg-white/10 border-2 border-gray-300 rounded-full flex items-center justify-center text-2xl mb-3">
                    🥈
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Medal className={`w-5 h-5 ${getPodiumColor(2)}`} />
                      <span className="font-mono text-sm text-gray-400">#2</span>
                    </div>
                    <div className="font-semibold text-sm mb-1">
                      {podium2.wallet.slice(0, 6)}...{podium2.wallet.slice(-4)}
                    </div>
                    <div className="font-mono text-xs text-brand-green">
                      {podium2.totalPnl >= 0 ? '+' : ''}${podium2.totalPnl.toFixed(2)}
                    </div>
                  </div>
                  <div className="w-full h-24 bg-gradient-to-t from-gray-600 to-gray-500 rounded-t-lg mt-4" />
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white/10 border-4 border-yellow-400 rounded-full flex items-center justify-center text-3xl mb-3 shadow-lg shadow-yellow-400/50">
                    🥇
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Trophy className={`w-6 h-6 ${getPodiumColor(1)}`} />
                      <span className="font-mono text-sm text-gray-400">#1</span>
                    </div>
                    <div className="font-bold text-base mb-1">
                      {podium1.wallet.slice(0, 6)}...{podium1.wallet.slice(-4)}
                    </div>
                    <div className="font-mono text-sm text-brand-green font-bold">
                      {podium1.totalPnl >= 0 ? '+' : ''}${podium1.totalPnl.toFixed(2)}
                    </div>
                  </div>
                  <div className="w-full h-32 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg mt-4 shadow-lg shadow-yellow-400/30" />
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center pt-12">
                  <div className="w-16 h-16 bg-white/10 border-2 border-orange-400 rounded-full flex items-center justify-center text-2xl mb-3">
                    🥉
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Medal className={`w-5 h-5 ${getPodiumColor(3)}`} />
                      <span className="font-mono text-sm text-gray-400">#3</span>
                    </div>
                    <div className="font-semibold text-sm mb-1">
                      {podium3.wallet.slice(0, 6)}...{podium3.wallet.slice(-4)}
                    </div>
                    <div className="font-mono text-xs text-brand-green">
                      {podium3.totalPnl >= 0 ? '+' : ''}${podium3.totalPnl.toFixed(2)}
                    </div>
                  </div>
                  <div className="w-full h-20 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg mt-4" />
                </div>
              </div>
            )}

            {/* Conditional Content Based on Tab */}
            {activeTab === 'lps' ? (
              <div>
                {/* LP Sort Toggle */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <button
                    onClick={() => setLPSortBy('fees')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                      lpSortBy === 'fees'
                        ? 'bg-brand-green/20 text-brand-green border border-brand-green/50'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    By Fees Earned
                  </button>
                  <button
                    onClick={() => setLPSortBy('deposits')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                      lpSortBy === 'deposits'
                        ? 'bg-brand-green/20 text-brand-green border border-brand-green/50'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    By Total Deposits
                  </button>
                </div>

                {/* LP Leaderboard Table */}
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            LP Provider
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Total Deposits
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Current Value
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Fees Earned
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            P&L
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Avg APY
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Positions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {lpLeaderboardQuery.isLoading ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center">
                              <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-3 animate-spin" />
                              <p className="text-gray-400">Loading LP leaderboard...</p>
                            </td>
                          </tr>
                        ) : lpLeaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p>No liquidity providers yet</p>
                              <p className="text-sm mt-2">Be the first to provide liquidity!</p>
                            </td>
                          </tr>
                        ) : (
                          lpLeaderboard.map((lp, index) => (
                            <tr 
                              key={lp.wallet} 
                              className={`transition-colors ${
                                lp.isCurrentUser 
                                  ? 'bg-brand-green/10 border-l-4 border-brand-green' 
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`font-mono font-bold ${index < 3 ? getPodiumColor(index + 1) : 'text-gray-400'}`}>
                                  #{lp.rank}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm">
                                    💧
                                  </div>
                                  <div>
                                    <div className={`font-semibold ${lp.isCurrentUser ? 'text-brand-green' : ''}`}>
                                      {lp.wallet.slice(0, 6)}...{lp.wallet.slice(-4)}
                                      {lp.isCurrentUser && ' (You)'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                ${lp.totalDeposits.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                ${lp.totalValue.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-brand-green">
                                  ${lp.totalFeesEarned.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`font-mono font-semibold ${lp.totalPnL >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                                  {lp.totalPnL >= 0 ? '+' : ''}${lp.totalPnL.toFixed(2)}
                                  <span className="text-xs ml-1">
                                    ({lp.totalPnLPct >= 0 ? '+' : ''}{lp.totalPnLPct.toFixed(1)}%)
                                  </span>
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono font-semibold text-brand-cyan">
                                  {lp.avgAPY.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">
                                {lp.positionsCount}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    
                    {/* Update timestamp */}
                    {!lpLeaderboardQuery.isLoading && lpLeaderboard.length > 0 && (
                      <div className="px-6 py-4 bg-white/5 border-t border-white/10 text-center text-xs text-gray-500">
                        Last updated: {lpLeaderboardQuery.data?.updatedAt ? new Date(lpLeaderboardQuery.data.updatedAt).toLocaleTimeString() : 'Just now'} · Updates every 60 seconds
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA Banner */}
                <div className="mt-8 bg-gradient-to-r from-brand-cyan/10 to-brand-green/10 border border-brand-cyan/30 rounded-lg p-8 text-center">
                  <h3 className="font-syne font-bold text-2xl mb-3">
                    💧 Want to climb the LP leaderboard?
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Provide liquidity to earn fees from every trade and compete for the top spot!
                  </p>
                  <a
                    href="/liquidity"
                    className="inline-block px-8 py-3 bg-brand-cyan text-brand-bg font-bold rounded-lg hover:bg-brand-cyan/90 transition-colors"
                  >
                    Provide Liquidity →
                  </a>
                </div>
              </div>
            ) : activeTab === 'analysts' ? (
              <div>
                {/* Analysts Leaderboard */}
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Analyst
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Tier
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Sport
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Followers
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            ROI
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Win Rate
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Vol Generated
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Earned
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {(analystLeaderboardQuery.isLoading ? [] : analystLeaderboard).length === 0 && !analystLeaderboardQuery.isLoading ? (
                          <tr>
                            <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                              <p>No analysts found</p>
                              <p className="text-sm mt-2">Be the first to join the analyst program!</p>
                            </td>
                          </tr>
                        ) : analystLeaderboardQuery.isLoading ? (
                          <tr>
                            <td colSpan={10} className="px-6 py-12 text-center">
                              <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-3 animate-spin" />
                              <p className="text-gray-400">Loading analyst leaderboard...</p>
                            </td>
                          </tr>
                        ) : (
                          analystLeaderboard.map((analyst, index) => (
                            <tr 
                              key={analyst.id} 
                              className={`transition-colors ${
                                analyst.isCurrentUser 
                                  ? 'bg-brand-green/10 border-l-4 border-brand-green' 
                                  : 'hover:bg-white/5'
                              }`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`font-mono font-bold ${index < 3 ? getPodiumColor(index + 1) : 'text-gray-400'}`}>
                                  #{index + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <a
                                  href={`/analysts/${analyst.id}`}
                                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                                >
                                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm">
                                    {analyst.avatar}
                                  </div>
                                  <div>
                                    <div className={`font-semibold ${analyst.isCurrentUser ? 'text-brand-green' : ''}`}>
                                      {analyst.displayName}
                                      {analyst.isCurrentUser && ' (You)'}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono">
                                      {analyst.wallet.slice(0, 6)}...{analyst.wallet.slice(-4)}
                                    </div>
                                  </div>
                                </a>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <VerificationBadge 
                                  isVerified={(analyst as any).isVerified || false}
                                  verificationTier={(analyst as any).verificationTier}
                                  size="sm"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <TierBadge
                                  tier={verificationToRewardTier(
                                    (analyst as { verificationTier?: string | null })
                                      .verificationTier
                                  )}
                                  size="sm"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-1">
                                  {analyst.sport.map((s, i) => (
                                    <span key={i} className="text-lg">
                                      {s === 'Football' && '⚽'}
                                      {s === 'Soccer' && '⚽'}
                                      {s === 'MMA' && '🥊'}
                                      {s === 'Cricket' && '🏏'}
                                      {s === 'Basketball' && '🏀'}
                                      {s === 'Tennis' && '🎾'}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                {analyst.followersCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono font-semibold text-brand-green">
                                  +{analyst.roi.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono font-semibold text-brand-cyan">
                                  {analyst.winRate.toFixed(0)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                ${(analyst.volumeGenerated / 1000).toFixed(0)}K
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-brand-green">
                                  ${analyst.totalEarned.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CTA Banner */}
                <div className="mt-8 bg-gradient-to-r from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-lg p-8 text-center">
                  <h3 className="font-syne font-bold text-2xl mb-3">
                    🚀 Want to appear here?
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {isFootballFocusEnabled()
                      ? 'Apply as a sports analyst and start earning USDC from your predictions.'
                      : 'Apply as an Analyst and start earning USDC from your predictions.'
                    }
                  </p>
                  <a
                    href="/affiliates"
                    className="inline-block px-8 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
                  >
                    Join the Analyst Program →
                  </a>
                </div>
              </div>
            ) : (
              /* Original Traders Leaderboard Table */
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                {(rankingType === 'pnl' ? leaderboardQuery.isLoading : pointsLeaderboardQuery.isLoading) ? (
                  <div className="p-12 text-center">
                    <RefreshCw className="w-12 h-12 text-brand-green mx-auto mb-4 animate-spin" />
                    <p className="text-gray-400">Loading leaderboard...</p>
                  </div>
                ) : (rankingType === 'pnl' ? leaderboardQuery.isError : pointsLeaderboardQuery.isError) ? (
                  <div className="p-12 text-center">
                    <p className="text-red-500 mb-4">Failed to load leaderboard</p>
                    <button
                      onClick={() => rankingType === 'pnl' ? leaderboardQuery.refetch() : pointsLeaderboardQuery.refetch()}
                      className="px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-all"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {rankingType === 'points' ? 'Wallet' : 'Trader'}
                          </th>
                          {rankingType === 'points' && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Tier
                            </th>
                          )}
                          {rankingType === 'pnl' && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Balance
                            </th>
                          )}
                          {rankingType === 'pnl' && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              W/L
                            </th>
                          )}
                          {rankingType === 'pnl' && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Win Rate
                            </th>
                          )}
                          {rankingType === 'pnl' && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Volume
                            </th>
                          )}
                          {rankingType === 'points' && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Points
                            </th>
                          )}
                          {rankingType === 'points' && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Trades
                            </th>
                          )}
                          {rankingType === 'pnl' && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Total P&L
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {(rankingType === "points"
                          ? pointsLeaderboard
                          : leaderboard
                        ).map((entry) => (
                          <tr 
                            key={entry.wallet} 
                            className={`transition-colors ${
                              entry.isCurrentUser 
                                ? 'bg-brand-green/10 border-l-4 border-brand-green' 
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`font-mono font-bold ${entry.rank <= 3 ? getPodiumColor(entry.rank) : 'text-gray-400'}`}>
                                #{entry.rank}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm">
                                  {entry.isCurrentUser ? '👤' : '👨'}
                                </div>
                                <div>
                                  <div className={`font-semibold ${entry.isCurrentUser ? 'text-brand-green' : ''}`}>
                                    {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                                    {entry.isCurrentUser && ' (You)'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            {/* Points Ranking Columns */}
                            {rankingType === 'points' && (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{
                                        backgroundColor: getTierColor(
                                          (entry as { tier?: string }).tier ??
                                            "BRONZE"
                                        ),
                                      }}
                                    />
                                    <span
                                      className="font-semibold text-sm"
                                      style={{
                                        color: getTierColor(
                                          (entry as { tier?: string }).tier ??
                                            "BRONZE"
                                        ),
                                      }}
                                    >
                                      {(entry as { tier?: string }).tier ??
                                        "BRONZE"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="font-mono font-bold text-brand-green text-lg">
                                    {(entry as any).totalPoints.toLocaleString()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                  {(entry as any).tradesCount}
                                </td>
                              </>
                            )}
                            
                            {/* P&L Ranking Columns */}
                            {rankingType === 'pnl' && (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                  ${(entry as any).virtualBalance.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                  <span className="text-brand-green">{(entry as any).wins}</span>
                                  <span className="text-gray-500 mx-1">/</span>
                                  <span className="text-red-400">{(entry as any).losses}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="font-mono font-semibold text-brand-cyan">
                                    {(entry as any).winRate.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                  ${(entry as any).totalVolume.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`font-mono font-bold ${(entry as any).totalPnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                                    {(entry as any).totalPnl >= 0 ? '+' : ''}${(entry as any).totalPnl.toFixed(2)}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Update timestamp */}
                    <div className="px-6 py-4 bg-white/5 border-t border-white/10 text-center text-xs text-gray-500">
                      Last updated:{' '}
                      {(() => {
                        const src =
                          rankingType === 'pnl'
                            ? leaderboardQuery.data
                            : pointsLeaderboardQuery.data;
                        const at = src?.updatedAt;
                        return at
                          ? new Date(at).toLocaleTimeString()
                          : 'Just now';
                      })()}{' '}
                      · Updates every 60 seconds
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
      </div>
    </>
  );
}

