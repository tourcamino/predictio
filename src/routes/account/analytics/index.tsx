import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useWallet } from '~/store/useWalletStore';
import { useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Target, BarChart3, Share2, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { normalizeWalletForQuery } from '~/utils/walletQuery';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/account/analytics/')({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { isConnected, address, openWalletModal } = useWallet();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const walletKey = normalizeWalletForQuery(address);

  const analyticsQuery = useQuery({
    ...trpc.getReferralAnalytics.queryOptions({
      walletAddress: walletKey,
    }),
    enabled: !!walletKey && isConnected,
  });

  const earningsQuery = useQuery({
    ...trpc.getReferralEarnings.queryOptions({
      walletAddress: walletKey,
    }),
    enabled: !!walletKey && isConnected,
  });

  useEffect(() => {
    if (!isConnected) {
      const timer = setTimeout(() => {
        openWalletModal();
        navigate({ to: '/' });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isConnected, navigate, openWalletModal]);

  const handleCopyReferralLink = () => {
    if (!earningsQuery.data?.referralCode) return;
    
    const link = `${window.location.origin}/join/${earningsQuery.data.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

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

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-syne font-bold text-4xl mb-2">Analytics</h1>
            <p className="text-gray-400">
              Track your referral and analyst performance
            </p>
          </div>

          {/* Loading State */}
          {analyticsQuery.isLoading && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-4 animate-spin" />
              <p className="text-gray-400">Loading analytics...</p>
            </div>
          )}

          {/* Error State */}
          {analyticsQuery.isError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
              <p className="text-red-500">Failed to load analytics</p>
            </div>
          )}

          {/* Empty State */}
          {analyticsQuery.data && !analyticsQuery.data.hasData && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="font-syne font-bold text-xl mb-2">No Analytics Data Yet</h3>
              <p className="text-gray-400 mb-6">
                Share your referral link to start tracking your analytics.
              </p>
              {earningsQuery.data?.referralCode && (
                <div className="max-w-md mx-auto">
                  <div className="flex items-center gap-2 mb-4">
                    <code className="flex-1 text-sm font-mono bg-black/20 px-4 py-3 rounded overflow-x-auto">
                      {window.location.origin}/join/{earningsQuery.data.referralCode}
                    </code>
                    <button
                      onClick={handleCopyReferralLink}
                      className="p-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <Link
                to="/affiliates"
                className="inline-block px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-colors"
              >
                Learn About Referral Program
              </Link>
            </div>
          )}

          {/* Content */}
          {analyticsQuery.data && analyticsQuery.data.hasData && (
            <div className="space-y-8">
              {/* SECTION 1: Overview Cards */}
              <div>
                <h2 className="font-syne font-bold text-2xl mb-4">Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Users className="w-5 h-5" />
                      <span className="text-sm">Total Referrals</span>
                    </div>
                    <div className="font-mono font-bold text-3xl">
                      {analyticsQuery.data.overview.totalReferrals}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-sm">Active Referrals</span>
                    </div>
                    <div className="font-mono font-bold text-3xl text-brand-green">
                      {analyticsQuery.data.overview.activeReferrals}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Have traded at least once
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-sm">Total Volume</span>
                    </div>
                    <div className="font-mono font-bold text-3xl text-brand-cyan">
                      ${(analyticsQuery.data.overview.totalVolume / 1000).toFixed(1)}K
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Target className="w-5 h-5" />
                      <span className="text-sm">Conversion Rate</span>
                    </div>
                    <div className="font-mono font-bold text-3xl text-purple-400">
                      {analyticsQuery.data.overview.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Referrals who traded
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Volume Chart */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="font-syne font-bold text-xl mb-4">Volume Generated (Last 30 Days)</h2>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsQuery.data.volumeChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        stroke="#9CA3AF"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0A0F1E',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                        formatter={(value, name) => {
                          const num =
                            typeof value === 'number' ? value : Number(value ?? 0);
                          const labels: Record<string, string> = {
                            volume: 'Volume',
                            fees: 'Fees Generated',
                            reward: 'Your Reward',
                          };
                          const label =
                            typeof name === 'string' ? labels[name] || name : String(name);
                          return [`$${num.toFixed(2)}`, label];
                        }}
                      />
                      <Bar dataKey="volume" fill="#00FF87" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SECTION 3: Top Referrals */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="font-syne font-bold text-xl mb-4">Top Referrals</h2>
                {analyticsQuery.data.topReferrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Wallet</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Joined</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trades</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Volume</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Fees Generated</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Your Reward</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {analyticsQuery.data.topReferrals.map((referral, index) => (
                          <tr key={index} className="hover:bg-white/5">
                            <td className="px-4 py-3 font-mono text-sm">{referral.wallet}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {new Date(referral.joinedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 font-mono">{referral.trades}</td>
                            <td className="px-4 py-3 font-mono font-bold text-brand-cyan">
                              ${referral.volumeGenerated.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              ${referral.feesGenerated.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-brand-green">
                              ${referral.yourReward.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8">No referral data yet</p>
                )}
              </div>

              {/* SECTION 4: Share Performance */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="font-syne font-bold text-xl mb-4">Share Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Total Clicks</div>
                    <div className="font-mono text-2xl font-bold">{analyticsQuery.data.sharePerformance.totalClicks}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Wallet Connections</div>
                    <div className="font-mono text-2xl font-bold text-brand-green">
                      {analyticsQuery.data.overview.totalReferrals}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Click → Connect Rate</div>
                    <div className="font-mono text-2xl font-bold text-purple-400">
                      {analyticsQuery.data.sharePerformance.conversionRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {analyticsQuery.data.sharePerformance.clicksByChannel.map((channel) => (
                    <div key={channel.channel} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{channel.channel}</span>
                        <span className="text-sm text-gray-400">
                          {channel.conversions} / {channel.clicks} conversions
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-green"
                          style={{ width: `${(channel.conversions / channel.clicks) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Note: Link tracking available after wallet connection
                </p>
              </div>

              {/* SECTION 5: Analyst Performance */}
              {analyticsQuery.data.analystPerformance && (
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-lg p-6">
                  <h2 className="font-syne font-bold text-xl mb-4">Analyst Performance</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Active Copiers</div>
                      <div className="font-mono text-3xl font-bold text-brand-green">
                        {analyticsQuery.data.analystPerformance.activeCopiers}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Volume Generated</div>
                      <div className="font-mono text-3xl font-bold text-brand-cyan">
                        ${(analyticsQuery.data.analystPerformance.volumeGenerated / 1000).toFixed(1)}K
                      </div>
                    </div>
                  </div>

                  {/* Copiers Chart */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">Copiers Over Time (Last 30 Days)</h3>
                    <div style={{ height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsQuery.data.analystPerformance.copiersChart}>
                          <defs>
                            <linearGradient id="copiersGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            stroke="#9CA3AF"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0A0F1E',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                            }}
                            labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                          />
                          <Area
                            type="monotone"
                            dataKey="copiers"
                            stroke="#A855F7"
                            fill="url(#copiersGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Copiers */}
                  {analyticsQuery.data.analystPerformance.topCopiers.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Top 5 Copiers by Volume</h3>
                      <div className="space-y-2">
                        {analyticsQuery.data.analystPerformance.topCopiers.map((copier, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-sm font-bold text-purple-400">
                                #{index + 1}
                              </div>
                              <div>
                                <div className="font-mono text-sm">{copier.wallet}</div>
                                <div className="text-xs text-gray-500">
                                  Since {new Date(copier.startedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-brand-cyan">
                              ${copier.volumeCopied.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

