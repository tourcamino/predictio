import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";
import type { Market } from "~/data/mockMarkets";
import { derivePositionLifecycle } from "~/lib/position/derivePositionLifecycle";

type Position =
  inferRouterOutputs<AppRouter>["getUserPositions"]["positions"][number];

export function PortfolioExposureSummary({
  openPositions,
  resolvedPositions,
  marketById,
  realizedPnL,
  unrealizedPnL,
  unrealizedPnLPct,
}: {
  openPositions: Position[];
  resolvedPositions: Position[];
  marketById: Record<string, Market | null | undefined>;
  realizedPnL: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
}) {
  const exposureBySport = new Map<string, number>();
  const exposureByOutcome = new Map<string, number>();
  let openRisk = 0;

  for (const p of openPositions) {
    const m = marketById[p.marketId];
    const life = derivePositionLifecycle(p, m ?? null);
    const stake = p.amount ?? 0;
    openRisk += stake;
    const sport = m?.sport ?? "unknown";
    exposureBySport.set(sport, (exposureBySport.get(sport) ?? 0) + stake);
    const oc = p.outcome.toUpperCase();
    exposureByOutcome.set(oc, (exposureByOutcome.get(oc) ?? 0) + stake);
    void life;
  }

  const resolvedGains = resolvedPositions.reduce((s, p) => s + (p.pnl ?? 0), 0);

  return (
    <div className="mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">Unrealized P&L</p>
        <p
          className={`font-mono font-bold ${unrealizedPnL >= 0 ? "text-brand-green" : "text-red-400"}`}
        >
          {unrealizedPnL >= 0 ? "+" : ""}${unrealizedPnL.toFixed(2)}
        </p>
        <p className="text-[10px] text-gray-500">{unrealizedPnLPct.toFixed(1)}%</p>
      </div>
      <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">Realized P&L</p>
        <p
          className={`font-mono font-bold ${realizedPnL >= 0 ? "text-brand-green" : "text-red-400"}`}
        >
          {realizedPnL >= 0 ? "+" : ""}${realizedPnL.toFixed(2)}
        </p>
      </div>
      <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">Open risk (stake)</p>
        <p className="font-mono font-bold">${openRisk.toFixed(2)}</p>
      </div>
      <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-xs text-gray-500 mb-1">Resolved gains</p>
        <p
          className={`font-mono font-bold ${resolvedGains >= 0 ? "text-brand-green" : "text-red-400"}`}
        >
          {resolvedGains >= 0 ? "+" : ""}${resolvedGains.toFixed(2)}
        </p>
      </div>
      <div className="p-3 bg-white/5 border border-white/10 rounded-lg col-span-2 md:col-span-1">
        <p className="text-xs text-gray-500 mb-1">By sport</p>
        <p className="text-xs text-gray-300 font-mono truncate">
          {[...exposureBySport.entries()]
            .map(([k, v]) => `${k}: $${v.toFixed(0)}`)
            .join(" · ") || "—"}
        </p>
      </div>
      <div className="p-3 bg-white/5 border border-white/10 rounded-lg col-span-2 md:col-span-1">
        <p className="text-xs text-gray-500 mb-1">By outcome</p>
        <p className="text-xs text-gray-300 font-mono truncate">
          {[...exposureByOutcome.entries()]
            .map(([k, v]) => `${k}: $${v.toFixed(0)}`)
            .join(" · ") || "—"}
        </p>
      </div>
    </div>
  );
}
