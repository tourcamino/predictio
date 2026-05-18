import { useQuery } from "@tanstack/react-query";
import { Activity, Droplets, Radio, Users, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import { formatApiDateTime } from "~/utils/parseApiDate";

type Variant = "full" | "compact";

export function GlobalProtocolMarketPulse({ variant = "full" }: { variant?: Variant }) {
  const trpc = useTRPC();
  const q = useQuery({
    ...trpc.getProtocolMarketBreadth.queryOptions(),
    staleTime: PROTOCOL_CACHE.protocolTimelineStaleMs,
    refetchInterval: PROTOCOL_CACHE.marketSummariesRefetchIntervalMs,
  });

  const b = q.data;
  if (!b && q.isLoading) {
    return (
      <p className="font-mono text-[10px] text-gray-600">Syncing protocol market pulse…</p>
    );
  }
  if (!b) return null;

  const compact = variant === "compact";

  return (
    <div
      className={`rounded-xl border border-brand-cyan/25 bg-gradient-to-r from-brand-cyan/[0.08] via-black/40 to-brand-green/[0.06] ${
        compact ? "px-3 py-2.5" : "px-4 py-3.5"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Radio className="h-3.5 w-3.5 animate-pulse text-brand-cyan" />
        <span className="font-syne text-xs font-bold uppercase tracking-[0.15em] text-white">
          Market pulse
        </span>
        <span className="font-mono text-[10px] text-gray-500">
          {formatApiDateTime(new Date(b.checkedAt))}
        </span>
        <Link
          to="/markets"
          className="ml-auto font-mono text-[10px] font-semibold text-brand-green hover:text-brand-green/80"
        >
          Discover →
        </Link>
      </div>

      <div
        className={`grid gap-2 font-mono text-[11px] ${
          compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        }`}
      >
        <PulseStat
          icon={<Zap className="h-3 w-3 text-brand-cyan" />}
          label="Fills 24h"
          value={String(b.pulse.fills24h)}
        />
        <PulseStat
          icon={<Users className="h-3 w-3 text-white" />}
          label="Wallets 24h"
          value={String(b.pulse.activeWallets24h)}
        />
        <PulseStat
          icon={<Activity className="h-3 w-3 text-brand-green" />}
          label="Open interest"
          value={`$${Math.round(b.liquidity.openInterest)}`}
        />
        <PulseStat
          icon={<Droplets className="h-3 w-3 text-brand-cyan" />}
          label="Pool util"
          value={`${b.liquidity.utilizationPct}%`}
        />
        <PulseStat label="Live markets" value={String(b.pulse.liveMarkets)} />
        <PulseStat
          label="Oracle queue"
          value={String(b.pulse.oracleQueue)}
          accent={b.pulse.oracleQueue > 0 ? "amber" : undefined}
        />
      </div>

      {!compact && b.biggestMovers[0] ? (
        <p className="mt-2 truncate font-mono text-[10px] text-gray-500">
          Hottest flow: {b.biggestMovers[0].label} · {b.biggestMovers[0].fills24h} fills 24h
        </p>
      ) : null}
    </div>
  );
}

function PulseStat({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  accent?: "amber";
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-gray-600">
        {icon}
        {label}
      </p>
      <p
        className={`font-semibold ${accent === "amber" ? "text-amber-200" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
