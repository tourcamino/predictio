import type { Market as PrismaMarketRow } from "@prisma/client";
import { type Market, SPORT_METADATA } from "~/data/mockMarkets";

export function parseYesNoPrices(outcomes: unknown): {
  yesPrice: number;
  noPrice: number;
} {
  if (outcomes == null) return { yesPrice: 0.5, noPrice: 0.5 };
  if (Array.isArray(outcomes)) {
    const yesPrice = Number(outcomes[0]?.price ?? 0.5);
    const noPrice = Number(
      outcomes[1]?.price ?? Math.max(0.01, Math.min(0.99, 1 - yesPrice)),
    );
    return { yesPrice, noPrice };
  }
  if (typeof outcomes === "object") {
    const o = outcomes as Record<string, unknown>;
    const y = o.yesPrice;
    const n = o.noPrice;
    if (typeof y === "number" && typeof n === "number") {
      return { yesPrice: y, noPrice: n };
    }
  }
  return { yesPrice: 0.5, noPrice: 0.5 };
}

export function parseTeamsFromEvent(event: string): {
  teamA: string;
  teamB: string;
} {
  const parts = event
    .split(/\s+vs\.?\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { teamA: parts[0]!, teamB: parts[parts.length - 1]! };
  }
  return { teamA: "Team A", teamB: "Team B" };
}

export function sportEmojiFromLabel(sport: string): string {
  const key = sport.toLowerCase().replace(/\s+/g, "");
  const direct = SPORT_METADATA[key]?.emoji;
  if (direct) return direct;
  const entry = Object.entries(SPORT_METADATA).find(
    ([k]) => k.replace(/\s+/g, "") === key,
  );
  return entry?.[1]?.emoji ?? "🎯";
}

export function parseKickoff(outcomes: unknown, fallback: Date): Date {
  if (outcomes && typeof outcomes === "object" && !Array.isArray(outcomes)) {
    const o = outcomes as Record<string, unknown>;
    const raw = o.startAt ?? o.start_time ?? o.kickoff;
    if (typeof raw === "string") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return fallback;
}

export function mapDbStatusToUi(status: string, closesAt: Date): Market["status"] {
  if (status === "resolved") return "resolved";
  if (status === "under_review") return "under_review";
  if (status === "voided") return "voided";
  if (status === "closed") return "closed";
  const msToClose = closesAt.getTime() - Date.now();
  if (msToClose > 0 && msToClose < 2 * 60 * 60 * 1000) return "closing-soon";
  return "open";
}

export function prismaMarketToUi(row: PrismaMarketRow): Market {
  const { yesPrice, noPrice } = parseYesNoPrices(row.outcomes);
  const { teamA, teamB } = parseTeamsFromEvent(row.event);
  const start_time = parseKickoff(row.outcomes, row.closesAt);

  let result: "yes" | "no" | undefined;
  if (row.status === "resolved" && row.winner) {
    const w = row.winner.trim().toUpperCase();
    const a = teamA.toLowerCase();
    const b = teamB.toLowerCase();
    const cand = row.winner.trim().toLowerCase();
    if (w === "YES") result = "yes";
    else if (w === "NO") result = "no";
    else if (cand === a) result = "yes";
    else if (cand === b) result = "no";
  }

  return {
    id: row.id,
    sport: row.sport,
    sportEmoji: sportEmojiFromLabel(row.sport),
    league: row.league,
    region: "International",
    event: row.event,
    teamA,
    teamB,
    marketType: (row.marketType as Market["marketType"]) ?? "moneyline",
    yesPrice,
    noPrice,
    volume: row.volume,
    closesAt: row.closesAt,
    traders: row.predictions,
    isFeatured: row.tags.includes("featured"),
    status: mapDbStatusToUi(row.status, row.closesAt),
    resolutionReason: row.resolutionReason ?? undefined,
    disputeReason: row.disputeReason ?? undefined,
    voidedAt: row.voidedAt ?? undefined,
    refundAmount: row.refundAmount ?? undefined,
    percentA: Math.round(yesPrice * 100),
    percentB: Math.round(noPrice * 100),
    predictions: row.predictions,
    start_time,
    result,
    resolved_at: row.resolvedAt ?? undefined,
  };
}
