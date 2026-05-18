import { useQuery } from "@tanstack/react-query";
import { Droplets } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";

/** Real pool utilization + open interest — no simulated volume (PR12). */
export function LiquidityClarityStrip() {
  const trpc = useTRPC();
  const q = useQuery({
    ...trpc.getProtocolMarketBreadth.queryOptions(),
    staleTime: PROTOCOL_CACHE.protocolTimelineStaleMs,
    refetchInterval: 60_000,
  });

  const liq = q.data?.liquidity;
  if (!liq) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-black/40 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Droplets className="h-4 w-4 text-brand-cyan" />
        <span className="font-syne text-sm font-bold text-white">Liquidity & exposure</span>
      </div>
      <div className="grid grid-cols-2 gap-3 font-mono text-[11px] sm:grid-cols-4">
        <div>
          <p className="text-[9px] uppercase text-gray-600">Protocol pool</p>
          <p className="font-semibold text-white">${Math.round(liq.totalLiquidity)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-gray-600">Open interest</p>
          <p className="font-semibold text-brand-green">${Math.round(liq.openInterest)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-gray-600">Utilization</p>
          <p className="font-semibold text-brand-cyan">{liq.utilizationPct}%</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-gray-600">Active slots</p>
          <p className="font-semibold text-white">{liq.marketsActive}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-green transition-all duration-700"
          style={{ width: `${Math.min(100, liq.utilizationPct)}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] leading-snug text-gray-500">
        Open interest is capital in open positions. Utilization is open interest vs canonical
        protocol liquidity — real paper pool, not synthetic volume.
      </p>
    </div>
  );
}
