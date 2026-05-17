import type { SettlementDiagnosticEntry } from "~/lib/settlement/settlementDiagnostics";
import { deriveSettlementConfidence, type SettlementConfidenceLevel } from "~/lib/settlement/settlementConfidenceScore";

export type OracleTrustSnapshot = {
  oracleState: string | null;
  oracleFreshnessLabel: "live" | "stale" | "unknown";
  lastOracleSyncAt: string | null;
  lastSettlementTickAt: string | null;
  settlementCronCadence: string;
  queueOpenOrders: number;
  queueOpenMarkets: number;
  unresolvedMarkets: number;
  estimatedOracleLagMinutes: number | null;
  confidence: SettlementConfidenceLevel;
  confidenceHeadline: string;
  userMessage: string;
  conditionIndex: number | null;
  conditionCount: number;
  conditionSelectionReason: string | null;
};

const FINISHED_COPY =
  "The match has finished, but Azuro has not finalized the oracle result yet. Payouts run automatically once Azuro publishes a terminal state.";

export function buildOracleTrustSnapshot(input: {
  diagnostic: SettlementDiagnosticEntry;
  checkedAt: string;
  lastSettlementTickAt?: string | null;
  queueOpenOrders?: number;
  queueOpenMarkets?: number;
  unresolvedMarkets?: number;
  cronCadence?: string;
}): OracleTrustSnapshot {
  const confidence = deriveSettlementConfidence(input.diagnostic);
  const lag =
    input.diagnostic.closesAt != null
      ? Math.max(
          0,
          Math.round((Date.parse(input.checkedAt) - Date.parse(input.diagnostic.closesAt)) / 60_000),
        )
      : null;

  const prematchAfterClose =
    input.diagnostic.reasonCode === "ORACLE_PREMATCH" && lag != null && lag > 60;

  let userMessage = confidence.detail;
  if (prematchAfterClose) {
    userMessage = FINISHED_COPY;
  } else if (input.diagnostic.reasonCode === "GRAPHQL_ERROR") {
    userMessage =
      "Cannot reach the Azuro data indexer right now. Settlement will resume when the oracle feed is reachable — this is not a broken position.";
  } else if (input.diagnostic.reasonCode === "GAME_NOT_IN_SUBGRAPH") {
    userMessage =
      "This game is not visible on the Azuro indexer feed Predictio uses. Ops may retire the market; your stake is not silently lost.";
  }

  const freshness: OracleTrustSnapshot["oracleFreshnessLabel"] =
    input.checkedAt ? "live" : "unknown";

  return {
    oracleState: input.diagnostic.azuroGameState,
    oracleFreshnessLabel: freshness,
    lastOracleSyncAt: input.checkedAt,
    lastSettlementTickAt: input.lastSettlementTickAt ?? null,
    settlementCronCadence: input.cronCadence ?? "VPS cron ~every 5 minutes",
    queueOpenOrders: input.queueOpenOrders ?? 0,
    queueOpenMarkets: input.queueOpenMarkets ?? 0,
    unresolvedMarkets: input.unresolvedMarkets ?? 0,
    estimatedOracleLagMinutes: prematchAfterClose ? lag : null,
    confidence: confidence.level,
    confidenceHeadline: confidence.headline,
    userMessage,
    conditionIndex: input.diagnostic.conditionIndex,
    conditionCount: input.diagnostic.conditionCount,
    conditionSelectionReason: input.diagnostic.conditionSelectionReason,
  };
}
