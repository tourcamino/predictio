import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { FeeStructureAnalytics } from '~/components/admin/FeeStructureAnalytics';
import { VaultPerformanceDashboard } from '~/components/admin/VaultPerformanceDashboard';
import { mockAnalytics } from '~/data/mockAdmin';
import { useTRPC } from '~/trpc/react';
import { getConcentrationRiskBadge } from '~/utils/lpUtils';

export const Route = createFileRoute('/admin/analytics/')({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const trpc = useTRPC();

  // Fetch fee revenue data
  const feeRevenueQuery = useQuery({
    ...trpc.getFeeRevenue.queryOptions({
      timeRange: 'month',
    }),
  });

  const feeData = feeRevenueQuery.data;

  // Fetch LP analytics
  const lpAnalyticsQuery = useQuery({
    ...trpc.getLPAnalytics.queryOptions({
      timeRange: 'month',
    }),
  });

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Analytics" />
      
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-syne font-bold">Platform Analytics</h1>

        {/* Fee Revenue Section */}
        {feeData && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-syne font-bold mb-4">Fee Revenue</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Today</div>
                <div className="font-mono text-2xl font-bold text-brand-green">
                  ${feeData.today.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">This Week</div>
                <div className="font-mono text-2xl font-bold text-brand-cyan">
                  ${feeData.week.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">This Month</div>
                <div className="font-mono text-2xl font-bold text-purple-400">
                  ${feeData.month.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Avg Fee Rate</div>
                <div className="font-mono text-2xl font-bold">
                  {(feeData.avgFeeRate * 100).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">near 50/50</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Order Type Distribution</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Market orders</span>
                    <span className="font-mono font-semibold">
                      {(feeData.marketOrdersPct * 100).toFixed(0)}% of volume
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div 
                      className="bg-brand-green h-2 rounded-full transition-all"
                      style={{ width: `${feeData.marketOrdersPct * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm">Limit orders</span>
                    <span className="font-mono font-semibold">
                      {(feeData.limitOrdersPct * 100).toFixed(0)}% of volume
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div 
                      className="bg-brand-cyan h-2 rounded-full transition-all"
                      style={{ width: `${feeData.limitOrdersPct * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Fee Split</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Protocol Vault (50%)</span>
                    <span className="font-mono font-semibold text-brand-green">
                      ${feeData.vaultAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Analyst Pool (30%)</span>
                    <span className="font-mono font-semibold text-brand-cyan">
                      ${feeData.analystPoolAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-xs text-gray-500">
                      Based on {feeData.totalTransactions.toLocaleString()} transactions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Structure Analytics - New Section */}
        {feeData && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <FeeStructureAnalytics feeData={feeData} />
          </div>
        )}

        {/* Revenue Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-syne font-bold mb-4">Revenue Breakdown</h3>
          <div className="mb-6">
            <div className="text-3xl font-mono font-bold text-brand-green mb-2">
              $33,600 USDC
            </div>
            <div className="text-sm text-gray-400">
              Total Revenue (0.8% of $4.2M volume)
            </div>
          </div>
          
          <div className="h-64">
            <RevenueChart data={mockAnalytics.revenueByDay} />
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-syne font-bold mb-6">Conversion Funnel</h3>
          <div className="space-y-4">
            <FunnelStep
              label="Visitors"
              value={mockAnalytics.conversionFunnel.visitors}
              percentage={100}
              prevValue={mockAnalytics.conversionFunnel.visitors}
            />
            <FunnelStep
              label="Wallet Connected"
              value={mockAnalytics.conversionFunnel.walletConnected}
              percentage={(mockAnalytics.conversionFunnel.walletConnected / mockAnalytics.conversionFunnel.visitors) * 100}
              prevValue={mockAnalytics.conversionFunnel.visitors}
            />
            <FunnelStep
              label="First Prediction"
              value={mockAnalytics.conversionFunnel.firstPrediction}
              percentage={(mockAnalytics.conversionFunnel.firstPrediction / mockAnalytics.conversionFunnel.visitors) * 100}
              prevValue={mockAnalytics.conversionFunnel.walletConnected}
            />
            <FunnelStep
              label="Repeat User"
              value={mockAnalytics.conversionFunnel.repeatUser}
              percentage={(mockAnalytics.conversionFunnel.repeatUser / mockAnalytics.conversionFunnel.visitors) * 100}
              prevValue={mockAnalytics.conversionFunnel.firstPrediction}
            />
            <FunnelStep
              label="Power User (10+)"
              value={mockAnalytics.conversionFunnel.powerUser}
              percentage={(mockAnalytics.conversionFunnel.powerUser / mockAnalytics.conversionFunnel.visitors) * 100}
              prevValue={mockAnalytics.conversionFunnel.repeatUser}
            />
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-syne font-bold mb-6">Top Countries by Volume</h3>
          <div className="space-y-3">
            {mockAnalytics.topCountries.map((country) => (
              <div key={country.country} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium">{country.country}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold">${(country.volume / 1000000).toFixed(1)}M</div>
                  <div className="text-xs text-gray-500">
                    {((country.volume / mockAnalytics.topCountries.reduce((sum, c) => sum + c.volume, 0)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sport Performance */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-syne font-bold mb-6">Sport Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Sport</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Markets</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Avg Market Size</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Resolution Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockAnalytics.sportPerformance.map((sport) => (
                  <tr key={sport.sport} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{sport.sport}</td>
                    <td className="px-4 py-3 font-mono text-sm">{sport.markets}</td>
                    <td className="px-4 py-3 font-mono text-sm">${(sport.volume / 1000000).toFixed(2)}M</td>
                    <td className="px-4 py-3 font-mono text-sm">${sport.avgMarketSize.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-sm">
                      <span className={sport.resolutionRate >= 97 ? 'text-green-500' : 'text-yellow-500'}>
                        {sport.resolutionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-brand-green">
                      ${sport.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Liquidity Providers Section */}
        {lpAnalyticsQuery.data && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-syne font-bold mb-6">Liquidity Providers</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-sm text-gray-400 mb-1">Active LPs</div>
                <div className="font-mono text-3xl font-bold">{lpAnalyticsQuery.data.activeLPs}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Deposited</div>
                <div className="font-mono text-3xl font-bold text-brand-green">
                  ${lpAnalyticsQuery.data.totalDeposited.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Avg LP APY</div>
                <div className="font-mono text-3xl font-bold text-brand-cyan">
                  {lpAnalyticsQuery.data.avgAPY.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-sm text-gray-400 mb-3">Distribution</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Fees Distributed (30d)</span>
                    <span className="font-mono font-semibold text-brand-green">
                      ${lpAnalyticsQuery.data.feesDistributed30d.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Largest LP</span>
                    <span className="font-mono font-semibold">
                      ${lpAnalyticsQuery.data.largestLP.toLocaleString()} ({lpAnalyticsQuery.data.largestLPPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg Deposit Size</span>
                    <span className="font-mono font-semibold">
                      ${lpAnalyticsQuery.data.avgDepositSize.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="text-sm text-gray-400 mb-3">Concentration Risk</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Risk Level</span>
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${
                      lpAnalyticsQuery.data.concentrationRisk === 'low' 
                        ? 'bg-green-500/20 text-green-500' 
                        : lpAnalyticsQuery.data.concentrationRisk === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                      {getConcentrationRiskBadge(lpAnalyticsQuery.data.concentrationRisk).icon}{' '}
                      {lpAnalyticsQuery.data.concentrationRisk.charAt(0).toUpperCase() + lpAnalyticsQuery.data.concentrationRisk.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Top 3 LPs</span>
                    <span className="font-mono font-semibold">
                      ${lpAnalyticsQuery.data.topLPsTotal.toLocaleString()} ({lpAnalyticsQuery.data.topLPsPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t border-white/10">
                    {lpAnalyticsQuery.data.concentrationRisk === 'high' && (
                      <span className="text-yellow-500">⚠ High concentration - consider incentivizing more LPs</span>
                    )}
                    {lpAnalyticsQuery.data.concentrationRisk === 'medium' && (
                      <span className="text-yellow-500">⚠ Moderate concentration - monitor distribution</span>
                    )}
                    {lpAnalyticsQuery.data.concentrationRisk === 'low' && (
                      <span className="text-green-500">✓ Well-distributed LP base</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vault Performance Analytics */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <VaultPerformanceDashboard />
        </div>
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: typeof mockAnalytics.revenueByDay }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  
  return (
    <div className="h-full flex items-end justify-between gap-2">
      {data.map((day, index) => {
        const height = (day.revenue / maxRevenue) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center group">
            <div className="relative w-full">
              <div
                className="w-full bg-brand-green rounded-t transition-all duration-300 group-hover:bg-brand-green/80"
                style={{ height: `${height * 2}px` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black border border-white/20 rounded px-2 py-1 text-xs font-mono whitespace-nowrap">
                    <div className="text-white">${day.revenue.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-500 mt-2 font-mono">{day.date}</span>
          </div>
        );
      })}
    </div>
  );
}

function FunnelStep({ label, value, percentage, prevValue }: { label: string; value: number; percentage: number; prevValue: number }) {
  const conversionRate = ((value / prevValue) * 100).toFixed(1);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 font-mono">
            {conversionRate}% conversion
          </span>
          <span className="font-mono font-bold">{value.toLocaleString()}</span>
        </div>
      </div>
      <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-brand-green transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-3">
          <span className="text-xs font-mono font-bold text-white mix-blend-difference">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
