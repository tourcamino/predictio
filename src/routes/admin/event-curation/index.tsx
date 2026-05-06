import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useWallet } from '~/store/useWalletStore';
import {
  apiRequest,
  getApiBaseUrl,
  getLocalDevAdminSecretFallback,
} from '~/lib/predictioApi';
import toast from 'react-hot-toast';
import { Search, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/admin/event-curation/')({
  component: EventCurationPage,
});

type AzuroEventRow = {
  gameId: string;
  title: string;
  startsAt: string;
  startsAtUnix: number;
  leagueName: string;
  country: string;
  homeTeam: string;
  awayTeam: string;
  homeImage?: string | null;
  awayImage?: string | null;
  status: string;
  isSelected: boolean;
};

type AzuroEventsDiagnostics = {
  graphqlUrl: string;
  indexerRawCount: number;
  footballInWindowCount: number;
  querySucceeded: boolean;
  lastError?: string;
  listedCount: number;
  droppedPastKickoff: number;
};

const MAX_SELECTED = 12;

function EventCurationPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useWallet();
  const founderWallet = (import.meta.env.VITE_FOUNDER_WALLET as string | undefined)?.trim();
  const adminKeyFromEnv = (import.meta.env.VITE_ADMIN_KEY as string | undefined)?.trim();
  const adminKey =
    adminKeyFromEnv || getLocalDevAdminSecretFallback() || '';

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<AzuroEventRow[]>([]);
  const [diag, setDiag] = useState<AzuroEventsDiagnostics | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [initialSelected, setInitialSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!founderWallet) return;
    if (!isConnected) return;
    if (address?.toLowerCase() !== founderWallet.toLowerCase()) {
      toast.error('Founder wallet required for Event Curation');
      navigate({ to: '/' });
    }
  }, [founderWallet, isConnected, address, navigate]);

  const loadEvents = useCallback(async () => {
    if (!adminKey) {
      setLoading(false);
      toast.error('Set VITE_ADMIN_KEY or open this page from localhost dev (uses dev_bot_key).');
      return;
    }
    setLoading(true);
    const res = await apiRequest<{ events: AzuroEventRow[]; diagnostics?: AzuroEventsDiagnostics }>(
      '/api/admin/azuro-events',
      {
        adminSecretKey: adminKey,
        timeoutMs: 60_000,
      },
    );
    setLoading(false);
    if (!res.ok) {
      const errBody = res.error as { message?: string; error?: string };
      toast.error(errBody?.message || errBody?.error || 'Failed to load Azuro events');
      setDiag(null);
      return;
    }
    const ev = res.data.events ?? [];
    setDiag(res.data.diagnostics ?? null);
    setEvents(ev);
    const sel = new Set(ev.filter((e) => e.isSelected).map((e) => e.gameId));
    setPending(new Set(sel));
    setInitialSelected(new Set(sel));
  }, [adminKey]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const blob = [
        e.title,
        e.leagueName,
        e.country,
        e.homeTeam,
        e.awayTeam,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [events, search]);

  const selectedCount = pending.size;
  const atCap = selectedCount >= MAX_SELECTED;

  const toggle = (gameId: string) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
        return next;
      }
      if (next.size >= MAX_SELECTED) return prev;
      next.add(gameId);
      return next;
    });
  };

  const saveSelection = async () => {
    if (!adminKey) {
      toast.error('Set VITE_ADMIN_KEY in .env');
      return;
    }
    const selectedBy = address?.trim() || 'unknown';
    const toDeselect = [...initialSelected].filter((id) => !pending.has(id));
    const toSelect = [...pending].filter((id) => !initialSelected.has(id));
    if (toDeselect.length === 0 && toSelect.length === 0) {
      toast('No changes to save');
      return;
    }
    setSaving(true);
    try {
      for (const gameId of toDeselect) {
        const r = await apiRequest('/api/admin/events/select', {
          method: 'POST',
          body: { gameId, selected: false, selectedBy },
          adminSecretKey: adminKey,
          timeoutMs: 30_000,
        });
        if (!r.ok) {
          throw new Error(
            (r.error as { message?: string })?.message || `Failed to deselect ${gameId}`,
          );
        }
      }
      for (const gameId of toSelect) {
        const r = await apiRequest('/api/admin/events/select', {
          method: 'POST',
          body: { gameId, selected: true, selectedBy },
          adminSecretKey: adminKey,
          timeoutMs: 30_000,
        });
        if (!r.ok) {
          const msg =
            (r.error as { message?: string })?.message ||
            (r.error as { error?: string })?.error ||
            `Failed to select ${gameId}`;
          throw new Error(String(msg));
        }
      }
      toast.success('Markets updated successfully');
      await loadEvents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const fmtKickoff = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#080B11' }}>
      <AdminTopBar title="Event Curation" breadcrumbs={['Markets']} />

      <div className="p-6 space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-syne font-bold mb-1">Event Curation — Select Markets</h1>
          <p className="text-sm text-gray-500 font-mono">
            API: {getApiBaseUrl()} · Azuro indexer must match app chain (
            <code className="text-gray-400">AZURO_GRAPHQL_URL</code>).
          </p>
        </div>

        {!adminKeyFromEnv && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
            {getLocalDevAdminSecretFallback() ? (
              <>
                No <code className="font-mono">VITE_ADMIN_KEY</code> — using local fallback{' '}
                <code className="font-mono">dev_bot_key</code> (same as default backend{' '}
                <code className="font-mono">BOT_API_KEY</code>). For production, set{' '}
                <code className="font-mono">VITE_ADMIN_KEY</code> ={' '}
                <code className="font-mono">ADMIN_SECRET</code>.
              </>
            ) : (
              <>
                Set <code className="font-mono">VITE_ADMIN_KEY</code> to match server{' '}
                <code className="font-mono">ADMIN_SECRET</code>.
              </>
            )}
          </div>
        )}

        {founderWallet && (!isConnected || address?.toLowerCase() !== founderWallet.toLowerCase()) ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
            Connect the founder wallet ({founderWallet.slice(0, 6)}…{founderWallet.slice(-4)}) to use this page.
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="font-mono text-brand-green">
            <span className="text-2xl font-bold">{selectedCount}</span>
            <span className="text-gray-400"> / {MAX_SELECTED} markets selected</span>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or league…"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-500 focus:outline-none focus:border-brand-green font-mono"
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              Loading Azuro events…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-left text-xs uppercase text-gray-500 font-mono">
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">Match</th>
                    <th className="px-4 py-3">Competition</th>
                    <th className="px-4 py-3 font-mono">Kickoff</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filtered.map((e) => {
                    const checked = pending.has(e.gameId);
                    const disableCheckbox = !checked && atCap;
                    return (
                      <tr key={e.gameId} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disableCheckbox}
                            title={disableCheckbox ? 'Max 12 markets reached' : undefined}
                            onChange={() => toggle(e.gameId)}
                            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#00FF87] disabled:opacity-40"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2 shrink-0">
                              {e.homeImage ? (
                                <img
                                  src={e.homeImage}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-white/10 bg-white/5 object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5" />
                              )}
                              {e.awayImage ? (
                                <img
                                  src={e.awayImage}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-white/10 bg-white/5 object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5" />
                              )}
                            </div>
                            <div>
                              <div className="font-syne font-semibold">{e.title}</div>
                              <div className="text-xs text-gray-500 font-mono">{e.gameId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {e.leagueName}
                          <span className="text-gray-500"> — {e.country}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">
                          {fmtKickoff(e.startsAt)}
                        </td>
                        <td className="px-4 py-3">
                          {pending.has(e.gameId) ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono bg-brand-green/20 text-[#00FF87] border border-brand-green/30">
                              SELECTED
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs font-mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && filtered.length === 0 && (
                <div className="py-12 px-4 text-center text-gray-500 text-sm space-y-3 max-w-2xl mx-auto">
                  <p>No upcoming football events in this window (next 14 days, kickoff after now).</p>
                  {diag ? (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-xs font-mono text-gray-400 space-y-1.5">
                      <div>
                        <span className="text-gray-500">Indexer </span>
                        <span className="break-all text-gray-300">{diag.graphqlUrl}</span>
                      </div>
                      <div>
                        Subgraph rows (Created/Paused + future kickoff, before football filter):{' '}
                        <span className="text-gray-200">{diag.indexerRawCount}</span>
                        {' · '}
                        Football in 14d window:{' '}
                        <span className="text-gray-200">{diag.footballInWindowCount}</span>
                        {diag.droppedPastKickoff > 0 ? (
                          <>
                            {' · '}
                            Dropped as past kickoff (stale cache):{' '}
                            <span className="text-amber-300/90">{diag.droppedPastKickoff}</span>
                          </>
                        ) : null}
                      </div>
                      {!diag.querySucceeded && diag.lastError ? (
                        <div className="text-red-300/90 pt-1">Query error: {diag.lastError}</div>
                      ) : null}
                      {diag.querySucceeded && diag.indexerRawCount === 0 ? (
                        <p className="text-gray-500 pt-1 normal-case font-sans text-[13px] leading-snug">
                          The subgraph returned no games for this filter — often the deployment has no upcoming rows
                          synced yet, or <code className="text-gray-400">AZURO_GRAPHQL_URL</code> points at the wrong
                          chain.
                        </p>
                      ) : null}
                      {diag.querySucceeded && diag.indexerRawCount > 0 && diag.footballInWindowCount === 0 ? (
                        <p className="text-gray-500 pt-1 normal-case font-sans text-[13px] leading-snug">
                          The indexer returned games, but none matched soccer/football within the next 14 days (or all
                          kickoffs were in the past).
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="text-xs text-gray-600">
                    If this stays empty: run the Express backend on port 3001 (API base above must be{' '}
                    <code className="text-gray-400">http://127.0.0.1:3001</code> in dev), set{' '}
                    <code className="text-gray-400">ADMIN_SECRET</code> / <code className="text-gray-400">VITE_ADMIN_KEY</code>, and
                    align <code className="text-gray-400">AZURO_GRAPHQL_URL</code> on the backend with your indexer chain.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving || !adminKey}
            onClick={() => void saveSelection()}
            className="px-6 py-3 rounded-lg font-semibold bg-[#00FF87] text-black hover:bg-[#00FF87]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Selection'}
          </button>
        </div>
      </div>
    </div>
  );
}
