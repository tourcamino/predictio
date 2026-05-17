import type { ReactNode } from "react";
import { Activity, Radio } from "lucide-react";

export function TradingTerminalShell({
  children,
  title,
  subtitle,
  balanceLabel,
  balanceValue,
  openCount,
  settlingCount,
  traderFirst,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  balanceLabel?: string;
  balanceValue?: string;
  openCount?: number;
  settlingCount?: number;
  /** Trader desk: background only — header stats live in TradingDeskHeader */
  traderFirst?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-bg">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,255,135,0.12), transparent 55%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[320px] w-[640px] -translate-x-1/2 rounded-full bg-brand-green/15 blur-[100px]" />

      <div className="relative z-10 px-4 pb-20">
        <div className="mx-auto max-w-7xl">
          {!traderFirst ? (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-green/25 bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Live trading terminal
                  </p>
                  <h1 className="font-syne text-4xl font-bold tracking-tight text-white">{title}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-gray-400">{subtitle}</p>
                </div>
                <div className="flex flex-wrap items-stretch gap-3">
                  {typeof openCount === "number" && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Open</p>
                      <p className="font-mono text-2xl font-bold text-white">{openCount}</p>
                    </div>
                  )}
                  {typeof settlingCount === "number" && settlingCount > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80">
                        Oracle pending
                      </p>
                      <p className="font-mono text-2xl font-bold text-amber-200">{settlingCount}</p>
                    </div>
                  )}
                  {balanceValue != null && (
                    <div className="rounded-xl border border-brand-green/25 bg-gradient-to-br from-brand-green/10 to-transparent px-5 py-3 shadow-[0_0_40px_rgba(0,255,135,0.08)]">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                        {balanceLabel ?? "Balance"}
                      </p>
                      <p className="font-mono text-2xl font-bold text-brand-green">{balanceValue}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6 flex items-center gap-2 text-xs text-gray-500">
                <Activity className="h-3.5 w-3.5 text-brand-cyan" />
                <span>Mark-to-market refreshes while this page is open · paper protocol mode</span>
              </div>
            </>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}
