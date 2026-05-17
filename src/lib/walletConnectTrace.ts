/**
 * Wallet-connect diagnostics (timeline T0 = first connect click in session).
 *
 * Enable:
 * - Dev builds (always)
 * - `VITE_WALLET_CONNECT_TRACE=1`
 * - `localStorage.setItem("wallet-connect-trace", "1")` then hard refresh
 */
let connectEpochMs: number | null = null;

function traceEnabled(): boolean {
  if (import.meta.env.DEV || import.meta.env.VITE_WALLET_CONNECT_TRACE === "1") {
    return true;
  }
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem("wallet-connect-trace") === "1";
  } catch {
    return false;
  }
}

export function walletConnectTraceResetEpoch(): void {
  connectEpochMs = Date.now();
  walletConnectTrace("trace_epoch_reset");
}

export function walletConnectTrace(
  phase: string,
  data?: Record<string, unknown>,
): void {
  if (!traceEnabled()) return;
  const now = Date.now();
  if (connectEpochMs == null) connectEpochMs = now;
  const elapsedMs = now - connectEpochMs;
  // eslint-disable-next-line no-console
  console.info(`[wallet-connect] +${elapsedMs}ms ${phase}`, {
    at: new Date(now).toISOString(),
    elapsedMs,
    ...data,
  });
}
