import type { OracleTrustSnapshot } from "~/lib/settlement/oracleTrustLayer";
import type { SettlementConfidenceResult } from "~/lib/settlement/settlementConfidenceScore";
import type { SettlementDiagnosticEntry } from "~/lib/settlement/settlementDiagnostics";

export type OracleActionContext = {
  whyStillOpen: string | null;
  expectedNextAction: string;
  oracleLastSeen: string | null;
  settlementQueueHint: string | null;
  confidenceLevel: string;
  estimatedDelay: string | null;
  matchFinished: boolean;
  oraclePending: boolean;
  payoutQueued: boolean;
  settlementBlocked: boolean;
};

export function deriveOracleActionContext(input: {
  diagnostic: SettlementDiagnosticEntry | null | undefined;
  confidence?: SettlementConfidenceResult | null;
  oracleTrust?: OracleTrustSnapshot | null;
  protocolHealth?: {
    openOrders: number;
    openMarkets: number;
    unresolvedMarkets?: number;
    lastSettlementTickAt?: string | null;
  } | null;
  orderOpen?: boolean;
}): OracleActionContext {
  const d = input.diagnostic;
  const conf = input.confidence?.level ?? input.oracleTrust?.confidence ?? "MEDIUM";
  const code = d?.reasonCode;

  const matchFinished =
    code === "ORACLE_PREMATCH" ||
    code === "ORACLE_NOT_RESOLVED" ||
    (d?.closesAt != null && Date.parse(d.closesAt) <= Date.now());

  const oraclePending =
    code === "ORACLE_PREMATCH" || code === "ORACLE_NOT_RESOLVED";

  const payoutQueued =
    code === "SETTLEMENT_ELIGIBLE" || (oraclePending && Boolean(input.orderOpen));

  const settlementBlocked =
    code === "GAME_NOT_IN_SUBGRAPH" ||
    code === "GRAPHQL_ERROR" ||
    code === "CONDITION_MISSING" ||
    code === "WINNER_UNKNOWN" ||
    code === "INVALID_MAPPING";

  let whyStillOpen: string | null = null;
  if (input.orderOpen && oraclePending) {
    whyStillOpen =
      input.oracleTrust?.userMessage ??
      "The match has finished, but Azuro has not finalized the oracle result yet. Your position stays open until the oracle publishes a terminal state.";
  } else if (input.orderOpen && settlementBlocked) {
    whyStillOpen = d?.reasonDetail ?? "Settlement is blocked pending indexer or condition validation.";
  } else if (input.orderOpen && code === "SETTLEMENT_ELIGIBLE") {
    whyStillOpen = "Oracle is ready — the next VPS settlement cron tick should claim this position.";
  }

  let expectedNextAction = "Monitor mark-to-market while the market is open.";
  if (code === "SETTLEMENT_ELIGIBLE") {
    expectedNextAction = "Automatic payout on next settlement cron (~5 min). No wallet action required.";
  } else if (oraclePending) {
    expectedNextAction =
      "Wait for Azuro to publish Resolved/Finished with wonOutcomeIds. Predictio polls every ~5 minutes.";
  } else if (settlementBlocked) {
    expectedNextAction = "Protocol ops may retire the market if the game never appears on the indexer feed.";
  } else if (code === "MARKET_ALREADY_SETTLED") {
    expectedNextAction = "Review portfolio P&L and wallet ledger for finalized payout.";
  }

  const health = input.protocolHealth;
  let settlementQueueHint: string | null = null;
  if (health && health.openOrders > 0) {
    settlementQueueHint = `${health.openOrders} open order(s) across ${health.openMarkets} market(s) in global queue`;
    if (health.unresolvedMarkets != null && health.unresolvedMarkets > 0) {
      settlementQueueHint += ` · ~${health.unresolvedMarkets} awaiting oracle in sample`;
    }
  }

  let estimatedDelay: string | null = null;
  if (oraclePending && input.oracleTrust?.estimatedOracleLagMinutes != null) {
    estimatedDelay = `Oracle lag ~${input.oracleTrust.estimatedOracleLagMinutes}m since scheduled close`;
  } else if (oraclePending) {
    estimatedDelay = "Azuro publication time varies — typically minutes to hours after full-time";
  }

  return {
    whyStillOpen,
    expectedNextAction,
    oracleLastSeen: input.oracleTrust?.lastOracleSyncAt ?? null,
    settlementQueueHint,
    confidenceLevel: conf,
    estimatedDelay,
    matchFinished,
    oraclePending,
    payoutQueued,
    settlementBlocked,
  };
}
