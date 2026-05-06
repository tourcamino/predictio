import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { Bell, Save, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function VaultAlertConfigPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  const [minTvl, setMinTvl] = useState<string>('');
  const [maxUtilization, setMaxUtilization] = useState<string>('');
  const [minDailyFees, setMinDailyFees] = useState<string>('');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current thresholds
  const thresholdsQuery = useQuery({
    ...trpc.getVaultAlertThresholds.queryOptions({}),
  });

  // Update thresholds mutation
  const updateMutation = useMutation({
    ...trpc.updateVaultAlertThresholds.mutationOptions(),
    onSuccess: () => {
      toast.success('Alert thresholds updated successfully');
      queryClient.invalidateQueries({ queryKey: trpc.getVaultAlertThresholds.queryKey() });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update thresholds');
    },
  });

  // Initialize form values when data loads
  useEffect(() => {
    if (thresholdsQuery.data && !isEditing && !minTvl) {
      setMinTvl(thresholdsQuery.data.minTvlThreshold?.toString() || '');
      setMaxUtilization(((thresholdsQuery.data.maxUtilizationRate || 0) * 100).toFixed(0));
      setMinDailyFees(thresholdsQuery.data.minDailyFeesThreshold?.toString() || '');
      setAlertsEnabled(thresholdsQuery.data.alertsEnabled);
    }
  }, [thresholdsQuery.data, isEditing, minTvl]);

  const handleSave = () => {
    const tvlValue = parseFloat(minTvl);
    const utilizationValue = parseFloat(maxUtilization) / 100;
    const feesValue = parseFloat(minDailyFees);

    if (minTvl && (isNaN(tvlValue) || tvlValue < 0)) {
      toast.error('TVL threshold must be a positive number');
      return;
    }

    if (maxUtilization && (isNaN(utilizationValue) || utilizationValue < 0 || utilizationValue > 1)) {
      toast.error('Utilization rate must be between 0% and 100%');
      return;
    }

    if (minDailyFees && (isNaN(feesValue) || feesValue < 0)) {
      toast.error('Daily fees threshold must be a positive number');
      return;
    }

    updateMutation.mutate({
      minTvlThreshold: minTvl ? tvlValue : undefined,
      maxUtilizationRate: maxUtilization ? utilizationValue : undefined,
      minDailyFeesThreshold: minDailyFees ? feesValue : undefined,
      alertsEnabled: alertsEnabled,
    });
  };

  const handleReset = () => {
    if (thresholdsQuery.data) {
      setMinTvl(thresholdsQuery.data.minTvlThreshold?.toString() || '');
      setMaxUtilization(((thresholdsQuery.data.maxUtilizationRate || 0) * 100).toFixed(0));
      setMinDailyFees(thresholdsQuery.data.minDailyFeesThreshold?.toString() || '');
      setAlertsEnabled(thresholdsQuery.data.alertsEnabled);
      setIsEditing(false);
    }
  };

  if (thresholdsQuery.isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="h-32 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-syne font-bold">Performance Alert Thresholds</h3>
        </div>
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-3 py-1 text-sm bg-brand-green text-brand-bg rounded hover:bg-brand-green/90 transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={alertsEnabled}
            onChange={(e) => {
              setAlertsEnabled(e.target.checked);
              setIsEditing(true);
            }}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
          />
          <div className="flex-1">
            <div className="font-semibold text-white flex items-center gap-2">
              {alertsEnabled ? (
                <>
                  <CheckCircle className="w-4 h-4 text-brand-green" />
                  Alerts Enabled
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-gray-500" />
                  Alerts Disabled
                </>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {alertsEnabled 
                ? 'You will receive notifications when vault metrics breach configured thresholds'
                : 'No alerts will be sent regardless of vault performance'
              }
            </div>
          </div>
        </label>
      </div>

      {/* Alert Configuration */}
      <div className="space-y-6 opacity-100 transition-opacity" style={{ opacity: alertsEnabled ? 1 : 0.5 }}>
        {/* Min TVL Threshold */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Minimum TVL Threshold (USDC)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="10"
              min="0"
              value={minTvl}
              onChange={(e) => {
                setMinTvl(e.target.value);
                setIsEditing(true);
              }}
              disabled={!alertsEnabled}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono disabled:opacity-50"
              placeholder="400"
            />
            <span className="text-sm text-gray-400 font-mono w-20">
              {minTvl ? `$${parseInt(minTvl).toLocaleString()}` : '-'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Alert when total vault TVL falls below this amount
          </p>
        </div>

        {/* Max Utilization Rate */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Maximum Utilization Rate (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="5"
              min="0"
              max="100"
              value={maxUtilization}
              onChange={(e) => {
                setMaxUtilization(e.target.value);
                setIsEditing(true);
              }}
              disabled={!alertsEnabled}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono disabled:opacity-50"
              placeholder="85"
            />
            <span className="text-sm text-gray-400 font-mono w-20">
              {maxUtilization ? `${maxUtilization}%` : '-'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Alert when vault utilization (exposed / total) exceeds this percentage
          </p>
        </div>

        {/* Min Daily Fees */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Minimum Daily Fees (USDC)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="1"
              min="0"
              value={minDailyFees}
              onChange={(e) => {
                setMinDailyFees(e.target.value);
                setIsEditing(true);
              }}
              disabled={!alertsEnabled}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono disabled:opacity-50"
              placeholder="5"
            />
            <span className="text-sm text-gray-400 font-mono w-20">
              {minDailyFees ? `$${parseFloat(minDailyFees).toFixed(2)}` : '-'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Alert when 24-hour fee collection falls below this amount
          </p>
        </div>

        {/* Current Status */}
        {!isEditing && thresholdsQuery.data && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="text-sm font-semibold text-yellow-500 mb-3">Current Alert Configuration</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400 mb-1">Min TVL</div>
                <div className="font-mono font-bold text-white">
                  ${thresholdsQuery.data.minTvlThreshold?.toFixed(0) || 'None'}
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Max Utilization</div>
                <div className="font-mono font-bold text-white">
                  {thresholdsQuery.data.maxUtilizationRate 
                    ? `${(thresholdsQuery.data.maxUtilizationRate * 100).toFixed(0)}%`
                    : 'None'
                  }
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Min Daily Fees</div>
                <div className="font-mono font-bold text-white">
                  ${thresholdsQuery.data.minDailyFeesThreshold?.toFixed(2) || 'None'}
                </div>
              </div>
            </div>
            {thresholdsQuery.data.lastAlertSent && (
              <div className="mt-3 pt-3 border-t border-yellow-500/20 text-xs text-gray-400">
                Last alert sent: {new Date(thresholdsQuery.data.lastAlertSent).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Info Banner */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-200">
            <strong>Note:</strong> Alerts are checked periodically and will only be sent once per 24 hours
            to prevent notification spam. You'll receive notifications in your notification center.
          </div>
        </div>
      </div>
    </div>
  );
}
