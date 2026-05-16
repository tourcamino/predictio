/**
 * Temporary wallet-connect diagnostics.
 * Enable in production: `VITE_WALLET_CONNECT_TRACE=1`
 * Always logs in dev builds.
 */
export function walletConnectTrace(
  phase: string,
  data?: Record<string, unknown>,
): void {
  const enabled =
    import.meta.env.DEV || import.meta.env.VITE_WALLET_CONNECT_TRACE === "1";
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.info(`[wallet-connect] ${phase}`, {
    at: new Date().toISOString(),
    ...data,
  });
}
