import type { Market as DbMarket } from "@prisma/client";
import { db } from "~/server/db";
import { createCaller } from "~/server/trpc/root";
import { loadMarketUiById } from "~/server/utils/loadMarketUi";
import { getMarketLifecycleState } from "~/utils/marketLifecycle";
import { canOpenNewPaperPosition } from "~/lib/market/marketLifecycleStateMachine";
import { rankPrismaMarketsByCuration } from "~/server/utils/marketCurationFromDb";
import {
  AUTONOMOUS_COPY_ANALYST_PROFILES,
  type AutonomousAnalystProfile,
  isFootballWeightedMarket,
  isSecondarySportOk,
} from "~/data/copyAnalystAutonomous";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function utcDayStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function normalizeWinnerForPaper(
  winner: string | null,
): "YES" | "NO" | null {
  if (!winner) return null;
  const w = winner.trim().toUpperCase();
  if (w === "YES" || w === "NO") return w;
  return null;
}

function pickOutcome(
  profile: AutonomousAnalystProfile,
  yesPrice: number,
  rng: () => number,
): "YES" | "NO" {
  if (profile.kind === "conservative") {
    return rng() < 0.5 ? "YES" : "NO";
  }
  if (profile.kind === "value") {
    if (yesPrice >= 0.55) return rng() < 0.72 ? "NO" : "YES";
    if (yesPrice <= 0.45) return rng() < 0.72 ? "YES" : "NO";
    return rng() < 0.5 ? "YES" : "NO";
  }
  // aggressive — mild momentum + noise
  const momentumSide: "YES" | "NO" =
    yesPrice >= 0.5 ? "YES" : "NO";
  if (rng() < 0.42) return momentumSide;
  return rng() < 0.5 ? "YES" : "NO";
}

