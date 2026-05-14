const flag = () =>
  typeof process !== "undefined" &&
  (process.env.SETTLEMENT_DEBUG === "1" || process.env.SETTLEMENT_DEBUG === "true");

export function logSettlementDev(phase: string, payload: Record<string, unknown>): void {
  if (!flag()) return;
  // eslint-disable-next-line no-console
  console.log(`[settlement] ${phase}`, payload);
}

export function logRefundDev(phase: string, payload: Record<string, unknown>): void {
  if (!flag()) return;
  // eslint-disable-next-line no-console
  console.log(`[refund] ${phase}`, payload);
}

export function warnSettlementReplay(message: string, payload: Record<string, unknown>): void {
  if (!flag()) return;
  // eslint-disable-next-line no-console
  console.warn(`[settlement] REPLAY_OR_DUPLICATE: ${message}`, payload);
}

export function warnOracleMismatch(payload: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.warn("[settlement] ORACLE_MISMATCH", payload);
}
