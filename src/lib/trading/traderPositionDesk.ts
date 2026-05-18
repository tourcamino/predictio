import type { Market } from "~/data/mockMarkets";
import type { UserOrderRow } from "~/lib/position/derivePositionLifecycle";
import {
  derivePositionLifecycle,
  isAwaitingOracleSettlement,
} from "~/lib/position/derivePositionLifecycle";
import type { Position } from "~/store/tradingStore";
import {
  deriveLivePositionFromQuote,
  sideAwareQuoteFromMarket,
} from "~/lib/trading/deriveLivePositionFromQuote";
import type { MarketPrice } from "~/store/tradingStore";
import { mapTradingPositionToOrderRow } from "~/lib/trading/mapTradingPositionToOrderRow";
import {
  deriveTraderDeskPsychology,
  type TraderDeskPsychology,
} from "~/lib/trading/traderPositionPsychology";

export type TraderMatchPhase =
  | "scheduled"
  | "live"
  | "closed"
  | "awaiting_oracle"
  | "settled"
  | "cancelled"
  | "refunded";

export type TraderSortSection =
  | "live_now"
  | "ending_soon"
  | "pnl_swing"
  | "settling"
  | "open"
  | "other";

export type TraderDeskRow = {
  position: Position;
  order: UserOrderRow | null;
  market: Market | null;
  lifecycle: ReturnType<typeof derivePositionLifecycle>;
  matchPhase: TraderMatchPhase;
  matchPhaseLabel: string;
  sortSection: TraderSortSection;
  entryProbPct: number;
  currentProbPct: number;
  probDeltaPct: number;
  displayPnl: number;
  displayPnlPct: number;
  displayValue: number;
  maxPayout: number;
  invested: number;
  countdownLabel: string | null;
  oracleMinimal: string | null;
  favorability: "favor" | "against" | "flat";
  canSell: boolean;
  psychology: TraderDeskPsychology;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function deriveTraderMatchPhase(
  order: UserOrderRow,
  market: Market | null | undefined,
): { phase: TraderMatchPhase; label: string } {
  if (order.status === "resolved" || order.status === "closed") {
    return { phase: "settled", label: "Settled" };
  }
  if (order.status === "cancelled") {
    return { phase: "cancelled", label: "Cancelled" };
  }
  const life = derivePositionLifecycle(order, market);
  if (market?.status === "resolved" || life.eventPhase === "settled") {
    return { phase: "settled", label: "Settled" };
  }
  if (isAwaitingOracleSettlement(order, market) || life.settlementPending) {
    return { phase: "awaiting_oracle", label: "Awaiting oracle" };
  }
  const now = Date.now();
  const closes = life.closesAt?.getTime();
  const started = life.kickoffAt?.getTime();
  if (closes != null && closes <= now) {
    return { phase: "closed", label: "Full time" };
  }
  if (started != null && started <= now && life.eventPhase === "live") {
    return { phase: "live", label: "Live" };
  }
  if (started != null && started > now) {
    return { phase: "scheduled", label: "Scheduled" };
  }
  if (life.eventPhase === "live") {
    return { phase: "live", label: "Live" };
  }
  return { phase: "scheduled", label: "Scheduled" };
}

function formatCountdown(closesAt: Date | null, kickoffAt: Date | null): string | null {
  const target = closesAt ?? kickoffAt;
  if (!target) return null;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function buildTraderDeskRow(
  position: Position,
  market: Market | null,
  order: UserOrderRow | null,
  marketPrice?: MarketPrice,
): TraderDeskRow {
  const quote =
    market != null
      ? sideAwareQuoteFromMarket(position, market)
      : marketPrice;
  const live = deriveLivePositionFromQuote(position, quote);
  const terminal =
    position.status === "resolved" ||
    position.status === "cancelled" ||
    position.status === "refunded";
  const displayPnl = terminal ? position.unrealizedPnl : live.unrealizedPnl;
  const displayPnlPct = terminal ? position.unrealizedPnlPct : live.unrealizedPnlPct;
  const displayValue = terminal ? position.currentValue : live.currentValue;
  const invested = position.costBasis;
  const maxPayout = position.shares;

  const orderRow = order ?? mapTradingPositionToOrderRow(position);
  const lifecycle = derivePositionLifecycle(orderRow, market);

  const { phase, label } = deriveTraderMatchPhase(orderRow, market);

  const entryProbPct = Math.round(lifecycle.entryProbability * 100);
  const currentProbPct = Math.round(lifecycle.currentProbability * 100);
  const probDeltaPct = currentProbPct - entryProbPct;

  let favorability: TraderDeskRow["favorability"] = "flat";
  if (probDeltaPct > 1) favorability = "favor";
  else if (probDeltaPct < -1) favorability = "against";

  let sortSection: TraderSortSection = "open";
  const now = Date.now();
  if (phase === "awaiting_oracle" || lifecycle.settlementPending) {
    sortSection = "settling";
  } else if (phase === "live") {
    sortSection = "live_now";
  } else if (
    lifecycle.closesAt &&
    lifecycle.closesAt.getTime() - now > 0 &&
    lifecycle.closesAt.getTime() - now < TWO_HOURS_MS
  ) {
    sortSection = "ending_soon";
  } else if (Math.abs(displayPnlPct) >= 8) {
    sortSection = "pnl_swing";
  }

  const oracleMinimal =
    phase === "awaiting_oracle"
      ? "Oracle pending"
      : phase === "closed"
        ? "FT · oracle"
        : null;

  const baseRow = {
    position,
    order,
    market,
    lifecycle,
    matchPhase: phase,
    matchPhaseLabel: label,
    sortSection,
    entryProbPct,
    currentProbPct,
    probDeltaPct,
    displayPnl,
    displayPnlPct,
    displayValue,
    maxPayout,
    invested,
    countdownLabel: formatCountdown(lifecycle.closesAt, lifecycle.kickoffAt),
    oracleMinimal,
    favorability,
    canSell:
      orderRow.status === "open" &&
      lifecycle.closeable &&
      phase !== "settled" &&
      phase !== "awaiting_oracle",
  };

  return {
    ...baseRow,
    psychology: deriveTraderDeskPsychology(baseRow, marketPrice),
  };
}

const SECTION_ORDER: TraderSortSection[] = [
  "live_now",
  "ending_soon",
  "pnl_swing",
  "settling",
  "open",
  "other",
];

const SECTION_LABELS: Record<TraderSortSection, string> = {
  live_now: "Live now",
  ending_soon: "Ending soon",
  pnl_swing: "High P&L swing",
  settling: "Settling",
  open: "Open",
  other: "Other",
};

export function sortTraderDeskRows(rows: TraderDeskRow[]): TraderDeskRow[] {
  const bySection = new Map<TraderSortSection, TraderDeskRow[]>();
  for (const s of SECTION_ORDER) bySection.set(s, []);
  for (const r of rows) {
    const list = bySection.get(r.sortSection) ?? [];
    list.push(r);
    bySection.set(r.sortSection, list);
  }
  for (const [, list] of bySection) {
    list.sort((a, b) => b.displayPnl - a.displayPnl);
  }
  const out: TraderDeskRow[] = [];
  for (const s of SECTION_ORDER) {
    out.push(...(bySection.get(s) ?? []));
  }
  return out;
}

export function groupTraderDeskRows(
  rows: TraderDeskRow[],
): { section: TraderSortSection; label: string; rows: TraderDeskRow[] }[] {
  const sorted = sortTraderDeskRows(rows);
  const groups: { section: TraderSortSection; label: string; rows: TraderDeskRow[] }[] =
    [];
  let current: TraderSortSection | null = null;
  for (const row of sorted) {
    if (row.sortSection !== current) {
      current = row.sortSection;
      groups.push({
        section: current,
        label: SECTION_LABELS[current],
        rows: [],
      });
    }
    groups[groups.length - 1]!.rows.push(row);
  }
  return groups.filter((g) => g.rows.length > 0);
}

export function aggregateDeskStats(rows: TraderDeskRow[]) {
  const openRows = rows.filter(
    (r) =>
      r.position.status !== "resolved" &&
      r.position.status !== "cancelled" &&
      r.position.status !== "refunded",
  );
  const totalPnl = openRows.reduce((s, r) => s + r.displayPnl, 0);
  const totalInvested = openRows.reduce((s, r) => s + r.invested, 0);
  const liveCount = openRows.filter((r) => r.matchPhase === "live").length;
  const settlingCount = openRows.filter(
    (r) => r.matchPhase === "awaiting_oracle" || r.sortSection === "settling",
  ).length;
  return {
    openCount: openRows.length,
    totalPnl,
    totalPnlPct: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
    liveCount,
    settlingCount,
  };
}
