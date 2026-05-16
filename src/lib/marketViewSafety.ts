/**
 * Safe string helpers + telemetry for homepage/market view layers.
 */
import type { AzuroMarket } from "~/services/azuro";

export function safeString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

export function safeLower(value: unknown, fallback = ""): string {
  return safeString(value, fallback).toLowerCase();
}

/** AzuroMarket uses `competition`; legacy Market uses `league`. */
export function marketCompetitionLabel(
  m: Pick<AzuroMarket, "competition" | "event"> & { league?: string },
): string {
  return safeString(m.competition ?? (m as { league?: string }).league ?? m.event?.name, "unknown");
}

export type BrokenMarketReport = {
  gameId: string;
  title: string;
  field: string;
  reason: string;
};

export function auditAzuroMarketForView(m: AzuroMarket): BrokenMarketReport | null {
  const gameId = safeString(m.azuroGameId ?? m.id, "?");
  const title = safeString(m.event?.name ?? m.question, gameId);

  if (!safeString(m.sport)) {
    return { gameId, title, field: "sport", reason: "missing sport slug" };
  }
  if (!marketCompetitionLabel(m)) {
    return { gameId, title, field: "competition", reason: "missing competition/league" };
  }
  if (!safeString(m.event?.startsAt) && !safeString(m.endsAt)) {
    return { gameId, title, field: "startsAt", reason: "missing kickoff time" };
  }
  return null;
}

export function logBrokenMarketDetected(report: BrokenMarketReport, tag: string): void {
  console.warn(
    JSON.stringify({
      tag: "BROKEN_MARKET_DETECTED",
      context: tag,
      gameId: report.gameId,
      title: report.title,
      field: report.field,
      reason: report.reason,
    }),
  );
}

export function logInvalidViewModel(
  context: string,
  details: Record<string, unknown>,
): void {
  console.warn(
    JSON.stringify({
      tag: "INVALID_VIEW_MODEL",
      context,
      ...details,
    }),
  );
}

export function filterValidAzuroMarketsForView(
  markets: readonly AzuroMarket[],
  context: string,
): AzuroMarket[] {
  const out: AzuroMarket[] = [];
  for (const m of markets) {
    const broken = auditAzuroMarketForView(m);
    if (broken) {
      logBrokenMarketDetected(broken, context);
      continue;
    }
    out.push(m);
  }
  if (out.length < markets.length) {
    logInvalidViewModel(context, {
      dropped: markets.length - out.length,
      kept: out.length,
    });
  }
  return out;
}
