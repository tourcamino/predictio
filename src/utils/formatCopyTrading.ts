/** Display helpers for copy-trading / analyst cards (readable %, compact addresses). */

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** ROI as signed percent, 1 decimal (e.g. +11.3%, -4.2%). */
export function formatRoiPct(roi: unknown): string {
  const n = toFiniteNumber(roi, 0);
  const rounded = Math.round(n * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

/** Tailwind text classes for signed ROI (cards, headers, summaries). */
export function roiTextClass(roi: unknown): string {
  const n = toFiniteNumber(roi, 0);
  if (n > 0) return "text-brand-green";
  if (n < 0) return "text-red-400";
  return "text-gray-300";
}

/** Win rate percent, 1 decimal, no leading +. */
export function formatWinRatePct(winRate: unknown): string {
  const n = toFiniteNumber(winRate, 0);
  const clamped = Math.min(100, Math.max(0, n));
  return `${(Math.round(clamped * 10) / 10).toFixed(1)}%`;
}

export function shortenWallet(
  wallet: string,
  startChars = 6,
  endChars = 4,
): string {
  const w = (wallet || "").trim();
  if (w.length <= startChars + endChars + 1) return w;
  return `${w.slice(0, startChars)}…${w.slice(-endChars)}`;
}
