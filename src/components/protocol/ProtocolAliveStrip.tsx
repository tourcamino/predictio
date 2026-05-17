import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import { formatApiDateTime } from "~/utils/parseApiDate";

/** Global protocol pulse — real fills, queue, settlements (PR9). */
export function ProtocolAliveStrip() {
  const trpc = useTRPC();
  const q = useQuery({
    ...trpc.getProtocolPulseSnapshot.queryOptions(),
    staleTime: PROTOCOL_CACHE.protocolTimelineStaleMs,
    refetchInterval: PROTOCOL_CACHE.marketSummariesRefetchIntervalMs,
  });

  const p = q.data;
  if (!p && q.isLoading) {
    return (
      <p className="font-mono text-[10px] text-gray-600">Loading protocol pulse…</p>
    );
  }
  if (!p) return null;

  return (
    <div className="rounded-xl border border-brand-cyan/20 bg-gradient-to-r from-brand-cyan/5 to-transparent px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Radio className="h-3.5 w-3.5 animate-pulse text-brand-cyan" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
          Protocol live
        </span>
        <span className="ml-auto font-mono text-[10px] text-gray-600">
          {formatApiDateTime(new Date(p.checkedAt))}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
        <span>
          <span className="text-white">{p.queue.openOrders}</span> open orders
        </span>
        <span>
          <span className="text-white">{p.queue.openMarkets}</span> markets in queue
        </span>
        <span>
          Fills 24h: <span className="text-brand-green">{p.activity24h.recentFills}</span>
        </span>
        <span>
          Payouts 24h: <span className="text-white">{p.activity24h.payouts}</span>
        </span>
        <span>
          Wallets 24h: <span className="text-white">{p.activity24h.activeWallets}</span>
        </span>
        {p.lastSettlementTickAt ? (
          <span className="text-gray-600">
            · tick {formatApiDateTime(new Date(p.lastSettlementTickAt))}
          </span>
        ) : null}
      </div>
      {p.recentFills[0] ? (
        <p className="mt-2 truncate font-mono text-[10px] text-gray-600">
          Latest fill: {p.recentFills[0].marketId} · {p.recentFills[0].outcome} ·{" "}
          {p.recentFills[0].status}
        </p>
      ) : null}
    </div>
  );
}
