import type { DeskPulseSnapshot } from "~/lib/trading/traderPositionPsychology";

export function TraderMarketPulseBanner({ pulse }: { pulse: DeskPulseSnapshot }) {
  if (pulse.favored + pulse.against + pulse.flat === 0) return null;

  const drift =
    Math.abs(pulse.avgProbDriftPct) >= 0.5
      ? `${pulse.avgProbDriftPct >= 0 ? "+" : ""}${pulse.avgProbDriftPct.toFixed(1)}% avg drift`
      : "Markets steady vs entry";

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-[11px]"
      role="status"
    >
      <span className="text-gray-500">
        Desk pulse · <span className="text-white">{pulse.favored + pulse.against + pulse.flat}</span>{" "}
        open
      </span>
      {pulse.liveNow > 0 ? (
        <span className="text-brand-cyan">
          <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-cyan" />
          {pulse.liveNow} live
        </span>
      ) : null}
      {pulse.urgent > 0 ? (
        <span className="text-amber-200">{pulse.urgent} time-sensitive</span>
      ) : null}
      <span className="text-brand-green">{pulse.favored} with you</span>
      <span className="text-red-400">{pulse.against} against</span>
      <span className="text-gray-500">{drift}</span>
    </div>
  );
}
