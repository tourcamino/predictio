import type { PortfolioPerformanceData } from "~/hooks/usePortfolioPerformanceHistory";
import { parseApiDate } from "~/utils/parseApiDate";

/** Express/JSON responses serialize Date as strings — hydrate before chart formatters. */
export function hydratePortfolioPerformance(
  raw: PortfolioPerformanceData,
): PortfolioPerformanceData {
  return {
    ...raw,
    dataPoints: (raw.dataPoints ?? []).map((p) => ({
      ...p,
      timestamp: parseApiDate(p.timestamp) ?? new Date(0),
    })),
    positionEvents: (raw.positionEvents ?? []).map((e) => ({
      ...e,
      timestamp: parseApiDate(e.timestamp) ?? new Date(0),
    })),
  };
}
