import { TrendingDown, TrendingUp } from "lucide-react";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import { derivePositionLifecycle } from "~/lib/position/derivePositionLifecycle";
import type { Market } from "~/data/mockMarkets";
import { deriveProbabilityDrift } from "~/lib/protocol/positionLifecycleNarrative";
import { ProbabilityDepthBar } from "~/components/trading/ProbabilityDepthBar";
import { formatPnL } from "~/lib/trading/calculations";

export function PositionMotionPanel({
  order,
  market,
}: {
  order: UserOrderRow;
  market: Market | null | undefined;
}) {
  const lifecycle = derivePositionLifecycle(order, market);
  const side = order.outcome.toUpperCase() as "YES" | "NO" | "DRAW";
  const drift = deriveProbabilityDrift(
    lifecycle.entryProbability,
    lifecycle.currentProbability,
  );
  const pnl = formatPnL(lifecycle.unrealizedPnl);
  const opened = order.createdAt ? new Date(order.createdAt) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.28)]">
      <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
        Position motion
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Unrealized" value={pnl.text} className={pnl.colorClass} />
        <Tile
          label="Mark"
          value={`${(lifecycle.currentProbability * 100).toFixed(1)}¢`}
        />
        <Tile label="Entry" value={`${(lifecycle.entryProbability * 100).toFixed(1)}¢`} />
        <Tile
          label="Opened"
          value={opened ? opened.toLocaleTimeString() : "—"}
        />
      </div>
      <ProbabilityDepthBar
        entry={lifecycle.entryProbability}
        current={lifecycle.currentProbability}
        side={side}
        className="mb-2"
      />
      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        {drift.direction === "up" ? (
          <TrendingUp className="h-3.5 w-3.5 text-brand-green" />
        ) : drift.direction === "down" ? (
          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
        ) : null}
        {drift.label}
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  className = "text-white",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-600">{label}</p>
      <p className={`font-mono text-sm font-bold ${className}`}>{value}</p>
    </div>
  );
}
