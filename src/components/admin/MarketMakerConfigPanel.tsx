import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { Settings, Save, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function MarketMakerConfigPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  const [targetSpread, setTargetSpread] = useState<string>('');
  const [maxExposure, setMaxExposure] = useState<string>('');
  const [rebalanceInterval, setRebalanceInterval] = useState<string>('');
  const [enabledMarkets, setEnabledMarkets] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current config
  const configQuery = useQuery({
    ...trpc.getMarketMakerConfig.queryOptions({}),
  });

  // Fetch active markets for selection
  const marketsQuery = useQuery({
    ...trpc.getVaultAllocations.queryOptions({}),
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    ...trpc.updateMarketMakerConfig.mutationOptions(),
    onSuccess: () => {
      toast.success('Configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: trpc.getMarketMakerConfig.queryKey() });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update configuration');
    },
  });

  // Initialize form values when data loads
  useEffect(() => {
    if (configQuery.data && !isEditing && !targetSpread) {
      setTargetSpread((configQuery.data.targetSpread * 100).toFixed(2));
      setMaxExposure(configQuery.data.maxExposurePerMarket.toString());
      setRebalanceInterval(configQuery.data.rebalanceIntervalMinutes.toString());
      setEnabledMarkets(configQuery.data.enabledMarkets || []);
    }
  }, [configQuery.data, isEditing, targetSpread]);

  const handleSave = () => {
    const spreadValue = parseFloat(targetSpread) / 100;
    const exposureValue = parseFloat(maxExposure);
    const intervalValue = parseInt(rebalanceInterval);

    if (isNaN(spreadValue) || spreadValue < 0.001 || spreadValue > 0.1) {
      toast.error('Spread must be between 0.1% and 10%');
      return;
    }

    if (isNaN(exposureValue) || exposureValue < 100 || exposureValue > 50000) {
      toast.error('Max exposure must be between $100 and $50,000');
      return;
    }

    if (isNaN(intervalValue) || intervalValue < 5 || intervalValue > 1440) {
      toast.error('Rebalance interval must be between 5 and 1440 minutes');
      return;
    }

    updateConfigMutation.mutate({
      targetSpread: spreadValue,
      maxExposurePerMarket: exposureValue,
      rebalanceIntervalMinutes: intervalValue,
      enabledMarkets: enabledMarkets,
    });
  };

  const handleReset = () => {
    if (configQuery.data) {
      setTargetSpread((configQuery.data.targetSpread * 100).toFixed(2));
      setMaxExposure(configQuery.data.maxExposurePerMarket.toString());
      setRebalanceInterval(configQuery.data.rebalanceIntervalMinutes.toString());
      setEnabledMarkets(configQuery.data.enabledMarkets || []);
      setIsEditing(false);
    }
  };

  if (configQuery.isLoading) {
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
          <Settings className="w-5 h-5 text-brand-cyan" />
          <h3 className="text-lg font-syne font-bold">Market Maker Configuration</h3>
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
              disabled={updateConfigMutation.isPending}
              className="px-3 py-1 text-sm bg-brand-green text-brand-bg rounded hover:bg-brand-green/90 transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {updateConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-yellow-200">
          <strong>Note:</strong> Configuration changes will take effect on the bot's next rebalance cycle.
          The bot reads these settings dynamically without requiring a restart.
        </div>
      </div>

      {/* Configuration Form */}
      <div className="space-y-6">
        {/* Target Spread */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Target Spread (%)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="10"
              value={targetSpread}
              onChange={(e) => {
                setTargetSpread(e.target.value);
                setIsEditing(true);
              }}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono"
              placeholder="2.00"
            />
            <span className="text-sm text-gray-400 font-mono">
              {targetSpread ? `${targetSpread}%` : '-'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Bid-ask spread applied to market making orders (0.1% - 10%)
          </p>
        </div>

        {/* Max Exposure Per Market */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Max Exposure Per Market (USDC)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="100"
              min="100"
              max="50000"
              value={maxExposure}
              onChange={(e) => {
                setMaxExposure(e.target.value);
                setIsEditing(true);
              }}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono"
              placeholder="5000"
            />
            <span className="text-sm text-gray-400 font-mono">
              {maxExposure ? `$${parseInt(maxExposure).toLocaleString()}` : '-'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Maximum USDC exposure per individual market ($100 - $50,000)
          </p>
        </div>

        {/* Rebalance Interval */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Rebalance Interval (minutes)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="5"
              min="5"
              max="1440"
              value={rebalanceInterval}
              onChange={(e) => {
                setRebalanceInterval(e.target.value);
                setIsEditing(true);
              }}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono"
              placeholder="30"
            />
            <span className="text-sm text-gray-400 font-mono">
              {rebalanceInterval ? `${rebalanceInterval} min` : '-'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            How often the bot rebalances positions (5 - 1440 minutes)
          </p>
        </div>

        {/* Current Config Summary */}
        {!isEditing && configQuery.data && (
          <div className="p-4 bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg">
            <div className="text-sm font-semibold text-brand-cyan mb-3">Current Configuration</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400 mb-1">Spread</div>
                <div className="font-mono font-bold text-white">
                  {(configQuery.data.targetSpread * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Max Exposure</div>
                <div className="font-mono font-bold text-white">
                  ${configQuery.data.maxExposurePerMarket.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Rebalance</div>
                <div className="font-mono font-bold text-white">
                  {configQuery.data.rebalanceIntervalMinutes} min
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market Selection */}
        <div className="pt-4 border-t border-white/10">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Market Liquidity Control
          </label>
          <p className="text-sm text-gray-400 mb-3">
            Select which markets should receive automated liquidity provisioning.
            Leave all unchecked to provide liquidity to all active markets (recommended).
          </p>
          
          {marketsQuery.isLoading ? (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-sm text-gray-500 text-center py-2">
                Loading markets...
              </div>
            </div>
          ) : marketsQuery.data?.allocations && marketsQuery.data.allocations.length > 0 ? (
            <div className="space-y-2">
              <div className="p-3 bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg mb-3">
                <div className="text-xs text-brand-cyan">
                  💡 Tip: When no markets are selected, the bot will provide liquidity to all active markets automatically.
                  Use selective enabling for more control over specific markets.
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                {marketsQuery.data.allocations.map((allocation) => {
                  const isEnabled = enabledMarkets.length === 0 || enabledMarkets.includes(allocation.marketId);
                  const isExplicitlyEnabled = enabledMarkets.includes(allocation.marketId);
                  
                  return (
                    <label
                      key={allocation.marketId}
                      className="flex items-start gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isExplicitlyEnabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEnabledMarkets([...enabledMarkets, allocation.marketId]);
                          } else {
                            setEnabledMarkets(enabledMarkets.filter(id => id !== allocation.marketId));
                          }
                          setIsEditing(true);
                        }}
                        className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {allocation.marketName}
                          </span>
                          {enabledMarkets.length === 0 && (
                            <span className="text-xs px-2 py-0.5 bg-brand-green/20 text-brand-green rounded">
                              Auto
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{allocation.sport}</span>
                          <span>•</span>
                          <span>Allocated: ${allocation.allocatedUsdc.toFixed(0)}</span>
                          <span>•</span>
                          <span>Util: {allocation.utilizationRate.toFixed(0)}%</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                <span>
                  {enabledMarkets.length === 0 
                    ? `All ${marketsQuery.data.allocations.length} markets enabled (auto)`
                    : `${enabledMarkets.length} of ${marketsQuery.data.allocations.length} markets selected`
                  }
                </span>
                {enabledMarkets.length > 0 && (
                  <button
                    onClick={() => {
                      setEnabledMarkets([]);
                      setIsEditing(true);
                    }}
                    className="text-brand-cyan hover:underline"
                  >
                    Clear selection (enable all)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-sm text-gray-500 text-center py-2">
                No active markets available
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
