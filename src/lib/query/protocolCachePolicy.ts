/** Shared React Query cache policy for canonical protocol reads (PR5). */

export const PROTOCOL_CACHE = {
  /** Open positions — must appear quickly after trade. */
  positionsStaleMs: 8_000,
  positionsRefetchIntervalMs: 20_000,
  /** Market summaries for MTM. */
  marketSummariesStaleMs: 8_000,
  marketSummariesRefetchIntervalMs: 15_000,
  /** Wallet paper balance. */
  paperBalanceStaleMs: 10_000,
  /** Settlement / oracle diagnostic poll. */
  settlementDiagnosticStaleMs: 30_000,
  settlementDiagnosticRefetchMs: 60_000,
  /** Protocol activity timeline per market. */
  protocolTimelineStaleMs: 20_000,
} as const;
