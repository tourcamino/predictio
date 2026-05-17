import { useEffect, useState } from "react";
import { HeartPulse, RefreshCw } from "lucide-react";
import {
  deriveOracleLagStatus,
  formatAgeSec,
} from "~/lib/protocol/deriveOracleLagStatus";
import type { SettlementSkipReasonCode } from "~/lib/settlement/settlementDiagnostics";

export function OracleLagStatusPanel({
  reasonCode,
  lastOracleSyncAt,
  lastSettlementTickAt,
  orderOpen,
  cronCadence,
}: {
  reasonCode?: SettlementSkipReasonCode | null;
  lastOracleSyncAt?: string | null;
  lastSettlementTickAt?: string | null;
  orderOpen?: boolean;
  cronCadence?: string;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const lag = deriveOracleLagStatus({
    reasonCode,
    lastOracleSyncAt,
    lastSettlementTickAt,
    orderOpen,
    cronCadence,
  });

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs">
      <div className="mb-2 flex items-center gap-2">
        <HeartPulse
          className={`h-4 w-4 ${lag.protocolHealthy ? "text-brand-green" : "text-amber-400"}`}
        />
        <span className="font-mono uppercase tracking-wider text-gray-500">
          Protocol health
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
            lag.protocolHealthy
              ? "bg-brand-green/15 text-brand-green"
              : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {lag.protocolHealthy ? "Healthy" : "Degraded feed"}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <StatusPill
          label="Oracle sync"
          value={formatAgeSec(lag.lastOracleSyncAgeSec)}
          active={lag.oracleDelayed}
        />
        <StatusPill
          label="Settlement tick"
          value={formatAgeSec(lag.lastSettlementTickAgeSec)}
          active={lag.settlementQueued}
        />
        <StatusPill
          label="Retry cadence"
          value={lag.retryCadenceLabel}
          active={false}
        />
        <StatusPill
          label="Payout state"
          value={
            lag.payoutSafePending
              ? "Queued — funds safe"
              : lag.oracleDelayed
                ? "Awaiting oracle"
                : "Idle"
          }
          active={lag.payoutSafePending}
        />
      </div>
      <p className="mt-3 flex items-start gap-2 text-gray-400">
        <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-cyan" />
        {lag.whatHappensNext}
      </p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2 py-2 ${
        active ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-gray-600">{label}</p>
      <p className="font-mono text-xs text-white">{value}</p>
    </div>
  );
}
