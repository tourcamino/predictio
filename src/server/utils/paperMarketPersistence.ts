import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import type { Market } from "~/data/mockMarkets";
import type { SeedMarket } from "~/data/seedMarkets";
import type { AzuroMarket } from "~/services/azuro";
import { db } from "~/server/db";
import { fetchAzuroGameDetail } from "~/services/azuro";

/** Min interval between Azuro GraphQL refreshes per market (ms). Override with AZURO_MARKET_REFRESH_MS. */
const AZURO_REFRESH_MS = Math.max(
  5_000,
  Number(process.env.AZURO_MARKET_REFRESH_MS) > 0
    ? Number(process.env.AZURO_MARKET_REFRESH_MS)
    : 45_000,
);

const lastAzuroGraphqlFetchAt = new Map<string, number>();

function seedStatusToPrismaMarketStatus(s: SeedMarket["status"]): string {
  switch (s) {
    case "resolved":
      return "resolved";
    case "locked":
    case "live":
      return "closed";
    default:
      return "open";
  }
}

function uiStatusToPrismaMarketStatus(s: Market["status"]): string {
  switch (s) {
    case "resolved":
      return "resolved";
    case "closed":
      return "closed";
    case "under_review":
      return "under_review";
    case "voided":
      return "voided";
    case "closing-soon":
    case "open":
    default:
      return "open";
  }
}

function azuroDetailSharedFields(detail: AzuroMarket) {
  const yesPrice = detail.outcomes[0]?.price ?? 0.5;
  const noPrice = detail.outcomes[1]?.price ?? 0.5;

  let winner: string | undefined;
  let resolvedAt: Date | undefined;
  if (detail.status === "resolved" && detail.azuroResult) {
    winner = detail.azuroResult === "home" ? "YES" : "NO";
    resolvedAt = new Date();
  }

  const outcomes: Prisma.InputJsonValue = [
    { price: yesPrice },
    { price: noPrice },
  ];

  return {
    sport: detail.sport,
    league: detail.competition,
    event: detail.event.name,
    marketType: "moneyline",
    outcomes,
    volume: detail.volume24h,
    predictions: detail.traders,
    closesAt: new Date(detail.endsAt),
    status: seedStatusToPrismaMarketStatus(detail.status),
    description: detail.description ?? detail.question,
    tags: detail.isFeatured ? ["featured"] : [],
    winner,
    resolvedAt,
    resolutionType: "automatic" as const,
  };
}

function azuroDetailToMarketCreateInput(marketId: string, detail: AzuroMarket) {
  return {
    id: marketId,
    ...azuroDetailSharedFields(detail),
  };
}

function azuroDetailToMarketUpdateInput(detail: AzuroMarket) {
  return azuroDetailSharedFields(detail);
}

function uiMarketSharedFields(m: Market) {
  const outcomes: Prisma.InputJsonValue = [
    { price: m.yesPrice },
    { price: m.noPrice },
  ];

  let winner: string | undefined;
  if (m.result === "yes") winner = "YES";
  else if (m.result === "no") winner = "NO";

  return {
    sport: m.sport,
    league: m.league,
    event: m.event ?? `${m.teamA} vs ${m.teamB}`,
    marketType: m.marketType,
    outcomes,
    volume: m.volume,
    predictions: m.predictions ?? m.traders ?? 0,
    closesAt: m.closesAt,
    status: uiStatusToPrismaMarketStatus(m.status),
    description: m.event ?? undefined,
    tags: m.isFeatured ? ["featured"] : [],
    winner,
    resolvedAt: m.resolved_at ?? undefined,
    resolutionType: "automatic" as const,
    resolutionReason: m.resolutionReason ?? undefined,
    disputeReason: m.disputeReason ?? undefined,
    voidedAt: m.voidedAt ?? undefined,
    refundAmount: m.refundAmount ?? undefined,
  };
}

function uiMarketToPrismaCreateData(marketId: string, m: Market) {
  return {
    id: marketId,
    ...uiMarketSharedFields(m),
  };
}

function uiMarketToPrismaUpdateData(m: Market) {
  return uiMarketSharedFields(m);
}

/**
 * Refreshes Azuro snapshot from GraphQL (upsert).
 * Skips refetch while cooldown active if a DB row already exists (burst trades).
 */
async function upsertAzuroMarketRow(marketId: string): Promise<void> {
  const now = Date.now();
  const lastFetch = lastAzuroGraphqlFetchAt.get(marketId) ?? 0;
  if (now - lastFetch < AZURO_REFRESH_MS) {
    const row = await db.market.findUnique({ where: { id: marketId } });
    if (row) return;
  }

  const gameId = marketId.replace(/^azuro-/, "");
  const detail = await fetchAzuroGameDetail(gameId);
  if (!detail) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Azuro market could not be loaded for persistence",
    });
  }

  try {
    await db.market.upsert({
      where: { id: marketId },
      create: azuroDetailToMarketCreateInput(marketId, detail),
      update: azuroDetailToMarketUpdateInput(detail),
    });
    lastAzuroGraphqlFetchAt.set(marketId, Date.now());
  } catch (err) {
    console.error("[upsertAzuroMarketRow] upsert failed:", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not persist market for order",
    });
  }
}

/**
 * Upserts `Market` before paper-trade `Order`s (FK).
 * Demo/mock: refreshes snapshot from the loaded `Market` on each trade.
 * Azuro: GraphQL upsert with cooldown (see AZURO_MARKET_REFRESH_MS).
 */
export async function ensureMarketRowForPaperTrade(
  marketId: string,
  market: Market,
): Promise<void> {
  if (marketId.startsWith("azuro-")) {
    try {
      await upsertAzuroMarketRow(marketId);
      return;
    } catch (err) {
      console.warn(
        "[ensureMarketRowForPaperTrade] Azuro GraphQL upsert failed; persisting UI snapshot instead:",
        marketId,
        err,
      );
      // Fall through — same row shape as non-Azuro markets; FK for orders must exist.
    }
  }

  try {
    await db.market.upsert({
      where: { id: marketId },
      create: uiMarketToPrismaCreateData(marketId, market),
      update: uiMarketToPrismaUpdateData(market),
    });
  } catch (err) {
    console.error("[ensureMarketRowForPaperTrade] upsert failed:", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not persist market for order",
    });
  }
}
