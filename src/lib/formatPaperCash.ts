/** Display paper USDC without flashing $0 during load/sync. */
export function formatPaperCashDisplay(
  cashUsdc: number | null,
  isBalanceLoading: boolean,
  opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  if (isBalanceLoading || cashUsdc === null) {
    return "···";
  }
  return cashUsdc.toLocaleString("en-US", {
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
    maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
  });
}
