import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import type { Market } from "~/data/mockMarkets";
import { deriveMarketPulse } from "~/lib/protocol/deriveMarketPulse";
import type { SettlementDiagnosticEntry } from "~/lib/settlement/settlementDiagnostics";

export function MarketPulseStrip({
  market,
  marketId,
  diagnostic,
  oracleCheckedAt,
}: {
  market: Market;
  marketId: string;
  diagnostic?: SettlementDiagnosticEntry | null;
  oracleCheckedAt?: string | null;
}) {
  const trpc = useTRPC();
  const timeline = useQuery({
    ...trpc.getMarketProtocolTimeline.queryOptions({ marketId, limit: 12 }),
    staleTime: PROTOCOL_CACHE.protocolTimelineStaleMs,
    enabled: Boolean(marketId),
  });

  const metrics = deriveMarketPulse(market, {
    diagnostic,
    oracleCheckedAt,
    recentEvents: timeline.data?.events,
  });

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-brand-cyan/5 to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-brand-cyan" />
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
          Market pulse
        </p>
        <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green shadow-[0_0_8px_rgba(0,255,135,0.6)]" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-white/10 bg-black/25 px-2 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-600">{m.label}</p>
            <p className="font-mono text-xs font-bold text-white">{m.value}</p>
            {m.hint ? <p className="mt-0.5 text-[9px] text-gray-600">{m.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
