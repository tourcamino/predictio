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
import { Search, Loader2, Check } from 'lucide-react';

export const Route = createFileRoute('/admin/event-curation/')({
  component: EventCurationPage,
});

type LeagueFilter =
  | 'all'
  | 'ucl'
  | 'uel'
  | 'uecl'
  | 'epl'
  | 'seriea'
  | 'laliga'
  | 'bundesliga'
  | 'ligue1'
  | 'other';

type DateFilter = 'all' | 'today' | 'tomorrow' | 'in3' | 'in7' | 'in15';

function matchLeagueFilter(leagueName: string, f: LeagueFilter): boolean {
  const l = leagueName.toLowerCase();
  if (f === 'all') return true;
  if (f === 'ucl') return l.includes('champions league');
  if (f === 'uel') return l.includes('europa league') && !l.includes('conference');
  if (f === 'uecl') return l.includes('conference league');
  if (f === 'epl') return l.includes('premier league');
  if (f === 'seriea') return l.includes('serie a');
  if (f === 'laliga') return l.includes('la liga') || l.includes('laliga');
  if (f === 'bundesliga') return l.includes('bundesliga');
  if (f === 'ligue1') return l.includes('ligue 1');
  if (f === 'other') {
    return !(
      l.includes('champions league') ||
      (l.includes('europa league') && !l.includes('conference')) ||
      l.includes('conference league') ||
      l.includes('premier league') ||
      l.includes('serie a') ||
      l.includes('la liga') ||
      l.includes('laliga') ||
      l.includes('bundesliga') ||
      l.includes('ligue 1')
    );
  }
  return true;
}

const PREFERRED_COUNTRY_VALUES = [
  '__europe__',
  'England',
  'Italy',
  'Spain',
  'Germany',
  'France',
  'Portugal',
  'Netherlands',
  'Turkey',
  'Scotland',
] as const;

function labelCountryOption(v: string): string {
  if (v === 'all') return 'All Countries';
  if (v === '__europe__') return 'Europe (coppe europee)';
  return v;
}

function isEuropeanCupsRow(leagueName: string, country: string): boolean {
  const l = leagueName.toLowerCase();
  const c = country.toLowerCase();
  if (l.includes('champions league')) return true;
  if (l.includes('europa league') && !l.includes('conference')) return true;
  if (l.includes('conference league')) return true;
  if (l.includes('uefa')) return true;
  if (c.includes('europe')) return true;
  return false;
}

function matchCountryFilter(
  leagueName: string,
  country: string,
  filterVal: string,
): boolean {
  if (filterVal === 'all') return true;
  if (filterVal === '__europe__') return isEuropeanCupsRow(leagueName, country);
  return country.trim().toLowerCase() === filterVal.trim().toLowerCase();
}

function daysUntilKickoffNumber(iso: string): number {
  const kick = new Date(iso).getTime();
  return Math.ceil((kick - Date.now()) / 86400000);
}

function matchDateFilter(startsAtIso: string, f: DateFilter): boolean {
  if (f === 'all' || f === 'in15') return true;
  const kick = new Date(startsAtIso).getTime();
  const now = Date.now();
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const t0 = startToday.getTime();
  const endToday = t0 + 86400000;
  const endTomorrow = endToday + 86400000;
  if (f === 'today') return kick >= t0 && kick < endToday;
  if (f === 'tomorrow') return kick >= endToday && kick < endTomorrow;
  if (f === 'in3') return kick >= now && kick <= now + 3 * 86400000;
  if (f === 'in7') return kick >= now && kick <= now + 7 * 86400000;
  return true;
}

function formatDaysUntilKickoff(iso: string): string {
  const kick = new Date(iso).getTime();
  const now = Date.now();
  const d = Math.ceil((kick - now) / 86400000);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `in ${d} days`;
}

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
  importanceScore?: number;
  autoPublish?: boolean;
};

const MAX_SELECTED = 12;

