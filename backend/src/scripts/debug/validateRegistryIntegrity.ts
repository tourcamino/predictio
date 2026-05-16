/**
 * Post-cutover validation: event reality, time integrity, registry ↔ API ↔ LP consistency.
 *
 * Usage:
 *   API_URL=https://api.predictio.live npx tsx src/scripts/debug/validateRegistryIntegrity.ts
 */
import { PrismaClient } from "@prisma/client";
import { resolveCanonicalLiquidityState } from "../../services/canonicalLiquidityState";
import { curatedMarketIdFromGameId } from "../../services/canonicalLiquidityAllocation";

const API_URL = (process.env.API_URL ?? "https://api.predictio.live").replace(/\/$/, "");
const SAMPLE_GAME_IDS = [
  "1006000000000029560323",
  "1006000000000029560322",
  "1006000000000083636687",
];

type ApiMarket = {
  gameId: string;
  title: string;
  leagueName: string;
  country: string;
  startsAt: string;
  lockedAt: string;
  timeToLock: number;
  status: string;
  homeOdds: number | null;
  drawOdds: number | null;
  awayOdds: number | null;
  sport?: string;
  sportSlug?: string;
  paperLiquidityAllocation?: number | null;
};

function secLabel(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

function auditTimeIntegrity(m: ApiMarket, nowMs: number): string[] {
  const issues: string[] = [];
  const kickMs = Date.parse(m.startsAt);
  const lockMs = Date.parse(m.lockedAt);
  if (!Number.isFinite(kickMs)) issues.push("invalid startsAt");
  if (!Number.isFinite(lockMs)) issues.push("invalid lockedAt");
  const lockOffsetMin = Math.round((kickMs - lockMs) / 60_000);
  if (lockOffsetMin !== 5) {
    issues.push(`lock offset ${lockOffsetMin}min (expected 5min before kickoff)`);
  }
  const expectedTimeToLock = Math.floor((lockMs - nowMs) / 1000);
  const drift = Math.abs(expectedTimeToLock - m.timeToLock);
  if (drift > 120) {
    issues.push(`timeToLock drift ${drift}s (api=${m.timeToLock} expected≈${expectedTimeToLock})`);
  }
  if (kickMs <= nowMs && m.status === "OPEN") {
    issues.push("kickoff in past but status OPEN");
  }
  if (lockMs <= nowMs && m.status === "OPEN") {
    issues.push("lockedAt in past but status OPEN");
  }
  return issues;
}

async function main() {
  const nowMs = Date.now();
  console.log("==> GET", `${API_URL}/api/markets`);
  const res = await fetch(`${API_URL}/api/markets`);
  if (!res.ok) throw new Error(`markets HTTP ${res.status}`);
  const body = (await res.json()) as {
    markets: ApiMarket[];
    total: number;
    liquidityMode?: string;
    protocolRegistryMode?: boolean;
  };

  console.log(
    JSON.stringify({
      API_RESPONSE_COUNT: body.markets?.length ?? 0,
      total: body.total,
      liquidityMode: body.liquidityMode,
      protocolRegistryMode: body.protocolRegistryMode,
    }),
  );

  const byId = new Map(body.markets.map((m) => [m.gameId, m]));
  const dupIds = new Set<string>();
  const seen = new Set<string>();
  for (const m of body.markets) {
    if (seen.has(m.gameId)) dupIds.add(m.gameId);
    seen.add(m.gameId);
  }
  if (dupIds.size) console.warn("DUPLICATE_GAME_IDS", [...dupIds]);

  console.log("\n==> Sample event validation");
  for (const gameId of SAMPLE_GAME_IDS) {
    const m = byId.get(gameId);
    if (!m) {
      console.log(gameId, "MISSING_FROM_API");
      continue;
    }
    const kickMs = Date.parse(m.startsAt);
    const timeIssues = auditTimeIntegrity(m, nowMs);
    console.log(
      JSON.stringify(
        {
          gameId,
          title: m.title,
          league: m.leagueName,
          country: m.country,
          startsAtUtc: m.startsAt,
          lockedAtUtc: m.lockedAt,
          closesIn: secLabel(m.timeToLock),
          kicksIn: secLabel(Math.max(0, Math.floor((kickMs - nowMs) / 1000))),
          odds: { home: m.homeOdds, draw: m.drawOdds, away: m.awayOdds },
          sportSlug: m.sportSlug ?? m.sport,
          timeIssues,
          realityNotes:
            gameId === "1006000000000029560323"
              ? "IIHF WC 2026 — verify ice hockey; Azuro may tag sport slug loosely"
              : gameId === "1006000000000083636687"
                ? "Veikkausliiga HJK–Ilves — football fixture"
                : "IIHF WC 2026 — verify ice hockey",
        },
        null,
        2,
      ),
    );
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  const auditLocalDb = process.env.VALIDATE_REGISTRY_LOCAL_DB === "1";
  if (dbUrl && auditLocalDb) {
    console.log("\n==> DB + LP consistency (local DATABASE_URL)");
    const prisma = new PrismaClient();
    try {
      const openCount = await prisma.curatedEvent.count({
        where: { isActive: true, status: "OPEN" },
      });
      const liq = await resolveCanonicalLiquidityState(prisma);
      const lpIds = new Set(liq.liquidityPerMarket.map((r) => r.gameId));
      console.log(
        JSON.stringify({
          DB_OPEN_COUNT: openCount,
          LP_ALLOCATED_MARKETS: liq.liquidityPerMarket.length,
          CANONICAL_OPEN_SLOTS: liq.canonicalOpenSlots,
          orphanCount: liq.diagnostics.orphanAllocationCount,
        }),
      );
      for (const gameId of SAMPLE_GAME_IDS) {
        const inRegistry = await prisma.curatedEvent.findUnique({
          where: { gameId },
          select: { status: true, isActive: true, startsAt: true, lockedAt: true },
        });
        const marketId = curatedMarketIdFromGameId(gameId);
        const lpRow = liq.allocationByMarketId[marketId];
        console.log(
          gameId,
          JSON.stringify({
            inRegistry: Boolean(inRegistry),
            dbStatus: inRegistry?.status,
            dbKickoff: inRegistry?.startsAt?.toISOString(),
            inLpAllocation: lpIds.has(gameId),
            paperLiquidity: lpRow?.allocation ?? null,
          }),
        );
      }
    } finally {
      await prisma.$disconnect();
    }
  } else {
    console.log(
      "\n(skip DB/LP — set VALIDATE_REGISTRY_LOCAL_DB=1 + migrated DATABASE_URL for local vault audit)",
    );
    for (const gameId of SAMPLE_GAME_IDS) {
      const m = byId.get(gameId);
      const hasLiq = m?.paperLiquidityAllocation != null;
      console.log(gameId, { apiPaperLiquidity: hasLiq ? m?.paperLiquidityAllocation : null });
    }
  }

  const versionRes = await fetch(`${API_URL}/api/v1/health`);
  const health = (await versionRes.json()) as { registry?: unknown };
  console.log("\n==> REGISTRY_HEALTH_CHECK (from /api/v1/health when deployed)");
  console.log(
    JSON.stringify(
      health.registry ?? { note: "registry field missing — deploy latest backend" },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
