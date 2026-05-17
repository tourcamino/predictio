import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import type { TraderDeskRow } from "~/lib/trading/traderPositionDesk";
import { formatPnL, formatPctChange } from "~/lib/trading/calculations";
import { ProbabilityDepthBar } from "./ProbabilityDepthBar";

function PhaseBadge({ row }: { row: TraderDeskRow }) {
  const { matchPhase, matchPhaseLabel } = row;
  const styles: Record<string, string> = {
    live: "border-brand-green/40 bg-brand-green/15 text-brand-green animate-pulse",
    closed: "border-white/20 bg-white/10 text-gray-300",
    awaiting_oracle: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    scheduled: "border-white/15 bg-white/5 text-gray-400",
    settled: "border-brand-green/30 bg-brand-green/10 text-brand-green",
    cancelled: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    refunded: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  };
  const key = matchPhase === "awaiting_oracle" ? "awaiting_oracle" : matchPhase;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[key] ?? styles.scheduled}`}
    >
      {matchPhase === "closed" ? "FT" : matchPhaseLabel}
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
  const { position } = row;
  const pnlFmt = formatPnL(row.displayPnl);
  const pctFmt = formatPctChange(row.displayPnlPct);
  const favorIcon =
    row.favorability === "favor" ? (
      <TrendingUp className="h-3.5 w-3.5 text-brand-green" />
    ) : row.favorability === "against" ? (
      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
    ) : null;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        isSelected
          ? "border-brand-green/50 bg-gradient-to-br from-brand-green/[0.14] to-white/[0.03] shadow-[0_0_40px_rgba(0,255,135,0.12)] ring-1 ring-brand-green/25"
          : "border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] hover:border-brand-green/30"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full p-4 pb-3 text-left sm:p-5"
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PhaseBadge row={row} />
              {row.countdownLabel ? (
                <span className="font-mono text-[10px] text-gray-500">{row.countdownLabel}</span>
              ) : null}
              {row.oracleMinimal ? (
                <span className="font-mono text-[10px] text-amber-300/80">{row.oracleMinimal}</span>
              ) : null}
            </div>
            <h3 className="truncate font-syne text-base font-bold text-white sm:text-lg">
              {position.marketName}
            </h3>
            <p className="mt-0.5 text-sm text-gray-400">{position.outcome}</p>
          </div>
          <div className="text-right shrink-0">
            <p className={`font-mono text-2xl font-bold leading-none sm:text-3xl ${pnlFmt.colorClass}`}>
              {pnlFmt.text}
            </p>
            <p className={`mt-1 font-mono text-sm ${pctFmt.colorClass}`}>{pctFmt.text}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Entry" value={`${row.entryProbPct}¢`} />
          <MiniStat
            label="Now"
            value={`${row.currentProbPct}¢`}
            hint={
              row.probDeltaPct !== 0
                ? `${row.probDeltaPct > 0 ? "+" : ""}${row.probDeltaPct}¢`
                : undefined
            }
            icon={favorIcon}
          />
          <MiniStat label="Invested" value={`$${row.invested.toFixed(0)}`} />
          <MiniStat label="Value" value={`$${row.displayValue.toFixed(0)}`} />
          <MiniStat label="Max payout" value={`$${row.maxPayout.toFixed(0)}`} className="sm:col-span-2" />
          <MiniStat
            label="If correct"
            value={`$${row.maxPayout.toFixed(0)}`}
            className="text-brand-green/90 sm:col-span-2"
          />
        </div>

        <div className="mt-3 hidden sm:block">
          <ProbabilityDepthBar
            entry={position.entryPrice}
            current={row.currentProbPct / 100}
            side={position.side}
          />
        </div>
      </button>

      <div className="flex items-stretch gap-2 border-t border-white/10 p-3 sm:px-5 sm:pb-4">
        {row.canSell && onSell ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSell();
            }}
            className="flex-1 rounded-xl border border-brand-green/40 bg-brand-green/15 py-2.5 text-sm font-bold text-brand-green transition-colors hover:bg-brand-green/25"
          >
            Sell position
          </button>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-black/20 py-2.5 text-xs text-gray-500">
            {row.matchPhase === "awaiting_oracle"
              ? "Settlement queued"
              : "Market closed for trading"}
          </div>
        )}
        <button
          type="button"
          onClick={onSelect}
          className="flex items-center gap-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:border-white/20 hover:text-white"
        >
          Details
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
  hint,
  icon,
  className = "",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 ${className}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-600">{label}</p>
      <p className="flex items-center gap-1 font-mono text-sm font-semibold text-white">
        {icon}
        {value}
      </p>
      {hint ? <p className="font-mono text-[10px] text-gray-500">{hint}</p> : null}
    </div>
  );
}
