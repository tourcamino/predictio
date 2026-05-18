import type { TraderDeskPsychology } from "~/lib/trading/traderPositionPsychology";
import { formatPnL, formatPctChange } from "~/lib/trading/calculations";

export function TraderSellDecisionPanel({
  psychology,
  compact,
}: {
  psychology: TraderDeskPsychology;
  compact?: boolean;
}) {
  const pnl = formatPnL(psychology.pnlIfSoldNow);
  const pct = formatPctChange(psychology.pnlPctIfSoldNow);

  const riskColors: Record<TraderDeskPsychology["riskState"], string> = {
    tradeable: "border-brand-green/25 bg-brand-green/[0.06]",
    ending: "border-amber-500/30 bg-amber-500/[0.06]",
    locked: "border-white/15 bg-white/[0.03]",
    settling: "border-amber-500/25 bg-amber-500/[0.05]",
    terminal: "border-white/10 bg-black/20",
  };

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${riskColors[psychology.riskState]} ${compact ? "" : "sm:px-4 sm:py-3"}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
          Sell or hold?
        </p>
        <p className="font-mono text-[10px] text-gray-500">{psychology.oracleStateLabel}</p>
      </div>
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        <DecisionCell label="Exit now" value={`$${psychology.exitValue.toFixed(2)}`} />
        <DecisionCell
          label="If you sell"
          value={pnl.text}
          sub={pct.text}
          accent={psychology.pnlIfSoldNow >= 0 ? "green" : "red"}
        />
        <DecisionCell
          label="If held & correct"
          value={`$${psychology.payoutIfHeldCorrect.toFixed(0)}`}
          accent="green"
        />
        <DecisionCell label="Market drift" value={psychology.marketDriftLabel} small />
      </div>
    </div>
  );
}

function DecisionCell({
  label,
  value,
  sub,
  accent,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red";
  small?: boolean;
}) {
  const valueClass =
    accent === "green"
      ? "text-brand-green"
      : accent === "red"
        ? "text-red-400"
        : "text-white";
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-gray-600">{label}</p>
      <p
        className={`truncate font-mono font-semibold ${small ? "text-[10px] text-gray-400" : "text-sm"} ${valueClass}`}
      >
        {value}
      </p>
      {sub ? <p className={`font-mono text-[10px] ${valueClass}`}>{sub}</p> : null}
    </div>
  );
}
