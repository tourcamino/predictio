import { ChevronRight } from "lucide-react";
import type { TraderDeskRow } from "~/lib/trading/traderPositionDesk";
import type { ConvictionState } from "~/lib/trading/traderPositionPsychology";
import { formatPnL, formatPctChange } from "~/lib/trading/calculations";
import { ProbabilityDepthBar } from "./ProbabilityDepthBar";
import { TraderSellDecisionPanel } from "./TraderSellDecisionPanel";

const CONVICTION_STYLES: Record<ConvictionState, string> = {
  strong_favor: "text-brand-green border-brand-green/40 bg-brand-green/10",
  favor: "text-brand-green/90 border-brand-green/25 bg-brand-green/5",
  neutral: "text-gray-400 border-white/10 bg-white/5",
  against: "text-amber-200 border-amber-500/30 bg-amber-500/10",
  strong_against: "text-red-300 border-red-500/35 bg-red-500/10",
};

function PhaseBadge({ row }: { row: TraderDeskRow }) {
  const { matchPhase, matchPhaseLabel } = row;
  const psych = row.psychology;
  const styles: Record<string, string> = {
    live: "border-brand-green/50 bg-brand-green/15 text-brand-green",
    closed: "border-white/25 bg-white/10 text-gray-200",
    awaiting_oracle: "border-amber-500/45 bg-amber-500/12 text-amber-100",
    scheduled: "border-white/15 bg-white/5 text-gray-400",
    settled: "border-brand-green/30 bg-brand-green/10 text-brand-green",
    cancelled: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    refunded: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  };
  const key = matchPhase === "awaiting_oracle" ? "awaiting_oracle" : matchPhase;
  const pulse = matchPhase === "live" || psych.timingUrgent;
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${styles[key] ?? styles.scheduled} ${pulse ? "animate-pulse" : ""}`}
    >
      {matchPhase === "closed" ? "FT" : matchPhaseLabel}
    </span>
  );
}

function SideBadge({ side }: { side: "YES" | "NO" | "DRAW" }) {
  const cls =
    side === "YES"
      ? "text-brand-green border-brand-green/35"
      : side === "NO"
        ? "text-red-400 border-red-500/35"
        : "text-brand-cyan border-brand-cyan/35";
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${cls}`}>
      {side}
    </span>
  );
}

export function TraderPositionCard({
  row,
  isSelected,
  onSelect,
  onSell,
}: {
  row: TraderDeskRow;
  isSelected: boolean;
  onSelect: () => void;
  onSell?: () => void;
}) {
  const { position, psychology: psych } = row;
  const pnlFmt = formatPnL(row.displayPnl);
  const pctFmt = formatPctChange(row.displayPnlPct);

  return (
    <article
      className={`relative overflow-hidden rounded-xl border transition-all ${
        isSelected
          ? "border-brand-green/45 bg-gradient-to-br from-brand-green/[0.12] to-black/40 shadow-[0_0_32px_rgba(0,255,135,0.1)] ring-1 ring-brand-green/20"
          : psych.timingUrgent
            ? "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] to-black/30 hover:border-amber-500/40"
            : "border-white/10 bg-gradient-to-br from-white/[0.05] to-black/40 hover:border-white/20"
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full p-3 pb-2 text-left sm:p-4">
        <div className="mb-2 flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <PhaseBadge row={row} />
              <SideBadge side={position.side} />
              <span className="font-mono text-[9px] text-gray-500">{psych.timingLabel}</span>
              {psych.quoteAgeLabel ? (
                <span className="font-mono text-[9px] text-gray-600">{psych.quoteAgeLabel}</span>
              ) : null}
            </div>
            <h3 className="truncate font-syne text-sm font-bold leading-tight text-white sm:text-base">
              {position.marketName}
            </h3>
            <p className="truncate text-[11px] text-gray-500">{position.outcome}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-mono text-xl font-bold leading-none sm:text-2xl ${pnlFmt.colorClass}`}>
              {pnlFmt.text}
            </p>
            <p className={`font-mono text-xs ${pctFmt.colorClass}`}>{pctFmt.text}</p>
            <p className="mt-0.5 font-mono text-[9px] text-gray-600">{psych.positionAgeLabel}</p>
          </div>
        </div>

        <p
          className={`mb-2 rounded border px-2 py-1 text-[10px] font-medium leading-snug ${CONVICTION_STYLES[psych.convictionState]}`}
        >
          {psych.convictionLabel}
          <span className="ml-1 font-mono font-normal opacity-80">· {psych.marketDriftLabel}</span>
        </p>

        <ProbabilityDepthBar
          entry={position.entryPrice}
          current={row.currentProbPct / 100}
          side={position.side}
          className="mb-2"
        />

        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          <Num label="Entry" v={`${row.entryProbPct}¢`} />
          <Num label="Now" v={`${row.currentProbPct}¢`} delta={row.probDeltaPct} />
          <Num label="Invested" v={`$${row.invested.toFixed(0)}`} />
          <Num label="Value" v={`$${row.displayValue.toFixed(0)}`} />
          <Num label="Max win" v={`$${row.maxPayout.toFixed(0)}`} accent="green" />
          <Num
            label="vs entry"
            v={`${row.probDeltaPct > 0 ? "+" : ""}${row.probDeltaPct}¢`}
            accent={psych.favorableForSide === true ? "green" : psych.favorableForSide === false ? "red" : undefined}
          />
        </div>

        <div className="mt-2 hidden sm:block">
          <TraderSellDecisionPanel psychology={psych} compact />
        </div>
      </button>

      <div className="border-t border-white/10 px-3 pb-3 pt-2 sm:hidden">
        <TraderSellDecisionPanel psychology={psych} compact />
      </div>

      <div className="flex gap-2 border-t border-white/10 px-3 py-2 sm:px-4">
        {row.canSell && onSell ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSell();
            }}
            className="flex-1 rounded-lg border border-brand-green/45 bg-brand-green/15 py-2 text-xs font-bold text-brand-green hover:bg-brand-green/25 sm:text-sm"
          >
            Sell · {pnlFmt.text}
          </button>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-black/30 py-2 text-[10px] text-gray-500">
            {psych.riskState === "settling" ? "Settlement in progress" : "Trading closed"}
          </div>
        )}
        <button
          type="button"
          onClick={onSelect}
          className="flex items-center gap-0.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white sm:text-sm"
        >
          Details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function Num({
  label,
  v,
  delta,
  accent,
}: {
  label: string;
  v: string;
  delta?: number;
  accent?: "green" | "red";
}) {
  const c =
    accent === "green" ? "text-brand-green" : accent === "red" ? "text-red-400" : "text-white";
  return (
    <div className="rounded border border-white/10 bg-black/35 px-1.5 py-1">
      <p className="text-[8px] uppercase tracking-wider text-gray-600">{label}</p>
      <p className={`font-mono text-[11px] font-semibold leading-tight ${c}`}>{v}</p>
      {delta != null && delta !== 0 ? (
        <p className="font-mono text-[8px] text-gray-500">
          {delta > 0 ? "+" : ""}
          {delta}¢
        </p>
      ) : null}
    </div>
  );
}
