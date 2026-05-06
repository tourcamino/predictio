import { useState } from 'react';
import { useTRPC } from '~/trpc/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, DollarSign, Droplet, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LPEarningsCharts } from './LPEarningsCharts';
import toast from 'react-hot-toast';

interface LPEarningsHistoryDashboardProps {
  walletAddress: string;
}

export function LPEarningsHistoryDashboard({ walletAddress }: LPEarningsHistoryDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  const [chartTimeRange, setChartTimeRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  const trpc = useTRPC();

  const historyQuery = useQuery({
    ...trpc.getLPEarningsHistory.queryOptions({
      walletAddress,
      timeRange,
      limit: 50,
      offset: 0,
    }),
    enabled: !!walletAddress,
  });

  const chartDataQuery = useQuery({
    ...trpc.getLPEarningsChartData.queryOptions({
      walletAddress,
      timeRange: chartTimeRange,
    }),
    enabled: !!walletAddress,
  });

  const positionQuery = useQuery({
    ...trpc.getProtocolVaultPosition.queryOptions({
      walletAddress,
    }),
    enabled: !!walletAddress,
  });

  const toggleAutoCompoundMutation = useMutation(trpc.toggleLPAutoCompound.mutationOptions());

  const handleToggleAutoCompound = async (enabled: boolean) => {
    try {
      await toggleAutoCompoundMutation.mutateAsync({
        walletAddress,
        enabled,
      });
      
      toast.success(
        enabled 
          ? '🔄 Auto-compound enabled! Fees will be reinvested automatically.' 
          : '⏸️ Auto-compound disabled. Fees will accumulate in your balance.'
      );
      
      // Refetch position to get updated autoCompound status
      positionQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update auto-compound setting');
    }
  };

  if (historyQuery.isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green mx-auto mb-3"></div>
        <p className="text-sm text-gray-400">Loading earnings history...</p>
      </div>
    );
  }

  if (historyQuery.isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
        <p className="text-red-500">Failed to load earnings history</p>
      </div>
    );
  }

  const data = historyQuery.data;
  if (!data) return null;

  const { events, summary } = data;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="w-5 h-5 text-brand-green" />;
      case 'withdrawal':
        return <ArrowUpCircle className="w-5 h-5 text-brand-cyan" />;
      case 'fee_earned':
        return <DollarSign className="w-5 h-5 text-yellow-400" />;
      default:
        return <Droplet className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'fee_earned':
        return 'Fee Earned';
      default:
        return 'Event';
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto-Compound Toggle */}
      {positionQuery.data && (
        <div className="mb-6 p-6 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-brand-green" />
                <h3 className="font-semibold text-lg">Auto-Compound LP Fees</h3>
              </div>
              <p className="text-sm text-gray-400 mb-3">
                Automatically reinvest your earned fees back into the Protocol Vault to maximize returns through compounding. 
                When enabled, fees are added to your deposited amount instead of pending balance.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const pos = positionQuery.data;
                    if (pos) handleToggleAutoCompound(!pos.autoCompound);
                  }}
                  disabled={toggleAutoCompoundMutation.isPending}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    positionQuery.data.autoCompound ? 'bg-brand-green' : 'bg-white/20'
                  } ${toggleAutoCompoundMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      positionQuery.data.autoCompound ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-semibold">
                  {positionQuery.data.autoCompound ? (
                    <span className="text-brand-green">Enabled</span>
                  ) : (
                    <span className="text-gray-400">Disabled</span>
                  )}
                </span>
              </div>
            </div>
            {positionQuery.data.autoCompound && (
              <div className="px-4 py-2 bg-brand-green/20 border border-brand-green/30 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Compounding Active</div>
                <div className="text-sm font-semibold text-brand-green">
                  ${positionQuery.data.deposited.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Current position</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Earnings Charts */}
      {chartDataQuery.data && (
        <div className="mb-6">
          <LPEarningsCharts
            data={chartDataQuery.data.chartData}
            summary={chartDataQuery.data.summary}
            timeRange={chartTimeRange}
            onTimeRangeChange={setChartTimeRange}
          />
        </div>
      )}

      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <h2 className="font-syne font-bold text-2xl">LP Earnings History</h2>
        <div className="flex gap-2">
          {(['7D', '30D', '90D', 'ALL'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                timeRange === range
                  ? 'bg-brand-green text-brand-bg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Total Deposited</div>
          <div className="font-mono font-bold text-xl">${summary.totalDeposited.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Total Withdrawn</div>
          <div className="font-mono font-bold text-xl">${summary.totalWithdrawn.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Total Fees Earned</div>
          <div className="font-mono font-bold text-xl text-brand-green">${summary.totalFeesEarned.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">
            ${summary.totalFeesPending.toFixed(2)} pending
          </div>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">ROI</div>
          <div className={`font-mono font-bold text-xl ${summary.roi >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
            {summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/5 border border-white/10 rounded-xl">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">Activity Timeline</h3>
        </div>
        <div className="divide-y divide-white/5">
          {events.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Droplet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No activity in this time period</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="font-semibold text-sm">
                          {getEventLabel(event.type)}
                        </div>
                        {event.marketName && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {event.marketName}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${
                          event.type === 'deposit' 
                            ? 'text-brand-green' 
                            : event.type === 'withdrawal'
                            ? 'text-brand-cyan'
                            : 'text-yellow-400'
                        }`}>
                          {event.type === 'deposit' ? '+' : event.type === 'withdrawal' ? '-' : '+'}
                          ${event.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Net Position Summary */}
      <div className="p-6 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 border border-brand-green/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400 mb-1">Current LP Value</div>
            <div className="font-mono font-bold text-3xl">${summary.currentValue.toFixed(2)}</div>
            <div className="text-sm text-gray-400 mt-1">
              Net deposits: ${summary.netDeposits.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              {summary.roi >= 0 ? (
                <TrendingUp className="w-6 h-6 text-brand-green" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-500" />
              )}
              <span className={`font-mono font-bold text-2xl ${
                summary.roi >= 0 ? 'text-brand-green' : 'text-red-500'
              }`}>
                {summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Total return
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
