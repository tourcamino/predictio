/** Shared health rollup for reconciliation + future runtime probes (no I/O). */
export type RuntimeHealthSummary = {
  overall: "ok" | "degraded" | "critical";
  runId: string;
  checkedAt: string;
  findingCounts: {
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
  /** Compact metric keys for logs / future metrics backend. */
  counters: Record<string, number>;
};
