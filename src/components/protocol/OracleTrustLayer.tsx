import { useQuery } from "@tanstack/react-query";
import { Clock, Database, Radio, Shield } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import { formatApiDateTime } from "~/utils/parseApiDate";
import type { SettlementConfidenceLevel } from "~/lib/settlement/settlementConfidenceScore";

const confidenceStyles: Record<
  SettlementConfidenceLevel,
  { border: string; badge: string; text: string }
> = {
  HIGH: {
    border: "border-brand-green/35 bg-brand-green/10",
    badge: "bg-brand-green/20 text-brand-green",
    text: "text-brand-green",
  },
  MEDIUM: {
    border: "border-amber-500/35 bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-300",
    text: "text-amber-200",
  },
  LOW: {
    border: "border-red-500/30 bg-red-500/10",
    badge: "bg-red-500/20 text-red-300",
    text: "text-red-200",
  },
};

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </p>
      <p className="font-mono text-xs text-white">{value}</p>
    </div>
  );
}

export function OracleTrustLayer({ marketId }: { marketId: string }) {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.getMarketSettlementDiagnostic.queryOptions({ marketId }),
    staleTime: PROTOCOL_CACHE.settlementDiagnosticStaleMs,
    refetchInterval: PROTOCOL_CACHE.settlementDiagnosticRefetchMs,
    enabled: Boolean(marketId),
  });

  const trust = query.data?.oracleTrust;
  const confidence = query.data?.confidence;
  if (!trust && query.isLoading) {
    return (
      <p className="text-xs font-mono text-gray-500">Loading oracle trust layer…</p>
    );
  }
  if (!trust) return null;

  const style = confidenceStyles[trust.confidence];

  return (
    <div
      className={`rounded-xl border px-4 py-4 ${style.border}`}
      role="region"
      aria-label="Oracle trust layer"
    >
      <div className="mb-3 flex items-center gap-2">
        <Shield className={`h-4 w-4 ${style.text}`} />
        <span className="font-syne text-sm font-bold text-white">Oracle trust</span>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${style.badge}`}
        >
          {trust.confidence} confidence
        </span>
      </div>

      <p className="text-sm text-gray-200">{trust.userMessage}</p>
      {confidence?.headline ? (
        <p className="mt-1 text-xs text-gray-500">{confidence.headline}</p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Metric
          icon={<Radio className="h-3.5 w-3.5 text-brand-cyan" />}
          label="Oracle state"
          value={trust.oracleState ?? "—"}
        />
        <Metric
          icon={<Clock className="h-3.5 w-3.5 text-gray-400" />}
          label="Last oracle sync"
          value={
            trust.lastOracleSyncAt
              ? formatApiDateTime(new Date(trust.lastOracleSyncAt))
              : "—"
          }
        />
        <Metric
          icon={<Database className="h-3.5 w-3.5 text-gray-400" />}
          label="Last settlement tick"
          value={
            trust.lastSettlementTickAt
              ? formatApiDateTime(new Date(trust.lastSettlementTickAt))
              : "Pending first cron heartbeat"
          }
        />
        <Metric
          icon={<Clock className="h-3.5 w-3.5 text-gray-400" />}
          label="Cron cadence"
          value={trust.settlementCronCadence}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-gray-600">
        {trust.estimatedOracleLagMinutes != null ? (
          <span>Est. oracle lag ~{trust.estimatedOracleLagMinutes}m</span>
        ) : null}
        {trust.conditionIndex != null ? (
          <span>
            condition idx {trust.conditionIndex}/{trust.conditionCount}
            {trust.conditionSelectionReason
              ? ` · ${trust.conditionSelectionReason}`
              : ""}
          </span>
        ) : null}
        <span>open orders on market: {trust.queueOpenOrders}</span>
      </div>
    </div>
  );
}
