import type { Market as PrismaMarketRow } from "@prisma/client";
import { type Market, SPORT_METADATA } from "~/data/mockMarkets";
import { deriveMarketLifecycleFromDbRow } from "~/lib/market/marketLifecycleStateMachine";
import {
  isPaperAmmOutcomes,
  pricesFromOutcomes,
  DEFAULT_PAPER_POOL_USDC,
} from "~/lib/amm/paperAmmEngine";
import { gradeMarketHealth } from "~/lib/market/marketHealthGrade";

export function normalizeYesNoUnitPrices(yesRaw: number, noRaw: number | undefined): {
  yesPrice: number;
  noPrice: number;
} {
  let yes = Number(yesRaw);
  let no = noRaw != null ? Number(noRaw) : NaN;
  if (!Number.isFinite(yes)) yes = 0.5;
  // API/DB sometimes stores 0–100; coerce to 0–1
  if (yes > 1 || (Number.isFinite(no) && no > 1)) {
    yes = yes > 1 ? yes / 100 : yes;
    no = Number.isFinite(no) && no > 1 ? no / 100 : no;
  }
  if (!Number.isFinite(no)) {
    no = Math.max(0.01, Math.min(0.99, 1 - yes));
  }
  yes = Math.max(0.001, Math.min(0.999, yes));
  no = Math.max(0.001, Math.min(0.999, no));
  const sum = yes + no;
  if (sum > 0 && Math.abs(sum - 1) > 0.02) {
    yes /= sum;
    no /= sum;
  }
  return {
    yesPrice: Math.max(0.01, Math.min(0.99, yes)),
    noPrice: Math.max(0.01, Math.min(0.99, no)),
  };
}

export function parseYesNoPrices(outcomes: unknown): {
  yesPrice: number;
  noPrice: number;
  drawPrice: number | null;
} {
  if (isPaperAmmOutcomes(outcomes)) {
    return {
      yesPrice: outcomes.yes.price,
      noPrice: outcomes.no.price,
      drawPrice: outcomes.draw?.price ?? null,
    };
  }
  if (outcomes == null) return { yesPrice: 0.5, noPrice: 0.5, drawPrice: null };
  if (Array.isArray(outcomes)) {
    const yesRaw = Number(outcomes[0]?.price ?? 0.5);
    const noRaw = outcomes[1]?.price != null ? Number(outcomes[1].price) : undefined;
    const { yesPrice, noPrice } = normalizeYesNoUnitPrices(yesRaw, noRaw);
    return { yesPrice, noPrice, drawPrice: null };
  }
  if (typeof outcomes === "object") {
    const o = outcomes as Record<string, unknown>;
    const y = o.yesPrice;
    const n = o.noPrice;
    if (typeof y === "number") {
      const { yesPrice, noPrice } = normalizeYesNoUnitPrices(
        y,
        typeof n === "number" ? n : undefined,
      );
      return { yesPrice, noPrice, drawPrice: null };
    }
  }
  return { yesPrice: 0.5, noPrice: 0.5, drawPrice: null };
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
  const legacyOracle = parseYesNoPrices(row.outcomes);
  const priced = pricesFromOutcomes(
    row.outcomes,
    { yes: legacyOracle.yesPrice, no: legacyOracle.noPrice, draw: legacyOracle.drawPrice },
    isPaperAmmOutcomes(row.outcomes)
      ? row.outcomes.amm.poolLiquidityUsd
      : DEFAULT_PAPER_POOL_USDC,
  );
  const yesPrice = priced.yesPrice;
  const noPrice = priced.noPrice;
  const drawFromOutcomes = priced.drawPrice;
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

  const lifecycleState = deriveMarketLifecycleFromDbRow(row);
  const ammMeta = isPaperAmmOutcomes(row.outcomes) ? row.outcomes.amm : null;
  const poolUsd = ammMeta?.poolLiquidityUsd ?? DEFAULT_PAPER_POOL_USDC;
  const openInterestGuess = row.volume > 0 ? Math.min(row.volume, poolUsd) : 0;
  const spotImb =
    ammMeta != null
      ? (() => {
          const total = ammMeta.flowYesUsd + ammMeta.flowNoUsd + ammMeta.flowDrawUsd;
          return total > 0
            ? Math.round(((ammMeta.flowYesUsd - ammMeta.flowNoUsd) / total) * 10000) / 100
            : 0;
        })()
      : 0;
  const utilPct =
    poolUsd > 0 ? Math.round((openInterestGuess / poolUsd) * 10000) / 100 : 0;
  const health = gradeMarketHealth({
    quoteFreshMs: ammMeta?.lastTradeAt
      ? Date.now() - Date.parse(ammMeta.lastTradeAt)
      : 45_000,
    openInterestUsd: openInterestGuess,
    poolLiquidityUsd: poolUsd,
    recentFillCount24h: row.predictions > 0 ? Math.min(row.predictions, 20) : 0,
    traderCount: row.predictions,
    oracleState: row.status === "resolved" ? "terminal" : "prematch",
    isTradable: row.status === "open",
    spreadPct: 1.2,
  });

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
    lifecycleState,
    resolutionReason: row.resolutionReason ?? undefined,
    disputeReason: row.disputeReason ?? undefined,
    voidedAt: row.voidedAt ?? undefined,
    refundAmount: row.refundAmount ?? undefined,
    percentA: Math.round(yesPrice * 100),
    percentB: Math.round(noPrice * 100),
    percentDraw: drawFromOutcomes != null ? Math.round(drawFromOutcomes * 100) : undefined,
    predictions: row.predictions,
    start_time,
    result,
    resolved_at: row.resolvedAt ?? undefined,
    liquidity: {
      totalPool: poolUsd,
      yesSide: poolUsd * yesPrice,
      noSide: poolUsd * noPrice,
      volume24h: row.volume,
      trades24h: row.predictions,
      bidPrice: Math.max(0.01, yesPrice - 0.005),
      askPrice: Math.min(0.99, yesPrice + 0.005),
      spread: 0.01,
      spreadPct: 1.2,
      botActive: false,
    },
    paperAmm: ammMeta
      ? {
          poolLiquidityUsd: poolUsd,
          utilizationPct: utilPct,
          imbalancePct: spotImb,
          spreadPct: 1.2,
          flowYesUsd: ammMeta.flowYesUsd,
          flowNoUsd: ammMeta.flowNoUsd,
          healthGrade: health.grade,
          healthLabel: health.label,
          lastTradeAt: ammMeta.lastTradeAt ? new Date(ammMeta.lastTradeAt) : undefined,
        }
      : undefined,
  };
}
