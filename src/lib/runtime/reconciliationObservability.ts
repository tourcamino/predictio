/**
 * Reconciliation / runtime drift observability.
 * Enable with `RUNTIME_RECON_DEBUG=1` or `RUNTIME_RECON_DEBUG=true`.
 */

import type { RuntimeReconciliationResult } from "./runtimeReconciliationTypes";
import type { RuntimeHealthSummary } from "./runtimeHealthTypes";

export type { RuntimeHealthSummary } from "./runtimeHealthTypes";

function isRuntimeReconDebugEnabled(): boolean {
  return (
    typeof process !== "undefined" &&
    (process.env.RUNTIME_RECON_DEBUG === "1" || process.env.RUNTIME_RECON_DEBUG === "true")
  );
}

export function logRuntimeReconDev(
  phase: string,
  payload: Record<string, unknown>,
): void {
  if (!isRuntimeReconDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(`[runtime-recon] ${phase}`, payload);
}

export function warnRuntimeRecon(message: string, payload: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.warn(`[runtime-recon] ${message}`, payload);
}

export function warnDuplicateSchedulerContext(
  jobName: string,
  payload: Record<string, unknown>,
): void {
  warnRuntimeRecon(`DUPLICATE_SCHEDULER_CONTEXT: ${jobName}`, payload);
}

export function logReconciliationRunSummary(result: RuntimeReconciliationResult): void {
  if (!isRuntimeReconDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log("[runtime-recon] summary", {
    runId: result.runId,
    durationMs: result.durationMs,
    overall: result.health.overall,
    findingCounts: result.health.findingCounts,
    issueCodeCounts: result.issueCodeCounts,
    truncated: result.truncated,
  });
}

export function buildRuntimeHealthSummary(input: {
  runId: string;
  checkedAt: string;
  counters: Record<string, number>;
  critical: number;
  error: number;
  warning: number;
  info: number;
}): RuntimeHealthSummary {
  const overall =
    input.critical > 0
      ? "critical"
      : input.error > 0
        ? "degraded"
        : input.warning > 0
          ? "degraded"
          : "ok";
  return {
    overall,
    runId: input.runId,
    checkedAt: input.checkedAt,
    findingCounts: {
      critical: input.critical,
      error: input.error,
      warning: input.warning,
      info: input.info,
    },
    counters: input.counters,
  };
}
