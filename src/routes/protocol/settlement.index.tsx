import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, Database } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import { formatApiDateTime } from "~/utils/parseApiDate";

export const Route = createFileRoute("/protocol/settlement/")({
  component: ProtocolSettlementForensicsPage,
});

function ProtocolSettlementForensicsPage() {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.getSettlementForensicsDashboard.queryOptions({ marketLimit: 40 }),
    staleTime: PROTOCOL_CACHE.settlementDiagnosticStaleMs,
    refetchInterval: PROTOCOL_CACHE.settlementDiagnosticRefetchMs,
  });

  const d = query.data;

  return (
    <div className="min-h-screen bg-[#050508] text-gray-300">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link
          to="/trading"
          className="mb-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Trading terminal
        </Link>

        <header className="mb-8 border-b border-white/10 pb-6">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-brand-cyan">
            Internal ops
          </p>
          <h1 className="font-syne text-3xl font-bold text-white">
            Settlement forensics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Live protocol diagnostics — real open orders, Azuro oracle poll, cron heartbeat.
            No synthetic payouts or manual resolve controls.
          </p>
        </header>

        {query.isLoading && (
          <p className="font-mono text-sm text-gray-500">Polling protocol state…</p>
        )}

        {d && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Open orders" value={String(d.queue.openOrders)} />
              <Stat label="Open markets" value={String(d.queue.openMarkets)} />
              <Stat
                label="Unresolved (sample)"
                value={String(d.queue.unresolvedEstimate)}
              />
              <Stat label="Payouts 24h" value={String(d.throughput.payoutsLast24h)} />
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 flex items-center gap-2 font-syne text-lg font-bold text-white">
                <Activity className="h-5 w-5 text-brand-cyan" />
                Cron &amp; indexer
              </h2>
              <dl className="grid gap-2 font-mono text-xs sm:grid-cols-2">
                <Row k="Checked at" v={formatApiDateTime(new Date(d.checkedAt))} />
                <Row k="Cron cadence" v={d.cronCadence} />
                <Row
                  k="Last settlement tick"
                  v={
                    d.lastSettlementTickAt
                      ? formatApiDateTime(new Date(d.lastSettlementTickAt))
                      : "—"
                  }
                />
                <Row
                  k="Last payout"
                  v={
                    d.lastPayoutAt
                      ? formatApiDateTime(new Date(d.lastPayoutAt))
                      : "—"
                  }
                />
                <Row k="Azuro endpoint" v={d.azuroGraphqlEndpoint} className="sm:col-span-2" />
              </dl>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 flex items-center gap-2 font-syne text-lg font-bold text-white">
                <Database className="h-5 w-5 text-brand-cyan" />
                Oracle reason counts (sample)
              </h2>
              <div className="flex flex-wrap gap-2 font-mono text-xs">
                {Object.entries(d.reasonCounts).map(([code, n]) => (
                  <span
                    key={code}
                    className="rounded border border-white/10 bg-black/30 px-2 py-1"
                  >
                    {code}: <span className="text-white">{n}</span>
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 font-syne text-lg font-bold text-white">
                Football oracle purity
              </h2>
              <p className="text-sm text-gray-400">{d.footballAudit.note}</p>
              <p className="mt-2 font-mono text-xs text-gray-500">
                Football: {d.footballAudit.polledFootball} · Non-football:{" "}
                {d.footballAudit.polledNonFootball} · Index-0 would mismatch:{" "}
                {d.footballAudit.index0WouldMismatch}
              </p>
            </section>

            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h2 className="mb-4 font-syne text-lg font-bold text-white">
                Failing markets (top 25)
              </h2>
              {d.failingMarkets.length === 0 ? (
                <p className="text-sm text-gray-500">No blocked markets in sample.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="pb-2 pr-4">Market</th>
                        <th className="pb-2 pr-4">Reason</th>
                        <th className="pb-2 pr-4">Oracle</th>
                        <th className="pb-2 pr-4">Cond</th>
                        <th className="pb-2">Conf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.failingMarkets.map((m) => (
                        <tr key={m.marketId} className="border-t border-white/5">
                          <td className="py-2 pr-4 text-gray-300">{m.marketId}</td>
                          <td className="py-2 pr-4 text-amber-200">{m.reasonCode}</td>
                          <td className="py-2 pr-4">{m.azuroGameState ?? "—"}</td>
                          <td className="py-2 pr-4">
                            {m.conditionIndex != null
                              ? `${m.conditionIndex}/${m.conditionCount}`
                              : "—"}
                          </td>
                          <td className="py-2">{m.confidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function Row({
  k,
  v,
  className,
}: {
  k: string;
  v: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-gray-600">{k}</dt>
      <dd className="mt-0.5 break-all text-gray-300">{v}</dd>
    </div>
  );
}
