import { createFileRoute } from '@tanstack/react-router';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { KPICard } from '~/components/admin/KPICard';
import { ActivityFeed } from '~/components/admin/ActivityFeed';
import { AMMBotPanel } from '~/components/admin/AMMBotPanel';
import { MarketMakerConfigPanel } from '~/components/admin/MarketMakerConfigPanel';
import { VaultAlertConfigPanel } from '~/components/admin/VaultAlertConfigPanel';
import { mockKPIData, mockAnalytics } from '~/data/mockAdmin';
import { useState, type ReactElement } from 'react';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';

export const Route = createFileRoute('/admin/dashboard/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [volumePeriod, setVolumePeriod] = useState<'14D' | '30D' | '90D'>('14D');

  const trpc = useTRPC();

  // Check bot status for offline warning
  const botHeartbeatQuery = useQuery({
    ...trpc.getBotHeartbeat.queryOptions({}),
    refetchInterval: 10000, // Check every 10 seconds
  });

  const showOfflineWarning = botHeartbeatQuery.data?.isStale || botHeartbeatQuery.data?.status === 'OFFLINE';

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Dashboard" />
      
      {showOfflineWarning && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-red-500 text-xl">⚠</span>
            <div>
              <div className="font-semibold text-red-500">AMM Bot Offline</div>
              <div className="text-sm text-red-400">
                Markets are unquoted. Manual trading only until bot reconnects.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="ACTIVE MARKETS"
            value={mockKPIData.activeMarkets}
            change={mockKPIData.activeMarketsChange}
            changeLabel="today"
            format="number"
          />
          <KPICard
            label="24H VOLUME"
            value={mockKPIData.volume24h}
            change={mockKPIData.volume24hChange}
            changeLabel="vs 7d"
            format="currency"
          />
          <KPICard
            label="TOTAL USERS"
            value={mockKPIData.totalUsers}
            change={mockKPIData.totalUsersChange}
            changeLabel="today"
            format="number"
          />
          <KPICard
            label="PLATFORM REVENUE"
            value={mockKPIData.platformRevenue}
            change={mockKPIData.platformRevenueChange}
            changeLabel="/d"
            format="currency"
          />
        </div>

        {/* AI Scanner Status */}
        <div className="bg-white/5 border border-brand-cyan/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-brand-cyan text-2xl">🤖</span>
            <h3 className="text-lg font-syne font-bold text-brand-cyan">AI Scanner Status</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Last Scan</div>
              <div className="font-mono text-sm">14 min ago</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Markets Analyzed</div>
              <div className="font-mono text-sm font-bold">847</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Insights Generated</div>
              <div className="font-mono text-sm font-bold text-brand-green">23</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Next Scan</div>
              <div className="font-mono text-sm">46 min</div>
            </div>
          </div>
          
          <div className="p-3 bg-brand-cyan/10 border border-brand-cyan/30 rounded mb-4">
            <div className="text-sm font-semibold text-brand-cyan mb-1">Top Signal</div>
            <div className="text-sm text-gray-300">Draw value detected on 3 markets</div>
          </div>
          
          <button className="w-full py-2 bg-brand-cyan text-brand-bg font-semibold rounded hover:bg-brand-cyan/90 transition-all">
            Force Scan Now
          </button>
        </div>

        {/* Protocol Vault Control */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h3 className="text-lg font-syne font-bold">Protocol Vault</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Total Liquidity</div>
              <div className="font-mono text-xl font-bold text-brand-green">$500</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Markets Active</div>
              <div className="font-mono text-xl font-bold">{mockKPIData.activeMarkets}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Seed (you)</div>
              <div className="font-mono text-sm">
                <span className="font-bold text-white">$500</span>
                <span className="text-gray-500 ml-2">100%</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">External LPs</div>
              <div className="font-mono text-sm">
                <span className="font-bold text-gray-500">$0</span>
                <span className="text-gray-500 ml-2">0%</span>
              </div>
            </div>
          </div>

          <VaultWaitlistCount />

          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">Allocation Mode</div>
            <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
              <option>Auto (Volume-based)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="py-2 bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan font-semibold rounded hover:bg-brand-cyan/30 transition-all text-sm">
              Rebalance Now
            </button>
            <button className="py-2 bg-brand-green/20 border border-brand-green/30 text-brand-green font-semibold rounded hover:bg-brand-green/30 transition-all text-sm">
              Add Seed +
            </button>
          </div>
        </div>

        {/* AMM Bot Control */}
        <AMMBotPanel />

        {/* Market Maker Configuration */}
        <MarketMakerConfigPanel />

        {/* Vault Alert Configuration */}
        <VaultAlertConfigPanel />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Volume Chart */}
          <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-syne font-bold">Volume Chart</h3>
              <div className="flex gap-2">
                {(['14D', '30D', '90D'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setVolumePeriod(period)}
                    className={`
                      px-3 py-1 rounded text-xs font-mono transition-colors
                      ${volumePeriod === period
                        ? 'bg-brand-green text-black'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                      }
                    `}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <VolumeChart data={mockAnalytics.volumeByDay} />
            </div>
          </div>

          {/* Sport Distribution */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-syne font-bold mb-6">Sport Distribution</h3>
            <div className="h-64">
              <SportDistributionChart data={mockAnalytics.sportDistribution} />
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>
    </div>
  );
}

function VolumeChart({ data }: { data: typeof mockAnalytics.volumeByDay }) {
  const maxVolume = Math.max(...data.map(d => d.volume));
  
  return (
    <div className="h-full flex items-end justify-between gap-2">
      {data.map((day, index) => {
        const height = (day.volume / maxVolume) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center group">
            <div className="relative w-full">
              <div
                className="w-full bg-brand-green rounded-t transition-all duration-300 group-hover:bg-brand-green/80"
                style={{ height: `${height * 2}px` }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black border border-white/20 rounded px-2 py-1 text-xs font-mono whitespace-nowrap">
                    <div className="text-white">${(day.volume / 1000000).toFixed(1)}M</div>
                    <div className="text-gray-400">{day.predictions} predictions</div>
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

function SportDistributionChart({ data }: { data: typeof mockAnalytics.sportDistribution }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Donut Chart */}
      <div className="relative w-40 h-40 mb-6">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {data.reduce((acc, sport, index) => {
            const prevPercentage = data.slice(0, index).reduce((sum, s) => sum + s.percentage, 0);
            const circumference = 2 * Math.PI * 40;
            const offset = (prevPercentage / 100) * circumference;
            const length = (sport.percentage / 100) * circumference;
            
            acc.push(
              <circle
                key={sport.sport}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={sport.color}
                strokeWidth="20"
                strokeDasharray={`${length} ${circumference}`}
                strokeDashoffset={-offset}
                className="transition-all duration-300"
              />
            );
            return acc;
          }, [] as ReactElement[])}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold">100%</div>
            <div className="text-xs text-gray-500">Markets</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 w-full">
        {data.map((sport) => (
          <div key={sport.sport} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: sport.color }}
              />
              <span className="text-gray-300">{sport.sport}</span>
            </div>
            <span className="font-mono text-white">{sport.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VaultWaitlistCount() {
  const trpc = useTRPC();
  const waitlistQuery = useQuery(
    trpc.getLPWaitlistCount.queryOptions({})
  );

  return (
    <div className="mb-4">
      <div className="text-xs text-gray-400 mb-1">LP Waitlist</div>
      <div className="font-mono text-sm font-bold">
        {waitlistQuery.isLoading ? (
          <span className="text-gray-500">Loading...</span>
        ) : (
          <span className="text-white">{waitlistQuery.data?.count || 0} wallets</span>
        )}
      </div>
    </div>
  );
}
