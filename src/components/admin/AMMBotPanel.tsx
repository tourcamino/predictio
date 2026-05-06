import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { AMMOrdersModal } from './AMMOrdersModal';

export function AMMBotPanel() {
  const trpc = useTRPC();
  const [showOrdersModal, setShowOrdersModal] = useState(false);

  // Poll bot heartbeat every 5 seconds
  const heartbeatQuery = useQuery({
    ...trpc.getBotHeartbeat.queryOptions({}),
    refetchInterval: 5000,
  });

  // Get vault allocations
  const allocationsQuery = useQuery(
    trpc.getVaultAllocations.queryOptions({})
  );

  const heartbeat = heartbeatQuery.data;
  const allocations = allocationsQuery.data?.allocations || [];

  // Status indicator color
  const getStatusColor = () => {
    if (!heartbeat) return '#888888';
    if (heartbeat.status === 'ONLINE' && !heartbeat.isStale) return '#00FF87';
    if (heartbeat.status === 'ERROR') return '#FF4444';
    return '#888888';
  };

  const getStatusLabel = () => {
    if (!heartbeat) return 'OFFLINE';
    if (heartbeat.isStale) return 'OFFLINE';
    return heartbeat.status;
  };

  // Format time ago
  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  const formatTimeUntil = (date: Date | null) => {
    if (!date) return 'Unknown';
    const seconds = Math.floor((new Date(date).getTime() - Date.now()) / 1000);
    if (seconds < 0) return 'Overdue';
    if (seconds < 60) return `in ${seconds} seconds`;
    if (seconds < 3600) return `in ${Math.floor(seconds / 60)} minutes`;
    return `in ${Math.floor(seconds / 3600)} hours`;
  };

  // Top 4 markets by exposure
  const topMarkets = allocations
    .filter(a => a.currentExposure > 0)
    .sort((a, b) => b.currentExposure - a.currentExposure)
    .slice(0, 4);

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🤖</span>
          <h3 className="text-lg font-syne font-bold">AMM BOT</h3>
        </div>

        {/* Status */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: getStatusColor(),
                boxShadow: heartbeat?.status === 'ONLINE' && !heartbeat?.isStale
                  ? `0 0 8px ${getStatusColor()}`
                  : 'none',
              }}
            />
            <span className="font-mono font-bold text-sm" style={{ color: getStatusColor() }}>
              {getStatusLabel()}
            </span>
          </div>
          {heartbeat?.isStale && (
            <div className="flex items-center gap-1 text-xs text-yellow-500">
              <AlertTriangle size={14} />
              <span>No heartbeat for {heartbeat.secondsSinceLastRun}s</span>
            </div>
          )}
        </div>

        {/* Timing */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Last run</div>
            <div className="font-mono text-sm">
              {heartbeatQuery.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                formatTimeAgo(heartbeat?.lastRun || null)
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Next run</div>
            <div className="font-mono text-sm">
              {heartbeatQuery.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                formatTimeUntil(heartbeat?.nextRun || null)
              )}
            </div>
          </div>
        </div>

        {/* This cycle metrics */}
        <div className="mb-4 p-3 bg-brand-cyan/10 border border-brand-cyan/30 rounded">
          <div className="text-sm font-semibold text-brand-cyan mb-2">This cycle:</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-gray-400">Markets processed</div>
              <div className="font-mono font-bold text-white">
                {heartbeat?.marketsProcessed || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Orders placed</div>
              <div className="font-mono font-bold text-white">
                {heartbeat?.ordersPlaced || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Rebalances done</div>
              <div className="font-mono font-bold text-white">
                {heartbeat?.rebalancesDone || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {heartbeat?.errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
            <div className="text-sm font-semibold text-red-500 mb-1">Error</div>
            <div className="text-xs text-gray-300">{heartbeat.errorMessage}</div>
          </div>
        )}

        {/* Vault exposure */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-300 mb-3">Vault exposure:</div>
          {allocationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-brand-cyan" />
            </div>
          ) : topMarkets.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No active exposure yet
            </div>
          ) : (
            <div className="space-y-3">
              {topMarkets.map((market) => {
                const percentage = (market.currentExposure / market.maxCap) * 100;
                return (
                  <div key={market.marketId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-300 truncate flex-1">
                        {market.marketName}
                      </div>
                      <div className="font-mono text-xs text-white ml-2">
                        ${Math.round(market.currentExposure)} / ${Math.round(market.maxCap)}
                      </div>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-cyan to-brand-green transition-all duration-300"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Control buttons */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            className="py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 font-semibold rounded hover:bg-yellow-500/30 transition-all text-sm"
            disabled
          >
            Pause Bot
          </button>
          <button
            className="py-2 bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan font-semibold rounded hover:bg-brand-cyan/30 transition-all text-sm"
            disabled
          >
            Force Rebalance
          </button>
        </div>
        <button
          onClick={() => setShowOrdersModal(true)}
          className="w-full py-2 bg-white/5 border border-white/10 text-white font-semibold rounded hover:bg-white/10 transition-all text-sm"
        >
          View Orders Log
        </button>
      </div>

      {/* Orders Modal */}
      {showOrdersModal && (
        <AMMOrdersModal onClose={() => setShowOrdersModal(false)} />
      )}
    </>
  );
}
