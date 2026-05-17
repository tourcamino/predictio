import { Clock, Shield } from "lucide-react";
import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import {
  deriveSettlementTimeline,
  type SettlementTimelineStep,
} from "~/lib/protocol/deriveSettlementTimeline";
import type { SettlementDiagnosticEntry } from "~/lib/settlement/settlementDiagnostics";
import { formatApiDateTime } from "~/utils/parseApiDate";

function stepDot(status: SettlementTimelineStep["status"]) {
  if (status === "done") return "bg-brand-green ring-brand-green/30";
  if (status === "active") return "bg-amber-400 ring-amber-400/40 animate-pulse";
  return "bg-white/15 ring-white/10";
}

export function SettlementTimelinePanel({
  market,
  order,
  diagnostic,
  lastOracleCheckAt,
  compact,
}: {
  market?: Market | null;
  order?: UserOrderRow | null;
  diagnostic?: SettlementDiagnosticEntry | null;
  lastOracleCheckAt?: Date | null;
  compact?: boolean;
}) {
  const { steps, meta } = deriveSettlementTimeline(
    market,
    order,
    diagnostic,
    lastOracleCheckAt,
  );

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[0_16px_48px_rgba(0,0,0,0.28)] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
            Settlement timeline
          </p>
          <p className="mt-1 text-sm text-gray-300">
            Protocol path from catalog → oracle → payout
          </p>
        </div>
        <Shield className="h-5 w-5 shrink-0 text-brand-green/70" />
      </div>

      <ol className="space-y-0">
        {steps.map((s, i) => (
          <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && (
              <span
                className="absolute left-[7px] top-4 h-[calc(100%-4px)] w-px bg-white/10"
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ${stepDot(s.status)}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    s.status === "active"
                      ? "text-amber-100"
                      : s.status === "done"
                        ? "text-white"
                        : "text-gray-500"
                  }`}
                >
                  {s.label}
                </span>
                {s.at && (
                  <span className="font-mono text-[10px] text-gray-500">
                    {formatApiDateTime(s.at)}
                  </span>
                )}
              </div>
              {s.detail && (
                <p className="mt-0.5 text-xs text-gray-500">{s.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs text-gray-500">
        <p>
          <span className="text-gray-400">Resolution:</span> {meta.resolutionSource}
        </p>
        <p className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {meta.cronCadence}
        </p>
        {meta.lastOracleCheckAt && (
          <p className="font-mono">
            Last oracle check: {formatApiDateTime(meta.lastOracleCheckAt)}
          </p>
        )}
        {meta.settlementLagMinutes != null && meta.settlementLagMinutes > 0 && (
          <p className="font-mono text-amber-200/80">
            Settlement lag: ~{meta.settlementLagMinutes}m since market close
          </p>
        )}
        {meta.diagnosticReasonCode && (
          <p className="font-mono text-gray-400">
            Diagnostic: {meta.diagnosticReasonCode}
          </p>
        )}
      </div>

      {meta.currentBlocker && (
        <div
          className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100"
          role="status"
        >
          {meta.currentBlocker}
        </div>
      )}
    </div>
  );
}

