import { Clock, Radio } from "lucide-react";
import type { Market } from "~/data/mockMarkets";
import { deriveMarketClockPhase } from "~/lib/protocol/positionLifecycleNarrative";
import type { PositionLifecycleView } from "~/lib/position/derivePositionLifecycle";
import { formatApiDateTime } from "~/utils/parseApiDate";

const phaseCopy: Record<
  ReturnType<typeof deriveMarketClockPhase>,
  { pill: string; className: string }
> = {
  upcoming: { pill: "Upcoming", className: "border-blue-500/30 bg-blue-500/10 text-blue-300" },
  live: { pill: "Live", className: "border-red-500/30 bg-red-500/10 text-red-300" },
  closed: { pill: "Closed", className: "border-white/20 bg-white/5 text-gray-300" },
  awaiting_oracle: {
    pill: "Awaiting oracle",
    className: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  },
  resolved: { pill: "Resolved", className: "border-brand-green/30 bg-brand-green/10 text-brand-green" },
};

export function MarketClockPanel({
  market,
  lifecycle,
  kickoffAt,
  closesAt,
}: {
  market?: Market | null;
  lifecycle?: PositionLifecycleView;
  kickoffAt?: Date | null;
  closesAt?: Date | null;
}) {
  const phase = deriveMarketClockPhase(market, lifecycle);
  const kick = kickoffAt ?? lifecycle?.kickoffAt ?? market?.start_time ?? null;
  const close = closesAt ?? lifecycle?.closesAt ?? market?.closesAt ?? null;
  const now = Date.now();

  let elapsed: string | null = null;
  if (kick && kick.getTime() <= now) {
    const ms = now - kick.getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    elapsed = h > 0 ? `${h}h ${m}m since kickoff` : `${m}m since kickoff`;
  }

  const pc = phaseCopy[phase];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Radio className="h-3.5 w-3.5 text-brand-cyan animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
          Market clock
        </span>
        <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${pc.className}`}>
          {pc.pill}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Opens / kickoff</p>
          <p className="mt-1 font-mono text-sm text-white">{kick ? formatApiDateTime(kick) : "—"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Closes trading</p>
          <p className="mt-1 font-mono text-sm text-white">{close ? formatApiDateTime(close) : "—"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Elapsed</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-sm text-gray-300">
            <Clock className="h-3.5 w-3.5" />
            {elapsed ?? (phase === "upcoming" ? "Not started" : "—")}
          </p>
        </div>
      </div>
    </div>
  );
}
