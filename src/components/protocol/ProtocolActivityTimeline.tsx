import { Activity, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import { formatApiDateTime } from "~/utils/parseApiDate";
import type { ProtocolTimelineEventKind } from "~/server/trpc/procedures/getMarketProtocolTimeline";

const kindStyles: Record<
  ProtocolTimelineEventKind,
  { dot: string; label: string }
> = {
  market_created: { dot: "bg-blue-400", label: "text-blue-300" },
  position_opened: { dot: "bg-brand-green", label: "text-brand-green" },
  position_closed: { dot: "bg-gray-400", label: "text-gray-300" },
  settlement: { dot: "bg-brand-cyan", label: "text-brand-cyan" },
  refund: { dot: "bg-amber-400", label: "text-amber-200" },
  liquidity: { dot: "bg-purple-400", label: "text-purple-300" },
};

export function ProtocolActivityTimeline({
  marketId,
  compact,
}: {
  marketId: string;
  compact?: boolean;
}) {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.getMarketProtocolTimeline.queryOptions({ marketId, limit: 20 }),
    staleTime: PROTOCOL_CACHE.protocolTimelineStaleMs,
    enabled: Boolean(marketId),
  });

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-brand-green" />
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
          Protocol activity
        </p>
        {query.isFetching && (
          <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-gray-500" />
        )}
      </div>

      {query.isLoading && (
        <p className="py-6 text-center text-sm text-gray-500">Syncing ledger…</p>
      )}

      {query.isError && (
        <p className="py-6 text-center text-sm text-red-400/90">
          Could not load protocol activity.
        </p>
      )}

      {!query.isLoading && !query.isError && (query.data?.events.length ?? 0) === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">
          Awaiting protocol activity — opens, settlements, and ledger entries appear here from Postgres.
        </p>
      )}

      <ul className="space-y-3">
        {query.data?.events.map((ev) => {
          const style = kindStyles[ev.kind] ?? kindStyles.settlement;
          return (
            <li
              key={ev.id}
              className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`text-sm font-medium ${style.label}`}>{ev.label}</span>
                  <span className="font-mono text-[10px] text-gray-600">
                    {formatApiDateTime(new Date(ev.at))}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{ev.detail}</p>
                {ev.walletHint && (
                  <p className="mt-1 font-mono text-[10px] text-gray-600">{ev.walletHint}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