const accent = '#00FF87';
const bgPage = '#080B11';

function EventCurationPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useWallet();
  const founderWallet = (import.meta.env.VITE_FOUNDER_WALLET as string | undefined)?.trim();
  const adminKeyFromEnv = (import.meta.env.VITE_ADMIN_KEY as string | undefined)?.trim();
  const adminKey =
    adminKeyFromEnv || getLocalDevAdminSecretFallback() || '';

  const [search, setSearch] = useState('');
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [topMatchOnly, setTopMatchOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<AzuroEventRow[]>([]);
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
    const res = await apiRequest<{
      games?: AzuroEventRow[];
      events?: AzuroEventRow[];
    }>('/api/admin/azuro-events', {
      adminSecretKey: adminKey,
      timeoutMs: 60_000,
    });
    setLoading(false);
    if (!res.ok) {
      const errBody = res.error as { message?: string; error?: string };
      toast.error(errBody?.message || errBody?.error || 'Failed to load Azuro events');
      return;
    }
    const ev = res.data.events ?? res.data.games ?? [];
    setEvents(ev);
    const sel = new Set(ev.filter((e) => e.isSelected).map((e) => e.gameId));
    setPending(new Set(sel));
    setInitialSelected(new Set(sel));
  }, [adminKey]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const countryOptions = useMemo(() => {
    const dynamic = [
      ...new Set(
        events
          .map((e) => e.country)
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0),
      ),
    ].sort((a, b) => a.localeCompare(b));
    const ordered: string[] = ['all'];
    const seen = new Set<string>(['all']);
    for (const p of PREFERRED_COUNTRY_VALUES) {
      if (!seen.has(p)) {
        seen.add(p);
        ordered.push(p);
      }
    }
    for (const c of dynamic) {
      const key = c.trim();
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    }
    return ordered;
  }, [events]);

  const filtered = useMemo(() => {
    let list = events;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const blob = [e.title, e.leagueName, e.country, e.homeTeam, e.awayTeam]
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    list = list.filter((e) => matchLeagueFilter(e.leagueName, leagueFilter));
    list = list.filter((e) => matchDateFilter(e.startsAt, dateFilter));
    list = list.filter((e) =>
      matchCountryFilter(e.leagueName, e.country, countryFilter),
    );
    if (topMatchOnly) {
      list = list.filter((e) => Number(e.importanceScore ?? 0) > 70);
    }
    return list;
  }, [events, search, leagueFilter, dateFilter, countryFilter, topMatchOnly]);

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

  const selectBase =
    'rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#00FF87] font-mono px-3 py-2';

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: bgPage }}>
      <AdminTopBar title="Event Curation" breadcrumbs={['Markets']} />

      <div className="p-6 space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-syne font-bold mb-1">Event Curation — Select Markets</h1>
          <p className="text-sm text-gray-500 font-mono">
            API: {getApiBaseUrl()} · Window: next 15 days (kickoff) ·{' '}
            <code className="text-gray-400">AZURO_DATA_FEED_URL</code>
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
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-500 focus:outline-none focus:border-[#00FF87] font-mono"
            />
          </div>
        </div>

        <div
          className="flex flex-col lg:flex-row flex-wrap gap-4 rounded-xl border border-white/10 p-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs uppercase text-gray-500 font-mono">League</label>
            <select
              className={selectBase}
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value as LeagueFilter)}
            >
              <option value="all">All leagues</option>
              <option value="ucl">Champions League</option>
              <option value="uel">Europa League</option>
              <option value="uecl">Conference League</option>
              <option value="epl">Premier League</option>
              <option value="seriea">Serie A</option>
              <option value="laliga">La Liga</option>
              <option value="bundesliga">Bundesliga</option>
              <option value="ligue1">Ligue 1</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs uppercase text-gray-500 font-mono">Kickoff</label>
            <select
              className={selectBase}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            >
              <option value="all">All (≤15 days)</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="in3">Next 3 days</option>
              <option value="in7">Next 7 days</option>
              <option value="in15">Next 15 days</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs uppercase text-gray-500 font-mono">Country</label>
            <select
              className={selectBase}
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              {countryOptions.map((v) => (
                <option key={v} value={v}>
                  {labelCountryOption(v)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-mono text-gray-300">
              <input
                type="checkbox"
                checked={topMatchOnly}
                onChange={(e) => setTopMatchOnly(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#00FF87]"
              />
              Top matches only (score &gt; 70)
            </label>
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
                    <th className="px-3 py-3 w-10" aria-label="Select" />
                    <th className="px-2 py-3 min-w-[72px]" title="Badges">
                      Badges
                    </th>
                    <th className="px-2 py-3 w-12 text-center" title="Auto-publish">
                      Auto
                    </th>
                    <th className="px-4 py-3">Match</th>
                    <th className="px-4 py-3">Competition</th>
                    <th className="px-3 py-3 font-mono text-right">Score</th>
                    <th className="px-3 py-3 font-mono">Days</th>
                    <th className="px-4 py-3 font-mono">Kickoff</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filtered.map((e) => {
                    const checked = pending.has(e.gameId);
                    const disableCheckbox = !checked && atCap;
                    const score = Number(e.importanceScore ?? 0);
                    const daysN = daysUntilKickoffNumber(e.startsAt);
                    const rowHighlight = pending.has(e.gameId);
                    return (
                      <tr
                        key={e.gameId}
                        className={
                          rowHighlight
                            ? 'bg-[#00FF87]/[0.08] border-l-[3px]'
                            : 'hover:bg-white/[0.03]'
                        }
                        style={rowHighlight ? { borderLeftColor: accent } : undefined}
                      >
                        <td className="px-3 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disableCheckbox}
                            title={disableCheckbox ? 'Max 12 markets reached' : undefined}
                            onChange={() => toggle(e.gameId)}
                            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[#00FF87] disabled:opacity-40"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-wrap gap-1 justify-start items-center text-base">
                            {e.autoPublish ? (
                              <span className="text-red-400" title="Auto-publish (top event)">
                                🔥
                              </span>
                            ) : null}
                            {score > 80 ? (
                              <span className="text-yellow-400" title="High importance (score &gt; 80)">
                                ⭐
                              </span>
                            ) : null}
                            {daysN > 7 ? (
                              <span className="text-gray-500" title="Kickoff in more than 7 days">
                                📅
                              </span>
                            ) : null}
                            {!e.autoPublish && score <= 80 && daysN <= 7 ? (
                              <span className="text-gray-600 text-xs">—</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center align-middle">
                          {e.autoPublish ? (
                            <Check
                              className="inline w-5 h-5 mx-auto text-[#00FF87]"
                              aria-label="Auto-publish candidate"
                            />
                          ) : (
                            <span className="text-gray-600"> </span>
                          )}
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
                        <td className="px-3 py-3 font-mono text-right text-gray-200 tabular-nums">
                          {score}
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-400 whitespace-nowrap text-xs">
                          {formatDaysUntilKickoff(e.startsAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap text-xs">
                          {fmtKickoff(e.startsAt)}
                        </td>
                        <td className="px-4 py-3">
                          {pending.has(e.gameId) ? (
                            <span
                              className="inline-flex px-2 py-0.5 rounded text-xs font-mono border"
                              style={{
                                backgroundColor: 'rgba(0,255,135,0.15)',
                                color: accent,
                                borderColor: 'rgba(0,255,135,0.35)',
                              }}
                            >
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
                <div className="text-center py-12 text-gray-400 font-mono text-sm">
                  No events match your filters.
                  <br />
                  Widen league / date filters or clear search.
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
            className="px-6 py-3 rounded-lg font-semibold font-syne text-black hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ backgroundColor: accent }}
          >
            {saving ? 'Saving…' : 'Save Selection'}
          </button>
        </div>
      </div>
    </div>
  );
}
