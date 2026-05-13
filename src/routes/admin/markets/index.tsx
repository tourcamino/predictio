import { createFileRoute } from '@tanstack/react-router';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useState, useMemo } from 'react';
import { Search, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { formatCurrency } from '~/utils/marketUtils';
import type { AzuroMarket } from '~/services/azuro';

export const Route = createFileRoute('/admin/markets/')({
  component: AdminMarkets,
});

type StatusFilter = 'all' | 'open' | 'closing-soon' | 'resolved' | 'cancelled';

/** Map SeedMarket-style status to admin filter buckets */
function uiStatus(m: AzuroMarket): string {
  const s = m.status;
  if (s === 'resolved') return 'resolved';
  if (s === 'locked') return 'cancelled';
  if (s === 'ending-soon') return 'closing-soon';
  if (s === 'live') return 'open';
  return 'open';
}

function AdminMarkets() {
  const trpc = useTRPC();
  const azuroQuery = useQuery({
    ...trpc.getAzuroMarkets.queryOptions({}),
    staleTime: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const markets = azuroQuery.data?.markets ?? [];

  const handleSyncFromAzuro = async () => {
    setIsSyncing(true);
    try {
      await azuroQuery.refetch();
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredMarkets = useMemo(() => {
    return markets.filter((m) => {
      const teams = m.event?.teams ?? [];
      const hay = `${teams[0] ?? ''} ${teams[1] ?? ''} ${m.competition} ${m.question}`.toLowerCase();
      const matchesSearch = hay.includes(searchQuery.toLowerCase());
      const st = uiStatus(m);
      const matchesStatus = statusFilter === 'all' || st === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [markets, searchQuery, statusFilter]);

  const openMarkets = markets.filter((m) => uiStatus(m) === 'open' || uiStatus(m) === 'closing-soon').length;
  const totalLiquidity = markets.reduce((sum, m) => sum + (m.liquidity || 0), 0);

  const toggleMarket = (id: string) => {
    const next = new Set(selectedMarkets);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMarkets(next);
  };

  const formatClosesAt = (endsAt: string) => {
    const date = new Date(endsAt);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (diff < 0) return '—';
    if (hours < 1) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Markets" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-syne font-bold">Azuro markets</h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleSyncFromAzuro()}
              disabled={isSyncing || azuroQuery.isFetching}
              className="px-4 py-2 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSyncing || azuroQuery.isFetching ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                  Refreshing…
                </>
              ) : (
                <>
                  <span>↻</span>
                  Refresh from Azuro
                </>
              )}
            </button>
            <div className="text-sm text-gray-400 font-mono">
              {filteredMarkets.length} shown · source: {azuroQuery.data?.source ?? '…'}
            </div>
          </div>
        </div>

        {azuroQuery.isError && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            Failed to load Azuro markets. Check indexer URL env and network.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
          <div>
            <div className="text-xs text-gray-400 mb-1">Open / closing</div>
            <div className="text-2xl font-bold font-mono">{openMarkets}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Listed</div>
            <div className="text-2xl font-bold font-mono">{markets.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Total liquidity (Azuro)</div>
            <div className="text-2xl font-bold font-mono text-brand-green">{formatCurrency(totalLiquidity)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Indexer</div>
            <div className="text-sm text-gray-300 font-mono truncate">Azuro data-feed</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search teams, league…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-green transition-colors"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['all', 'open', 'closing-soon', 'resolved', 'cancelled'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
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
                          setSelectedMarkets(new Set(filteredMarkets.map((m) => m.id)));
                        } else {
                          setSelectedMarkets(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Azuro game</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Volume 24h</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Ends</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMarkets.slice(0, 40).map((m) => {
                  const teams = m.event?.teams ?? [];
                  const label = teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : m.question;
                  return (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedMarkets.has(m.id)}
                          onChange={() => toggleMarket(m.id)}
                          className="rounded border-white/20 bg-white/5"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400 max-w-[120px] truncate">{m.id}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-white">{label}</div>
                        <div className="text-xs text-gray-500 font-mono">{m.competition}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-300">{m.status}</td>
                      <td className="px-4 py-3 text-xs font-mono text-brand-green">{m.azuroGameId ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono">${m.volume24h.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-400">{formatClosesAt(m.endsAt)}</td>
                      <td className="px-4 py-3">
                        <button type="button" className="p-1.5 hover:bg-white/10 rounded transition-colors" title="View">
                          <Eye size={16} className="text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selectedMarkets.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-green text-black px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-slide-down">
            <span className="font-mono font-bold">{selectedMarkets.size} selected</span>
          </div>
        )}
      </div>
    </div>
  );
}
