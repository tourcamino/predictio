import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/trpc/root";
import type { Market } from "~/data/mockMarkets";
import { derivePositionLifecycle } from "~/lib/position/derivePositionLifecycle";

type Position =
  inferRouterOutputs<AppRouter>["getUserPositions"]["positions"][number];

function ExposureTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "neutral";
}) {
  const valueClass =
    accent === "green"
      ? "text-brand-green"
      : accent === "red"
        ? "text-red-400"
        : "text-white";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all hover:border-brand-green/25">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:via-brand-green/30"
        aria-hidden
      />
      <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.15em] text-gray-500">
        {label}
      </p>
      <p className={`font-mono text-xl font-bold ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-1 text-[10px] text-gray-500">{sub}</p> : null}
    </div>
  );
}

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
    <div className="mb-8">
      <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
        Exposure desk
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <ExposureTile
          label="Unrealized P&L"
          value={`${unrealizedPnL >= 0 ? "+" : ""}$${unrealizedPnL.toFixed(2)}`}
          sub={`${unrealizedPnLPct.toFixed(1)}%`}
          accent={unrealizedPnL >= 0 ? "green" : "red"}
        />
        <ExposureTile
          label="Realized P&L"
          value={`${realizedPnL >= 0 ? "+" : ""}$${realizedPnL.toFixed(2)}`}
          accent={realizedPnL >= 0 ? "green" : "red"}
        />
        <ExposureTile label="Open risk" value={`$${openRisk.toFixed(2)}`} sub="stake at risk" />
        <ExposureTile
          label="Resolved gains"
          value={`${resolvedGains >= 0 ? "+" : ""}$${resolvedGains.toFixed(2)}`}
          accent={resolvedGains >= 0 ? "green" : "red"}
        />
        <ExposureTile
          label="By sport"
          value={
            [...exposureBySport.entries()]
              .map(([k, v]) => `${k} $${v.toFixed(0)}`)
              .join(" · ") || "—"
          }
          accent="neutral"
        />
        <ExposureTile
          label="By outcome"
          value={
            [...exposureByOutcome.entries()]
              .map(([k, v]) => `${k} $${v.toFixed(0)}`)
              .join(" · ") || "—"
          }
          accent="neutral"
        />
      </div>
    </div>
  );
}