function buildCandidatePool(
  rows: DbMarket[],
  profile: AutonomousAnalystProfile,
  rng: () => number,
): DbMarket[] {
  const football: DbMarket[] = [];
  const secondary: DbMarket[] = [];
  for (const r of rows) {
    if (isFootballWeightedMarket(r.sport, r.league)) football.push(r);
    else if (isSecondarySportOk(r.sport)) secondary.push(r);
  }

  if (profile.kind === "conservative") {
    return shuffleTail(football, rng, 10);
  }

  const wantFootball = rng() < profile.footballWeight;
  const primary = wantFootball ? football : secondary;
  const fallback = wantFootball && primary.length === 0 ? secondary : football;
  const pool = primary.length > 0 ? primary : fallback;
  return shuffleTail(pool, rng, 10);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Keep first `head` rows in curation order (featured-first); randomize tail for variety. */
function shuffleTail<T>(arr: T[], rng: () => number, head: number): T[] {
  if (arr.length <= head) return shuffle(arr, rng);
  const h = arr.slice(0, head);
  const t = shuffle(arr.slice(head), rng);
  return [...h, ...t];
}

/** Ensure paper wallets exist and stay tradeable without resetting healthy balances */
async function topUpAnalystBalances(wallets: string[]) {
  for (const w of wallets) {
    await db.user.upsert({
      where: { wallet: w },
      create: { wallet: w, virtualBalance: 50_000 },
      update: {},
    });
    const u = await db.user.findUnique({ where: { wallet: w } });
    if (u && u.virtualBalance < 800) {
      await db.user.update({
        where: { wallet: w },
        data: { virtualBalance: 15_000 },
      });
    }
  }
}

/** Autonomous bot positions only (`placePrediction` ids), so seed rows do not block new activity */
async function countBotOpenPositions(wallet: string): Promise<number> {
  return db.order.count({
    where: { wallet, status: "open", id: { startsWith: "pred-" } },
  });
}

async function countTodayBotTrades(wallet: string): Promise<number> {
  const start = utcDayStart();
  return db.order.count({
    where: {
      wallet,
      createdAt: { gte: start },
      id: { startsWith: "pred-" },
    },
  });
}

async function openMarketIdsForWallet(wallet: string): Promise<Set<string>> {
  const rows = await db.order.findMany({
    where: { wallet, status: "open" },
    select: { marketId: true },
  });
  return new Set(rows.map((r) => r.marketId));
}

async function syncResolvedMarketsForAutonomousAnalysts(
  caller: ReturnType<typeof createCaller>,
): Promise<number> {
  const wallets = AUTONOMOUS_COPY_ANALYST_PROFILES.map((p) => p.wallet);
  const stuck = await db.order.findMany({
    where: {
      status: "open",
      wallet: { in: wallets },
      market: { status: "resolved", winner: { not: null } },
    },
    include: {
      market: { select: { id: true, winner: true } },
    },
  });

  const byMarket = new Map<string, "YES" | "NO">();
  for (const o of stuck) {
    const win = normalizeWinnerForPaper(o.market.winner);
    if (win) byMarket.set(o.market.id, win);
  }

  let resolved = 0;
  for (const [marketId, winningOutcome] of byMarket) {
    try {
      await caller.resolvePaperPositions({ marketId, winningOutcome });
      resolved++;
    } catch (e) {
      console.warn("[AutonomousCopyAnalyst] resolvePaperPositions:", marketId, e);
    }
  }
  return resolved;
}

export async function runAutonomousCopyAnalystTick(): Promise<{
  opened: number;
  marketsResolved: number;
}> {
  const caller = createCaller({} as any);
  const wallets = AUTONOMOUS_COPY_ANALYST_PROFILES.map((p) => p.wallet);

  await topUpAnalystBalances(wallets);
  const marketsResolved =
    await syncResolvedMarketsForAutonomousAnalysts(caller);

  const openDbMarketsRaw = await db.market.findMany({
    where: {
      status: "open",
      closesAt: { gt: new Date(Date.now() + 5 * 60 * 1000) },
    },
    orderBy: { closesAt: "asc" },
    take: 120,
  });
  const openDbMarkets = rankPrismaMarketsByCuration(openDbMarketsRaw);

  if (openDbMarkets.length === 0) {
    await caller.updateAnalystMetrics({}).catch(() => {});
    return { opened: 0, marketsResolved };
  }

  let opened = 0;
  const tickSalt = Math.floor(Date.now() / (15 * 60 * 1000));

  for (let i = 0; i < AUTONOMOUS_COPY_ANALYST_PROFILES.length; i++) {
    const profile = AUTONOMOUS_COPY_ANALYST_PROFILES[i]!;
    const rng = mulberry32(
      [...profile.wallet].reduce((acc, c) => acc + c.charCodeAt(0), tickSalt * 9973 + i * 104729),
    );

    if (rng() > profile.attemptProbability) continue;

    const botOpen = await countBotOpenPositions(profile.wallet);
    if (botOpen >= profile.maxOpen) continue;

    const todayCount = await countTodayBotTrades(profile.wallet);
    if (todayCount >= profile.maxNewTradesPerDay) continue;

    const usedMarkets = await openMarketIdsForWallet(profile.wallet);
    const pool = buildCandidatePool(openDbMarkets, profile, rng);

    let placed = false;
    for (const row of pool) {
      if (usedMarkets.has(row.id)) continue;

      const ui = await loadMarketUiById(row.id);
      if (!ui) continue;
      const life = getMarketLifecycleState(ui);
      if (!canOpenNewPaperPosition(life)) continue;

      const y = ui.yesPrice;
      if (
        profile.kind !== "aggressive" &&
        (y < profile.avoidExtremeLow || y > profile.avoidExtremeHigh)
      ) {
        continue;
      }

      const outcome = pickOutcome(profile, y, rng);
      const stake =
        profile.stakeMin +
        Math.floor(rng() * (profile.stakeMax - profile.stakeMin + 1));

      try {
        await caller.placePrediction({
          marketId: row.id,
          outcome,
          amount: Math.min(stake, 10_000),
          walletAddress: profile.wallet,
          orderType: "MARKET",
        });
        opened++;
        placed = true;
        break;
      } catch (e) {
        console.warn(
          `[AutonomousCopyAnalyst] placePrediction skip ${row.id} (${profile.displayName}):`,
          (e as Error)?.message ?? e,
        );
      }
    }

    if (!placed) {
      /* no-op */
    }
  }

  await caller.updateAnalystMetrics({}).catch(() => {});

  return { opened, marketsResolved };
}
