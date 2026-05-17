export type OracleLagStatus = {
  protocolHealthy: boolean;
  oracleDelayed: boolean;
  settlementQueued: boolean;
  payoutSafePending: boolean;
  lastOracleSyncAgeSec: number | null;
  lastSettlementTickAgeSec: number | null;
  retryCadenceLabel: string;
  whatHappensNext: string;
};

export function deriveOracleLagStatus(input: {
  reasonCode?: string | null;
  lastOracleSyncAt?: string | null;
  lastSettlementTickAt?: string | null;
  orderOpen?: boolean;
  cronCadence?: string;
}): OracleLagStatus {
  const now = Date.now();
  const oracleAge = input.lastOracleSyncAt
    ? Math.round((now - Date.parse(input.lastOracleSyncAt)) / 1000)
    : null;
  const tickAge = input.lastSettlementTickAt
    ? Math.round((now - Date.parse(input.lastSettlementTickAt)) / 1000)
    : null;

  const code = input.reasonCode ?? "";
  const oracleDelayed =
    code === "ORACLE_PREMATCH" || code === "ORACLE_NOT_RESOLVED";
  const settlementQueued =
    oracleDelayed && Boolean(input.orderOpen);
  const payoutSafePending =
    settlementQueued || code === "SETTLEMENT_ELIGIBLE";

  const protocolHealthy =
    code !== "GRAPHQL_ERROR" && code !== "GAME_NOT_IN_SUBGRAPH";

  let whatHappensNext =
    "Predictio polls Azuro and runs settlement when a terminal oracle state is published.";
  if (code === "SETTLEMENT_ELIGIBLE") {
    whatHappensNext =
      "Next VPS cron tick should write ledger entries and update your paper balance automatically.";
  } else if (oracleDelayed) {
    whatHappensNext =
      "No wallet action required. Funds stay in open position until Azuro finalizes — not lost.";
  } else if (!protocolHealthy) {
    whatHappensNext =
      "Ops may retire unsupported markets. Open positions remain auditable in wallet ledger.";
  }

  return {
    protocolHealthy,
    oracleDelayed,
    settlementQueued,
    payoutSafePending,
    lastOracleSyncAgeSec: oracleAge,
    lastSettlementTickAgeSec: tickAge,
    retryCadenceLabel: input.cronCadence ?? "Settlement cron ~every 5 min",
    whatHappensNext,
  };
}

export function formatAgeSec(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  return `${Math.round(sec / 3600)}h ago`;
}
