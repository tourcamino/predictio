import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import { formatApiDateTime } from "~/utils/parseApiDate";

export function ProtocolFlowFeed({ limit = 5 }: { limit?: number }) {
  const trpc = useTRPC();
  const q = useQuery({
    ...trpc.getProtocolMarketBreadth.queryOptions(),
    staleTime: PROTOCOL_CACHE.protocolTimelineStaleMs,
    refetchInterval: PROTOCOL_CACHE.marketSummariesRefetchIntervalMs,
  });

  const b = q.data;
  if (!b) return null;

  const fills = b.recentFills.slice(0, limit);
  const settlements = b.recentSettlements.slice(0, Math.max(2, Math.floor(limit / 2)));

  if (fills.length === 0 && settlements.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <ArrowRightLeft className="h-3.5 w-3.5 text-brand-cyan" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
          Protocol flow
        </span>
      </div>
      <ul className="space-y-1.5">
        {fills.map((f) => (
          <li
            key={f.orderId}
            className="flex items-center justify-between gap-2 font-mono text-[10px]"
          >
            <span className="truncate text-gray-400">
              Fill · {f.marketLabel} · {f.outcome}
            </span>
            <span className="shrink-0 text-brand-green">${f.amount.toFixed(0)}</span>
          </li>
        ))}
        {settlements.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 font-mono text-[10px]"
          >
            <span className="truncate text-gray-500">
              {s.type.includes("win") ? "Payout" : "Settlement"} ·{" "}
              {s.marketId ? `${s.marketId.slice(0, 8)}…` : "market"}
            </span>
            <span className="shrink-0 text-gray-400">
              {formatApiDateTime(new Date(s.at))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
