/** Coerce API JSON dates (ISO strings) into real Date instances for chart/UI formatters. */
export function parseApiDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatApiDate(
  value: unknown,
  locale = "en-US",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = parseApiDate(value);
  if (!d) return "—";
  return d.toLocaleDateString(locale, options);
}

export function formatApiDateTime(
  value: unknown,
  locale = "en-US",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = parseApiDate(value);
  if (!d) return "—";
  return d.toLocaleString(locale, options);
}
