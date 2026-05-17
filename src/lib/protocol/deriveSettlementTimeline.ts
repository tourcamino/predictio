import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import {
  derivePositionLifecycle,
  isAwaitingOracleSettlement,
} from "~/lib/position/derivePositionLifecycle";
import type { SettlementDiagnosticEntry } from "~/lib/settlement/settlementDiagnostics";
import { getMarketProtocolLabel } from "~/lib/market/marketProtocolStatus";

export type SettlementTimelineStepId =
  | "MARKET_CREATED"
  | "MARKET_OPEN"
  | "MARKET_CLOSED"
  | "ORACLE_WAITING"
  | "ORACLE_RESOLVED"
  | "SETTLEMENT_PROCESSING"
  | "PAYOUT_COMPLETE";

export type SettlementTimelineStep = {
  id: SettlementTimelineStepId;
  label: string;
  status: "done" | "active" | "pending";
  at: Date | null;
  detail?: string;
};

export type SettlementTimelineMeta = {
  currentBlocker: string | null;
  settlementLagMinutes: number | null;
  resolutionSource: string;
  cronCadence: string;
  lastOracleCheckAt: Date | null;
  diagnosticReasonCode: string | null;
};

function fmt(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function step(
  id: SettlementTimelineStepId,
  label: string,
  status: SettlementTimelineStep["status"],
  at: Date | null,
  detail?: string,
): SettlementTimelineStep {
  return { id, label, status, at, detail };
}

export function deriveSettlementTimeline(
  market: Market | null | undefined,
  order?: UserOrderRow | null,
  diagnostic?: SettlementDiagnosticEntry | null,
  lastOracleCheckAt?: Date | null,
): { steps: SettlementTimelineStep[]; meta: SettlementTimelineMeta } {
  const lifecycle = order ? derivePositionLifecycle(order, market) : null;
  const now = Date.now();
  const kickoff = market?.start_time ?? null;
  const createdAt = kickoff;
  const closesAt = lifecycle?.closesAt ?? market?.closesAt ?? kickoff;
  const resolvedAt = market?.resolved_at ?? null;
  const orderResolvedAt =
    order?.status === "resolved" && order.resolvedAt
      ? new Date(order.resolvedAt)
      : null;

  const closed =
    closesAt != null && closesAt.getTime() <= now;
  const awaiting =
    order != null
      ? isAwaitingOracleSettlement(order, market) || Boolean(lifecycle?.settlementPending)
      : closed && market?.status !== "resolved" && !resolvedAt;
  const oracleResolved =
    market?.status === "resolved" ||
    Boolean(resolvedAt) ||
    diagnostic?.reasonCode === "SETTLEMENT_ELIGIBLE" ||
    diagnostic?.reasonCode === "MARKET_ALREADY_SETTLED";
  const payoutDone = order?.status === "resolved" || order?.status === "closed";
  const processing =
    oracleResolved && !payoutDone && order?.status === "open";

  const prematchBlock =
    diagnostic?.reasonCode === "ORACLE_PREMATCH" ||
    diagnostic?.reasonCode === "GAME_NOT_IN_SUBGRAPH" ||
    diagnostic?.reasonCode === "ORACLE_NOT_RESOLVED";

  let currentBlocker: string | null = null;
  if (payoutDone) {
    currentBlocker = null;
  } else if (prematchBlock && diagnostic) {
    currentBlocker =
      diagnostic.reasonCode === "ORACLE_PREMATCH"
        ? "Oracle still reports Prematch — payouts blocked until Azuro finalizes"
        : diagnostic.reasonDetail;
  } else if (processing) {
    currentBlocker = "Settlement cron processing open orders (~5 min cadence)";
  } else if (awaiting) {
    currentBlocker = "Waiting for Azuro oracle terminal state (Resolved/Finished + winner)";
  } else if (!closed) {
    currentBlocker = null;
  }

  let settlementLagMinutes: number | null = null;
  if (closesAt && resolvedAt && resolvedAt.getTime() > closesAt.getTime()) {
    settlementLagMinutes = Math.round(
      (resolvedAt.getTime() - closesAt.getTime()) / 60_000,
    );
  } else if (closesAt && closed && !resolvedAt) {
    settlementLagMinutes = Math.round((now - closesAt.getTime()) / 60_000);
  }

  const steps: SettlementTimelineStep[] = [];

  steps.push(
    step(
      "MARKET_CREATED",
      "Market created",
      "done",
      createdAt,
      createdAt ? fmt(createdAt) : "Catalog indexed on protocol",
    ),
  );

  const openActive = !closed && market?.status === "open";
  steps.push(
    step(
      "MARKET_OPEN",
      "Market open",
      openActive ? "active" : closed || oracleResolved || payoutDone ? "done" : "pending",
      createdAt ?? kickoff,
      openActive ? "Trading active until kickoff lock" : "Trading window ended",
    ),
  );

  steps.push(
    step(
      "MARKET_CLOSED",
      "Market closed",
      !closed
        ? "pending"
        : awaiting && !oracleResolved
          ? "done"
          : closed
            ? "done"
            : "pending",
      closed ? closesAt : null,
      closed ? `Locked at ${fmt(closesAt)}` : `Closes ${fmt(closesAt)}`,
    ),
  );

  steps.push(
    step(
      "ORACLE_WAITING",
      "Oracle waiting",
      !closed
        ? "pending"
        : awaiting && !oracleResolved
          ? "active"
          : oracleResolved || payoutDone
            ? "done"
            : closed
              ? "active"
              : "pending",
      closed && !oracleResolved ? closesAt : oracleResolved ? resolvedAt : null,
      prematchBlock
        ? diagnostic?.reasonDetail ?? "Oracle still reports Prematch"
        : "Azuro subgraph polled by settlement cron",
    ),
  );

  steps.push(
    step(
      "ORACLE_RESOLVED",
      "Oracle resolved",
      oracleResolved || payoutDone
        ? "done"
        : awaiting
          ? "pending"
          : "pending",
      resolvedAt,
      oracleResolved
        ? `Outcome on-chain · ${getMarketProtocolLabel(market ?? undefined)}`
        : "No terminal oracle state yet",
    ),
  );

  steps.push(
    step(
      "SETTLEMENT_PROCESSING",
      "Settlement processing",
      payoutDone
        ? "done"
        : processing
          ? "active"
          : oracleResolved
            ? "pending"
            : "pending",
      processing ? lastOracleCheckAt ?? null : orderResolvedAt,
      "Paper batch settlement on VPS Postgres",
    ),
  );

  steps.push(
    step(
      "PAYOUT_COMPLETE",
      "Payout complete",
      payoutDone ? "done" : processing ? "pending" : "pending",
      orderResolvedAt ?? resolvedAt,
      payoutDone
        ? order && (order.pnl ?? 0) > 0
          ? "Win credited to paper balance"
          : order && (order.pnl ?? 0) < 0
            ? "Loss finalized"
            : "Position closed on ledger"
        : "No payout until settlement runs",
    ),
  );

  return {
    steps,
    meta: {
      currentBlocker,
      settlementLagMinutes,
      resolutionSource: market?.id?.startsWith("azuro-")
        ? "Azuro Protocol Oracle (GraphQL)"
        : "Predictio paper oracle",
      cronCadence: "Settlement cron checks every ~5 minutes on VPS",
      lastOracleCheckAt: lastOracleCheckAt ?? null,
      diagnosticReasonCode: diagnostic?.reasonCode ?? null,
    },
  };
}
