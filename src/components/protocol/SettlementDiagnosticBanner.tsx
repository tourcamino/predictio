import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { PROTOCOL_CACHE } from "~/lib/query/protocolCachePolicy";
import type { SettlementSkipReasonCode } from "~/lib/settlement/settlementDiagnostics";
import { formatApiDateTime } from "~/utils/parseApiDate";

const friendlyReason: Partial<Record<SettlementSkipReasonCode, string>> = {
  ORACLE_PREMATCH:
    "Oracle still reports Prematch. The match may have ended but Azuro has not published a terminal state yet.",
  GAME_NOT_IN_SUBGRAPH:
    "Game not found in Azuro subgraph — verify gameId mapping and indexer lag.",
  ORACLE_NOT_RESOLVED: "Oracle state is not Resolved/Finished yet.",
  CONDITION_MISSING:
    "Primary condition missing — conditions[0] may be wrong for this market type.",
  WINNER_UNKNOWN: "Oracle resolved without wonOutcomeIds — payout blocked.",
  DRAW_UNSUPPORTED: "Draw outcome — refund path applies.",
  SETTLEMENT_ELIGIBLE: "Oracle ready — next settlement cron tick should process payouts.",
  MARKET_ALREADY_SETTLED: "Market already settled in database.",
  NON_AZURO_MARKET: "Non-Azuro market — paper oracle path only.",
};

export function SettlementDiagnosticBanner({ marketId }: { marketId: string }) {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.getMarketSettlementDiagnostic.queryOptions({ marketId }),
    staleTime: PROTOCOL_CACHE.settlementDiagnosticStaleMs,
    refetchInterval: PROTOCOL_CACHE.settlementDiagnosticRefetchMs,
    enabled: Boolean(marketId),
  });

  const d = query.data?.diagnostic;
  if (!d && query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking oracle…
      </div>
    );
  }
  if (!d) return null;

  const isOk =
    d.reasonCode === "SETTLEMENT_ELIGIBLE" || d.reasonCode === "MARKET_ALREADY_SETTLED";
  const isBlocked = d.skipped && !isOk;
  const copy = friendlyReason[d.reasonCode] ?? d.reasonDetail;

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isOk
          ? "border-brand-green/30 bg-brand-green/10"
          : isBlocked
            ? "border-amber-500/35 bg-amber-500/10"
            : "border-white/10 bg-white/[0.03]"
      }`}
      role="status"
    >
      <div className="flex gap-3">
        {isOk ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {d.reasonCode.replace(/_/g, " ")}
            {d.azuroGameState ? (
              <span className="ml-2 font-mono text-xs font-normal text-gray-400">
                · {d.azuroGameState}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-gray-400">{copy}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-gray-600">
            {d.conditionId && <span>condition {d.conditionId.slice(0, 12)}…</span>}
            {d.conditionIndex != null && (
              <span>
                idx {d.conditionIndex}/{d.conditionCount}
                {d.conditionSelectionReason ? ` · ${d.conditionSelectionReason}` : ""}
              </span>
            )}
            {d.azuroGameId && <span>game {d.azuroGameId}</span>}
            {query.data?.checkedAt && (
              <span>checked {formatApiDateTime(new Date(query.data.checkedAt))}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
