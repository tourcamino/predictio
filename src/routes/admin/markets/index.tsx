import { createFileRoute } from '@tanstack/react-router';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useState } from 'react';
import { mockMarkets } from '~/data/mockMarkets';
import { Search, Eye, Edit, CheckCircle, XCircle } from 'lucide-react';
import { calcMarketHealth, getHealthStatus, formatCurrency } from '~/utils/marketUtils';

export const Route = createFileRoute('/admin/markets/')({
  component: AdminMarkets,
});

type StatusFilter = 'all' | 'open' | 'closing-soon' | 'resolved' | 'cancelled';

function AdminMarkets() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncFromAzuro = async () => {
    setIsSyncing(true);
    try {
      // In a real implementation, this would call a tRPC mutation to sync
      // For now, just simulate a sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('[Admin] Synced markets from Azuro');
    } catch (error) {
      console.error('[Admin] Failed to sync from Azuro:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-mono text-green-500">
            🟢 OPEN
          </span>
        );
      case 'closing-soon':
        return (
          <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs font-mono text-yellow-500 animate-pulse">
            🟡 CLOSING
          </span>
        );
      case 'closed':
        return (
          <span className="px-2 py-1 bg-gray-500/20 border border-gray-500/30 rounded text-xs font-mono text-gray-500">
            ✅ RESOLVED
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs font-mono text-red-500">
            ❌ CANCELLED
          </span>
        );
    }
  };

  const formatClosesAt = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) return '—';
    if (hours < 1) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  const toggleMarket = (id: string) => {
    const newSelected = new Set(selectedMarkets);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMarkets(newSelected);
  };

  const filteredMarkets = mockMarkets.filter((market) => {
    const matchesSearch = 
      market.teamA.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.teamB.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.league.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || market.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate health statistics
  const marketsWithHealth = filteredMarkets.map(market => {
    const liquidity = market.liquidity?.totalPool || 0;
    const spread = market.liquidity?.spreadPct || 0.1;
    const volume24h = market.liquidity?.volume24h || 0;
    const botActive = market.liquidity?.botActive || false;
    
    const healthScore = calcMarketHealth(liquidity, spread, volume24h, botActive);
    const healthStatus = getHealthStatus(healthScore);
    
    return {
      ...market,
      healthScore,
      healthStatus,
    };
  });

  const openMarkets = mockMarkets.filter(m => m.status === 'open' || m.status === 'closing-soon').length;
  const healthyMarkets = marketsWithHealth.filter(m => m.healthScore >= 80).length;
  const atRiskMarkets = marketsWithHealth.filter(m => m.healthScore < 50).length;
  const offlineBotMarkets = mockMarkets.filter(m => m.liquidity && !m.liquidity.botActive).length;
  const totalLiquidity = mockMarkets.reduce((sum, m) => sum + (m.liquidity?.totalPool || 0), 0);

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Markets" />
      
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-syne font-bold">All Markets</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSyncFromAzuro}
              disabled={isSyncing}
              className="px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <span>↻</span>
                  Sync from Azuro
                </>
              )}
            </button>
            <div className="text-sm text-gray-400 font-mono">
              Showing {filteredMarkets.length} of {mockMarkets.length} markets
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
          <div>
            <div className="text-xs text-gray-400 mb-1">Markets open</div>
            <div className="text-2xl font-bold font-mono">{openMarkets}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Healthy</div>
            <div className="text-2xl font-bold font-mono text-green-500">{healthyMarkets}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">At risk</div>
            <div className="text-2xl font-bold font-mono text-red-500">{atRiskMarkets}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Offline bot</div>
            <div className="text-2xl font-bold font-mono text-orange-500">{offlineBotMarkets}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Total liquidity</div>
            <div className="text-2xl font-bold font-mono text-brand-green">{formatCurrency(totalLiquidity)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-green transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'open', 'closing-soon', 'resolved', 'cancelled'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  px-4 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize
                  ${statusFilter === status
                    ? 'bg-brand-green text-black'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                  }
                `}
              >
                {status.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-white/5"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMarkets(new Set(filteredMarkets.map(m => m.id)));
                        } else {
                          setSelectedMarkets(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Sport</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Azuro Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Health</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Predictions</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Closes At</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {marketsWithHealth.slice(0, 25).map((market, index) => (
                  <tr
                    key={market.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedMarkets.has(market.id)}
                        onChange={() => toggleMarket(market.id)}
                        className="rounded border-white/20 bg-white/5"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">
                      #{1000 + index}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-xl">{market.sportEmoji}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-white">{market.teamA} vs {market.teamB}</div>
                      <div className="text-xs text-gray-500 font-mono">{market.league}</div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(market.status)}
                    </td>
                    <td className="px-4 py-3">
                      {market.id.startsWith('azuro-') ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-brand-green/20 border border-brand-green/30 rounded text-xs font-mono text-brand-green">
                            ✓ Azuro
                          </span>
                          {market.status === 'resolved' && (
                            <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-mono text-purple-400">
                              Auto-resolved
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 ${market.healthStatus.bgColor} border rounded text-xs font-mono font-semibold ${market.healthStatus.color}`}>
                          {market.healthStatus.label}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {market.healthScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-white">
                      ${market.volume.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-white">
                      {(market.predictions ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">
                      {formatClosesAt(market.closesAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-white/10 rounded transition-colors" title="View">
                          <Eye size={16} className="text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Edit">
                          <Edit size={16} className="text-gray-400" />
                        </button>
                        {market.status === 'open' && (
                          <button className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Resolve">
                            <CheckCircle size={16} className="text-green-500" />
                          </button>
                        )}
                        <button className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Cancel">
                          <XCircle size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedMarkets.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-green text-black px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-slide-down">
            <span className="font-mono font-bold">
              {selectedMarkets.size} markets selected
            </span>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-black/20 hover:bg-black/30 rounded-lg text-sm font-medium transition-colors">
                Resolve All
              </button>
              <button className="px-4 py-2 bg-black/20 hover:bg-black/30 rounded-lg text-sm font-medium transition-colors">
                Cancel All
              </button>
              <button className="px-4 py-2 bg-black/20 hover:bg-black/30 rounded-lg text-sm font-medium transition-colors">
                Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
