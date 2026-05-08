import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Trophy, TrendingUp, Activity, DollarSign, ExternalLink } from 'lucide-react';
import { Header } from '~/components/Header';

export const Route = createFileRoute('/developers/leaderboard/')({
  component: DeveloperLeaderboardPage,
});

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  ens?: string;
  trades: number;
  volume: number;
  winRate: number;
  roi: number;
  sharpe: number;
  activeSince: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    ens: 'vitalik.eth',
    trades: 1204,
    volume: 145000,
    winRate: 58,
    roi: 24,
    sharpe: 2.1,
    activeSince: 142,
  },
  {
    rank: 2,
    wallet: '0xABC1234567890DEF1234567890ABC1234567890',
    trades: 892,
    volume: 89000,
    winRate: 54,
    roi: 18,
    sharpe: 1.8,
    activeSince: 98,
  },
  {
    rank: 3,
    wallet: '0xDEF9876543210ABC9876543210DEF9876543210',
    ens: 'trader.eth',
    trades: 756,
    volume: 78000,
    winRate: 52,
    roi: 16,
    sharpe: 1.6,
    activeSince: 87,
  },
  {
    rank: 4,
    wallet: '0x123ABC456DEF789012ABC456DEF789012ABC456',
    trades: 634,
    volume: 67000,
    winRate: 56,
    roi: 15,
    sharpe: 1.5,
    activeSince: 76,
  },
  {
    rank: 5,
    wallet: '0x456DEF789012ABC456DEF789012ABC456DEF789',
    ens: 'quant.eth',
    trades: 589,
    volume: 62000,
    winRate: 51,
    roi: 14,
    sharpe: 1.4,
    activeSince: 65,
  },
];

function DeveloperLeaderboardPage() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [minTrades, setMinTrades] = useState<number>(10);
  const [minVolume, setMinVolume] = useState<number>(1000);
  const [sortBy, setSortBy] = useState<'roi' | 'volume' | 'sharpe' | 'trades'>('roi');

  const formatWallet = (wallet: string, ens?: string) => {
    if (ens) return ens;
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Top wallets on Predictio</h1>
          <p className="text-[#999999] mb-2">
            Derived from on-chain data. No opt-in, no gatekeepers.
          </p>
          <p className="text-sm text-[#999999]">
            Past performance does not guarantee future results. Wallets shown include both automated and manual traders.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-[#999999] mb-2">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="w-full bg-[#0A0A0A] border border-[#00D97E]/20 rounded px-3 py-2 text-sm"
              >
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="90d">90 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#999999] mb-2">Min trades</label>
              <select
                value={minTrades}
                onChange={(e) => setMinTrades(Number(e.target.value))}
                className="w-full bg-[#0A0A0A] border border-[#00D97E]/20 rounded px-3 py-2 text-sm"
              >
                <option value={10}>10+</option>
                <option value={50}>50+</option>
                <option value={100}>100+</option>
                <option value={500}>500+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#999999] mb-2">Min volume</label>
              <select
                value={minVolume}
                onChange={(e) => setMinVolume(Number(e.target.value))}
                className="w-full bg-[#0A0A0A] border border-[#00D97E]/20 rounded px-3 py-2 text-sm"
              >
                <option value={1000}>$1k+</option>
                <option value={10000}>$10k+</option>
                <option value={100000}>$100k+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#999999] mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-[#0A0A0A] border border-[#00D97E]/20 rounded px-3 py-2 text-sm"
              >
                <option value="roi">ROI</option>
                <option value="volume">Volume</option>
                <option value="sharpe">Sharpe Ratio</option>
                <option value="trades">Trades Count</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0A0A0A] border-b border-[#00D97E]/20">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-mono">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-mono">Wallet</th>
                  <th className="px-6 py-4 text-right text-sm font-mono">Trades</th>
                  <th className="px-6 py-4 text-right text-sm font-mono">Volume</th>
                  <th className="px-6 py-4 text-right text-sm font-mono">Win Rate</th>
                  <th className="px-6 py-4 text-right text-sm font-mono">ROI</th>
                  <th className="px-6 py-4 text-right text-sm font-mono">Sharpe</th>
                  <th className="px-6 py-4 text-right text-sm font-mono">Active Since</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00D97E]/10">
                {mockLeaderboard.map((entry) => (
                  <tr key={entry.wallet} className="hover:bg-[#00D97E]/5 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {entry.rank === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                        {entry.rank === 2 && <Trophy className="w-5 h-5 text-gray-400" />}
                        {entry.rank === 3 && <Trophy className="w-5 h-5 text-orange-600" />}
                        <span className="font-mono">{entry.rank}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-[#00D97E]">
                        {formatWallet(entry.wallet, entry.ens)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {entry.trades.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      ${(entry.volume / 1000).toFixed(0)}k
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {entry.winRate}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono ${entry.roi > 0 ? 'text-[#00D97E]' : 'text-red-500'}`}>
                        {entry.roi > 0 ? '+' : ''}{entry.roi}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {entry.sharpe.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-right text-[#999999] text-sm">
                      {entry.activeSince}d
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://basescan.org/address/${entry.wallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#999999] hover:text-[#00D97E] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bounty Banner */}
        <div className="mt-8 bg-gradient-to-br from-[#00D97E]/20 to-[#00D97E]/5 border border-[#00D97E]/30 rounded-lg p-8 text-center">
          <Trophy className="w-12 h-12 text-[#00D97E] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Monthly leaderboard bounty</h2>
          <p className="text-[#999999] max-w-2xl mx-auto">
            Top 10 wallets by Sharpe ratio (min 100 trades) share a $10,000 USDC pool, 
            distributed on-chain on the 1st of each month.
          </p>
        </div>
      </div>

    </div>
  );
}

