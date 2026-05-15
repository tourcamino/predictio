import { useMemo } from "react";
import { Activity, Radio } from "lucide-react";
import type { CanonicalMarketLiquidityRow } from "~/server/services/canonicalLiquidityAllocation";
import { liquidityTerminal } from "~/copy/liquidityPremium";

function sportEmoji(sport: string): string {
  const k = sport.toLowerCase();
  if (k.includes("football") || k === "football") return "⚽";
  if (k.includes("basketball")) return "🏀";
  if (k.includes("tennis")) return "🎾";
  if (k.includes("mma") || k.includes("ufc")) return "🥊";
  if (k.includes("f1") || k.includes("motor")) return "🏎️";
  return "🏆";
}

function heatForPct(pct: number): { label: string; className: string } {
  if (pct >= 18) return { label: liquidityTerminal.heatHot, className: "text-orange-300" };
  if (pct >= 12) return { label: liquidityTerminal.heatWarm, className: "text-amber-200/90" };
  return { label: liquidityTerminal.heatCool, className: "text-white/55" };
}

function rowListKey(row: CanonicalMarketLiquidityRow): string {
  return row.marketId || row.gameId;
}

export function LiquidityLiveBook(props: {
  rows: CanonicalMarketLiquidityRow[];
  isPreTestnet: boolean;
  dataSource: "vault" | "live-feed";
  updatedAtMs: number;
}) {
  const maxPct = useMemo(
    () => props.rows.reduce((m, r) => Math.max(m, r.percentage), 0) || 1,
    [props.rows],
  );

  if (props.rows.length === 0) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-6 py-14 text-center">
        <Activity className="mx-auto mb-3 h-10 w-10 text-amber-400/80" aria-hidden />
        <p className="font-syne text-lg text-white/85">{liquidityTerminal.emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/45">{liquidityTerminal.emptySub}</p>
      </div>
    );
  }

  const syncTime = new Date(props.updatedAtMs).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#050a0f] shadow-[0_0_0_1px_rgba(0,255,135,0.06),0_24px_80px_-32px_rgba(0,255,135,0.25)]">
      <div className="predictio-liquidity-ticker flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {liquidityTerminal.tickerPrefix}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/45">
          <Radio className="h-3.5 w-3.5 text-cyan-400/70" aria-hidden />
          <span className="font-mono tabular-nums">{syncTime}</span>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/55 sm:inline">
            {props.dataSource === "vault" ? liquidityTerminal.sourceVault : liquidityTerminal.sourceFeed}
          </span>
        </div>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {props.rows.map((row) => {
          const heat = heatForPct(row.percentage);
          const barW = Math.max(6, Math.round((row.percentage / maxPct) * 100));
          return (
            <div
              key={rowListKey(row)}
              className="group px-4 py-4 transition-colors hover:bg-white/[0.02] sm:px-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="text-xl leading-none" aria-hidden>
                    {sportEmoji(row.sport)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-syne text-sm font-semibold text-white/95 sm:text-base">
                      {row.marketName}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-white/40">{row.league}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:shrink-0 sm:justify-end">
                  <div className="text-right">
                    <div className={`text-[10px] font-medium uppercase tracking-wider ${heat.className}`}>
                      {heat.label}
                    </div>
                    <div className="font-mono text-lg font-bold tabular-nums text-emerald-300">
                      {row.percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right sm:w-28">
                    <div className="text-[10px] uppercase tracking-wider text-white/35">
                      {liquidityTerminal.columnNotional}
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-white/80">
                      {props.isPreTestnet
                        ? `~${row.allocation.toFixed(0)}`
                        : `$${row.allocation.toFixed(0)}`}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="animate-liquidity-pulse h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 transition-[width] duration-700"
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-white/[0.06] bg-black/30 px-4 py-3 text-center text-[11px] leading-relaxed text-white/40 sm:px-6">
        {liquidityTerminal.footnote}
      </p>
    </div>
  );
}
