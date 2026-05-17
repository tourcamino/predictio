import { formatPnL, formatPctChange } from "~/lib/trading/calculations";

export function TradingDeskHeader({
  totalOpenPnl,
  totalOpenPnlPct,
  openCount,
  liveCount,
  settlingCount,
  balanceLabel,
  balanceValue,
}: {
  totalOpenPnl: number;
  totalOpenPnlPct: number;
  openCount: number;
  liveCount: number;
  settlingCount: number;
  balanceLabel?: string;
  balanceValue: string;
}) {
  const pnl = formatPnL(totalOpenPnl);
  const pct = formatPctChange(totalOpenPnlPct);

  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-syne text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Trading
          </h1>
          <p className="mt-1 text-sm text-gray-500">Your open positions · mark-to-market</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Open P&L"
          value={pnl.text}
          sub={pct.text}
          accent={totalOpenPnl >= 0 ? "green" : "red"}
          large
        />
        <StatTile label="Positions" value={String(openCount)} />
        <StatTile
          label="Live matches"
          value={String(liveCount)}
          accent={liveCount > 0 ? "cyan" : undefined}
        />
        <StatTile
          label="Settling"
          value={String(settlingCount)}
          accent={settlingCount > 0 ? "amber" : undefined}
        />
        <StatTile
          label={balanceLabel ?? "Balance"}
          value={balanceValue}
          accent="green"
          className="col-span-2 sm:col-span-1"
        />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
  large,
  className = "",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "amber" | "cyan";
  large?: boolean;
  className?: string;
}) {
  const border =
    accent === "green"
      ? "border-brand-green/30"
      : accent === "red"
        ? "border-red-500/30"
        : accent === "amber"
          ? "border-amber-500/30"
          : accent === "cyan"
            ? "border-brand-cyan/30"
            : "border-white/10";
  const valueColor =
    accent === "green"
      ? "text-brand-green"
      : accent === "red"
        ? "text-red-400"
        : accent === "amber"
          ? "text-amber-200"
          : accent === "cyan"
            ? "text-brand-cyan"
            : "text-white";

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${border} ${className}`}
    >
      <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</p>
      <p
        className={`font-mono font-bold ${large ? "text-2xl sm:text-3xl" : "text-xl"} ${valueColor}`}
      >
        {value}
      </p>
      {sub ? (
        <p className={`font-mono text-xs ${valueColor} opacity-80`}>{sub}</p>
      ) : null}
    </div>
  );
}
