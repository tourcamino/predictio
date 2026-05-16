import type { CuratedEvent, Market as MarketRow, PrismaClient } from "@prisma/client";
import {
  fetchAzuro1x2DecimalOddsByGameId,
  fetchGameByGameId,
} from "../services/azuroCuratorGraphql";

export function normalizeMarketIdParam(marketId: string): string {
  const id = marketId.trim();
  if (id.startsWith("azuro-")) return id;
  if (/^\d+$/.test(id)) return `azuro-${id}`;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return `azuro-${id}`;
  }
  return id;
}

function normalizeYesNoUnitPrices(yesRaw: number, noRaw: number | undefined): {
  yesPrice: number;
  noPrice: number;
} {
  let yes = Number(yesRaw);
  let no = noRaw != null ? Number(noRaw) : NaN;
  if (!Number.isFinite(yes)) yes = 0.5;
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

function parseYesNoFromOutcomes(outcomes: unknown): { yesPrice: number; noPrice: number } {
  if (outcomes == null) return { yesPrice: 0.5, noPrice: 0.5 };
  if (Array.isArray(outcomes)) {
    const yesRaw = Number((outcomes[0] as { price?: number })?.price ?? 0.5);
    const noRaw =
      outcomes[1]?.price != null ? Number((outcomes[1] as { price?: number }).price) : undefined;
    return normalizeYesNoUnitPrices(yesRaw, noRaw);
  }
  return { yesPrice: 0.5, noPrice: 0.5 };
}

function mapDbStatusToUi(status: string, closesAt: Date): string {
  if (status === "resolved") return "resolved";
  if (status === "closed" || status === "under_review" || status === "voided") return status;
  const msToClose = closesAt.getTime() - Date.now();
  if (msToClose > 0 && msToClose < 2 * 60 * 60 * 1000) return "closing-soon";
  return "open";
}

function curatedStatusToUi(row: CuratedEvent): string {
  if (row.status === "RESOLVED") return "resolved";
  if (row.status === "LOCKED") return "closed";
  const now = Date.now();
  const lockMs = row.lockedAt.getTime();
  if (now >= lockMs) return "closed";
  const msToLock = lockMs - now;
  if (msToLock > 0 && msToLock < 2 * 60 * 60 * 1000) return "closing-soon";
  return "open";
}

export type PaperMarketSnapshot = {
  id: string;
  yesPrice: number;
  noPrice: number;
  percentDraw: number | null;
  closesAt: Date;
  start_time: Date;
  status: string;
  event: string;
  teamA: string;
  teamB: string;
  sport: string;
  volume: number;
  traders: number;
};

function curatedToSnapshot(row: CuratedEvent, canonicalId: string): PaperMarketSnapshot {
  const status = curatedStatusToUi(row);
  const ho = row.homeOdds;
  const doo = row.drawOdds;
  const ao = row.awayOdds;
  let yesPrice = 0.45;
  let noPrice = 0.3;
  let percentDraw: number | null = 25;

  if (ho != null && doo != null && ao != null && ho > 0 && doo > 0 && ao > 0) {
    const ih = 1 / ho;
    const id = 1 / doo;
    const ia = 1 / ao;
    const t = ih + id + ia;
    if (t > 0) {
      yesPrice = Math.max(0.01, Math.min(0.98, ih / t));
      noPrice = Math.max(0.01, Math.min(0.98, ia / t));
      percentDraw = Math.round((id / t) * 100);
    }
  } else if (ho != null && ao != null && ho > 0 && ao > 0) {
    const sportKey = String(row.sportSlug ?? row.sport ?? "football").toLowerCase();
    const isFootball = sportKey === "football" || sportKey === "soccer";
    if (isFootball) {
      const drawDec = 3.35;
      const ih = 1 / ho;
      const id = 1 / drawDec;
      const ia = 1 / ao;
      const t = ih + id + ia;
      if (t > 0) {
        yesPrice = Math.max(0.01, Math.min(0.98, ih / t));
        noPrice = Math.max(0.01, Math.min(0.98, ia / t));
        percentDraw = Math.round((id / t) * 100);
      }
    } else {
      const ih = 1 / ho;
      const ia = 1 / ao;
      const t = ih + ia;
      if (t > 0) {
        yesPrice = Math.max(0.01, Math.min(0.98, ih / t));
        noPrice = Math.max(0.01, Math.min(0.98, ia / t));
        percentDraw = null;
      }
    }
  }

  return {
    id: canonicalId,
    yesPrice,
    noPrice,
    percentDraw,
    closesAt: row.lockedAt,
    start_time: row.startsAt,
    status,
    event: row.title,
    teamA: row.homeTeam,
    teamB: row.awayTeam,
    sport: "football",
    volume: 25_000,
    traders: 150,
  };
}

function prismaRowToSnapshot(row: MarketRow): PaperMarketSnapshot {
  const { yesPrice, noPrice } = parseYesNoFromOutcomes(row.outcomes);
  const parts = row.event.split(/\s+vs\.?\s+/i).map((s) => s.trim()).filter(Boolean);
  const teamA = parts.length >= 2 ? parts[0]! : "Team A";
  const teamB = parts.length >= 2 ? parts[parts.length - 1]! : "Team B";
  return {
    id: row.id,
    yesPrice,
    noPrice,
    percentDraw: null,
    closesAt: row.closesAt,
    start_time: row.closesAt,
    status: mapDbStatusToUi(row.status, row.closesAt),
    event: row.event,
    teamA,
    teamB,
    sport: row.sport,
    volume: row.volume,
    traders: row.predictions,
  };
}

export async function loadPaperMarketSnapshot(
  prisma: PrismaClient,
  rawMarketId: string,
): Promise<PaperMarketSnapshot | null> {
  const marketId = normalizeMarketIdParam(rawMarketId);

  try {
    const row = await prisma.market.findUnique({ where: { id: marketId } });
    if (row) return prismaRowToSnapshot(row);
  } catch (err) {
    console.warn("[loadPaperMarketSnapshot] DB market lookup skipped:", marketId, err);
  }

  const azuroStrip = marketId.startsWith("azuro-") ? marketId.slice("azuro-".length) : null;

  try {
    const orClause: Array<{ gameId: string } | { id: string }> = [
      { id: marketId },
      { gameId: marketId },
    ];
    if (azuroStrip) {
      orClause.push({ gameId: azuroStrip }, { id: azuroStrip });
    }

    const curated = await prisma.curatedEvent.findFirst({
      where: { isActive: true, OR: orClause },
    });

    if (curated) {
      return curatedToSnapshot(curated, marketId);
    }
  } catch (err) {
    console.warn("[loadPaperMarketSnapshot] curated lookup skipped:", marketId, err);
  }

  if (!azuroStrip) return null;

  try {
    const [odds, game] = await Promise.all([
      fetchAzuro1x2DecimalOddsByGameId(azuroStrip),
      fetchGameByGameId(azuroStrip),
    ]);
    if (!odds || (!odds.homeOdds && !odds.awayOdds)) return null;
    const ho = odds.homeOdds ?? 0;
    const ao = odds.awayOdds ?? 0;
    const doo = odds.drawOdds;
    let snap: PaperMarketSnapshot;
    if (doo != null && ho > 0 && doo > 0 && ao > 0) {
      const ih = 1 / ho;
      const id = 1 / doo;
      const ia = 1 / ao;
      const t = ih + id + ia;
      const yesPrice = Math.max(0.01, Math.min(0.98, ih / t));
      const noPrice = Math.max(0.01, Math.min(0.98, ia / t));
      const percentDraw = Math.round((id / t) * 100);
      const title = game?.title ?? `Game ${azuroStrip}`;
      const startsAt = game ? new Date(game.startsAt) : new Date();
      const lockedAt = new Date(startsAt.getTime() - 5 * 60 * 1000);
      snap = {
        id: marketId,
        yesPrice,
        noPrice,
        percentDraw,
        closesAt: lockedAt,
        start_time: startsAt,
        status: "open",
        event: title,
        teamA: game?.homeTeam ?? "Home",
        teamB: game?.awayTeam ?? "Away",
        sport: "football",
        volume: 25_000,
        traders: 150,
      };
    } else if (ho > 0 && ao > 0) {
      const ih = 1 / ho;
      const ia = 1 / ao;
      const t = ih + ia;
      const yesPrice = Math.max(0.01, Math.min(0.98, ih / t));
      const noPrice = Math.max(0.01, Math.min(0.98, ia / t));
      const title = game?.title ?? `Game ${azuroStrip}`;
      const startsAt = game ? new Date(game.startsAt) : new Date();
      const lockedAt = new Date(startsAt.getTime() - 5 * 60 * 1000);
      snap = {
        id: marketId,
        yesPrice,
        noPrice,
        percentDraw: null,
        closesAt: lockedAt,
        start_time: startsAt,
        status: "open",
        event: title,
        teamA: game?.homeTeam ?? "Home",
        teamB: game?.awayTeam ?? "Away",
        sport: "football",
        volume: 25_000,
        traders: 150,
      };
    } else {
      return null;
    }
    return snap;
  } catch (err) {
    console.warn("[loadPaperMarketSnapshot] Azuro fallback failed:", marketId, err);
  }

  return null;
}

export async function ensurePaperMarketRow(
  prisma: PrismaClient,
  marketId: string,
  m: PaperMarketSnapshot,
): Promise<void> {
  const outcomes: unknown = [{ price: m.yesPrice }, { price: m.noPrice }];
  await prisma.market.upsert({
    where: { id: marketId },
    create: {
      id: marketId,
      sport: m.sport,
      league: "Football",
      event: m.event,
      marketType: "moneyline",
      outcomes: outcomes as any,
      volume: m.volume,
      predictions: m.traders,
      closesAt: m.closesAt,
      status: m.status === "resolved" ? "resolved" : "open",
      tags: [],
    },
    update: {
      sport: m.sport,
      event: m.event,
      outcomes: outcomes as any,
      closesAt: m.closesAt,
      status: m.status === "resolved" ? "resolved" : "open",
    },
  });
}

export function marketEventLabel(m: PaperMarketSnapshot): string {
  return m.event ?? `${m.teamA} vs ${m.teamB}`;
}
