import { AlertTriangle, ArrowRight } from "lucide-react";
import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import { derivePositionLifecycle } from "~/lib/position/derivePositionLifecycle";
import {
  deriveOracleNarrative,
  derivePipelineSteps,
  deriveProtocolNextAction,
  deriveProbabilityDrift,
} from "~/lib/protocol/positionLifecycleNarrative";
import { MarketClockPanel } from "./MarketClockPanel";
import { PositionLifecyclePipeline } from "./PositionLifecyclePipeline";
import { ProbabilityDepthBar } from "~/components/trading/ProbabilityDepthBar";

export function ProtocolLifecycleInsight({
  order,
  market,
  compact,
}: {
  order: UserOrderRow;
  market: Market | null | undefined;
  compact?: boolean;
}) {
  const lifecycle = derivePositionLifecycle(order, market);
  const steps = derivePipelineSteps(order, market, lifecycle);
  const oracle = deriveOracleNarrative(order, market, lifecycle);
  const next = deriveProtocolNextAction(order, market, lifecycle);
  const side = order.outcome.toUpperCase() as "YES" | "NO" | "DRAW";
  const drift = deriveProbabilityDrift(lifecycle.entryProbability, lifecycle.currentProbability);

  const nextTone =
    next.tone === "success"
      ? "border-brand-green/30 bg-brand-green/10 text-brand-green"
      : next.tone === "wait"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : next.tone === "warning"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-white/10 bg-white/[0.03] text-gray-300";

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <MarketClockPanel market={market} lifecycle={lifecycle} />

      {!compact && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
          <p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-gray-500">
            Probability drift (real quotes)
          </p>
          <ProbabilityDepthBar
            entry={lifecycle.entryProbability}
            current={lifecycle.currentProbability}
            side={side}
            className="mb-2"
          />
          <p className="text-xs text-gray-500">{drift.label}</p>
        </div>
      )}

      <PositionLifecyclePipeline steps={steps} />

      {oracle && (
        <div
          className="relative flex gap-3 overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-4"
          role="status"
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400/80 to-amber-600/20" />
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-100">{oracle.headline}</p>
            <p className="mt-1 text-xs text-amber-200/85">{oracle.body}</p>
            <p className="mt-2 text-[10px] font-mono text-gray-500">{oracle.settlementCadence}</p>
          </div>
        </div>
      )}

      <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${nextTone}`}>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
        <span>{next.label}</span>
      </div>
    </div>
  );
}
