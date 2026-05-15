/**
 * Human-readable registry of **runtime orchestration touchpoints** (jobs, polling, side effects).
 * Update when adding schedulers or settlement drivers. Used by ops / code search (`grep` anchors).
 */
export type RuntimeOrchestrationAuditRow = {
  file: string;
  role: string;
  dbWriter: boolean | string;
  retrySafe: boolean | string;
  idempotent: string;
  sideEffects: string;
  polling: boolean;
  staleRisk: string;
};

export const RUNTIME_ORCHESTRATION_AUDIT_ROWS: readonly RuntimeOrchestrationAuditRow[] = [
  {
    file: "src/hooks/useAzuroResolutionPolling.ts",
    role: "Client poll → checkAzuroResolutions → resolve/refund/dispute mutations",
    dbWriter: true,
    retrySafe: true,
    idempotent: "Mutations backed by idempotent engines; client ref dedupe per market",
    sideEffects: "DB settlement/refund/dispute, toasts, query invalidation",
    polling: true,
    staleRisk:
      "5 min refetch; if user offline, no poll — production should add server cron/VPS tick",
  },
  {
    file: "src/server/trpc/procedures/checkAzuroResolutions.ts",
    role: "tRPC read path wrapping checkResolvedMarkets",
    dbWriter: false,
    retrySafe: true,
    idempotent: "Read-only",
    sideEffects: "Azuro GraphQL network",
    polling: false,
    staleRisk: "None (caller-driven)",
  },
  {
    file: "src/services/azuro.ts / checkResolvedMarkets",
    role: "Oracle normalization for paper markets",
    dbWriter: false,
    retrySafe: true,
    idempotent: "Read-only",
    sideEffects: "External GraphQL",
    polling: false,
    staleRisk: "Rate limits / partial games list",
  },
  {
    file: "src/server/services/autonomousCopyAnalystScheduler.ts",
    role: "setInterval autonomous copy + resolution tick (VPS single worker)",
    dbWriter: true,
    retrySafe: "partial",
    idempotent: "Trader tick uses DB guards; not full saga idempotency",
    sideEffects: "Orders, notifications, may call resolution helpers",
    polling: true,
    staleRisk: "Disabled on VERCEL=1; serverless must use cron script",
  },
  {
    file: "src/server/scripts/runAutonomousCopyAnalystTick.ts",
    role: "One-shot tick for external cron",
    dbWriter: true,
    retrySafe: "partial",
    idempotent: "Same as scheduler tick",
    sideEffects: "Same as scheduler tick",
    polling: false,
    staleRisk: "Cron misconfiguration → stale analyst state",
  },
  {
    file: "src/server/trpc/handler.ts",
    role: "Bootstraps autonomous copy scheduler on server start",
    dbWriter: false,
    retrySafe: true,
    idempotent: "Single-flight global flag in scheduler module",
    sideEffects: "Starts setInterval when enabled",
    polling: true,
    staleRisk: "Duplicate imports → warnDuplicateSchedulerContext",
  },
  {
    file: "backend/src/jobs/marketStatusUpdater.ts",
    role: "Curated Azuro OPEN→LOCKED→RESOLVED + auto-publish",
    dbWriter: true,
    retrySafe: "partial",
    idempotent: "Prisma updates; duplicate interval guarded by global flag",
    sideEffects: "curatedEvent rows, Azuro fetch",
    polling: true,
    staleRisk: "Separate DB/backend from main app; drift vs paper DB",
  },
  {
    file: "backend/src/index.ts",
    role: "Backend process intervals (subscriptions, housekeeping)",
    dbWriter: "varies",
    retrySafe: "partial",
    idempotent: "varies",
    sideEffects: "Timers, WS",
    polling: true,
    staleRisk: "Long-lived Node process only",
  },
  {
    file: "src/server/trpc/procedures/resolvePaperPositions.ts",
    role: "Binary paper settlement entry",
    dbWriter: true,
    retrySafe: true,
    idempotent: "paperSettlementEngine + ledger dedupe",
    sideEffects: "Market, Order, Transaction, User.virtualBalance",
    polling: false,
    staleRisk: "Caller supplies oracle fields; mismatch surfaced in recon",
  },
  {
    file: "src/server/trpc/procedures/refundPaperMarket.ts",
    role: "Paper refund entry",
    dbWriter: true,
    retrySafe: true,
    idempotent: "paperRefundEngine",
    sideEffects: "Orders resolved + position_refund ledger",
    polling: false,
    staleRisk: "None",
  },
  {
    file: "src/server/trpc/procedures/disputePaperMarket.ts",
    role: "Dispute / under_review transitions",
    dbWriter: true,
    retrySafe: "partial",
    idempotent: "Lifecycle guards",
    sideEffects: "Market status + disputeReason",
    polling: false,
    staleRisk: "DISPUTED stuck without operator follow-up",
  },
  {
    file: "src/server/trpc/procedures/createNotification.ts",
    role: "User notifications",
    dbWriter: true,
    retrySafe: false,
    idempotent: "Not keyed — best-effort",
    sideEffects: "Notification rows",
    polling: false,
    staleRisk: "Must never be source of settlement truth",
  },
  {
    file: "src/server/scripts/checkVaultAlertsScheduled.ts",
    role: "Doc-only cron hook for vault alerts",
    dbWriter: false,
    retrySafe: true,
    idempotent: "n/a",
    sideEffects: "None in module",
    polling: false,
    staleRisk: "If cron not wired, alerts stale",
  },
];
