import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";

/** Global settlement queue snapshot — real DB + oracle sample (PR6). */
export function ProtocolSettlementHealthBar() {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.getSettlementProtocolHealth.queryOptions({ sampleLimit: 15 }),
    staleTime: PROTOCOL_CACHE.settlementDiagnosticStaleMs,
    refetchInterval: PROTOCOL_CACHE.settlementDiagnosticRefetchMs,
  });

  const h = query.data;
  if (!h && query.isLoading) {
    return (
      <p className="text-xs text-gray-500 font-mono">Loading settlement queue…</p>
    );
  }
  if (!h) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-gray-400">
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-brand-cyan" />
        <span className="font-mono uppercase tracking-wider text-gray-500">
          Protocol settlement queue
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono">
        <span>
          <span className="text-white">{h.openOrders}</span> open orders
        </span>
        <span>
          <span className="text-white">{h.openMarkets}</span> markets
        </span>
        <span>
          Eligible:{" "}
          <span className="text-brand-green">{h.summary.settlementEligible}</span>
        </span>
        <span>
          Prematch:{" "}
          <span className="text-amber-300">{h.summary.oraclePrematch}</span>
        </span>
        <span>
          Missing subgraph:{" "}
          <span className="text-red-300">{h.summary.subgraphMissing}</span>
        </span>
        <span className="text-gray-600">· {h.cronCadence}</span>
      </div>
    </div>
  );
}
