/**
 * PR22 — Azuro official REST oracle (market-manager). Source of truth for terminal states.
 */
import type { AzuroConditionLike } from "~/lib/settlement/azuroConditionSelection";

import type { OracleMarketSnapshot, OracleProvider, OracleProviderHealth } from "./types";

const REST_BASE =
  process.env.AZURO_REST_API_BASE?.trim() ||
  "https://api.onchainfeed.org/api/v1/public/market-manager";

const ENVIRONMENT = process.env.AZURO_ENVIRONMENT?.trim() || "PolygonUSDT";

type RestGame = {
  gameId: string;
  state: string;
  startsAt?: string;
};

type RestCondition = {
  conditionId: string;
  state: string;
  wonOutcomeIds?: string[] | null;
  outcomes?: Array<{ outcomeId: string; odds?: string }>;
  game?: { gameId: string };
};

async function restPost<T>(path: string, body: object): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${REST_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json()) as T & { message?: unknown };
    if (!res.ok) {
      throw new Error(`REST ${path} HTTP ${res.status}: ${JSON.stringify(json.message).slice(0, 160)}`);
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

function mapConditions(raw: RestCondition[]): AzuroConditionLike[] {
  return raw.map((c) => ({
    conditionId: c.conditionId,
    state: c.state,
    wonOutcomeIds: c.wonOutcomeIds ?? undefined,
    outcomes: (c.outcomes ?? []).map((o) => ({
      outcomeId: o.outcomeId,
      currentOdds: o.odds ?? null,
    })),
  }));
}

export class AzuroRestOracleProvider implements OracleProvider {
  readonly sourceId = "azuro_rest" as const;
  readonly deprecated = false;

  async pollGames(gameIds: string[]): Promise<OracleMarketSnapshot[]> {
    if (gameIds.length === 0) return [];

    const started = Date.now();
    const unique = [...new Set(gameIds.map((g) => g.trim()).filter(Boolean))];
    const CHUNK = 40;
    const gamesById = new Map<string, RestGame>();
    const conditionsByGame = new Map<string, RestCondition[]>();

    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const [gamesRes, condRes] = await Promise.all([
        restPost<{ games?: RestGame[] }>("/games-by-ids", { gameIds: chunk }),
        restPost<{ conditions?: RestCondition[] }>("/conditions-by-game-ids", {
          environment: ENVIRONMENT,
          gameIds: chunk,
        }),
      ]);
      for (const g of gamesRes.games ?? []) {
        if (g.gameId) gamesById.set(g.gameId, g);
      }
      for (const c of condRes.conditions ?? []) {
        const gid = String(c.game?.gameId ?? "").trim();
        if (!gid) continue;
        const list = conditionsByGame.get(gid) ?? [];
        list.push(c);
        conditionsByGame.set(gid, list);
      }
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const fetchedAt = new Date().toISOString();
    const out: OracleMarketSnapshot[] = [];

    for (const gameId of unique) {
      const game = gamesById.get(gameId);
      const kickoff = game?.startsAt ? parseInt(String(game.startsAt), 10) : null;
      const staleAgeSec =
        kickoff != null && Number.isFinite(kickoff) && kickoff < nowSec - 7200
          ? nowSec - kickoff
          : null;

      out.push({
        gameId,
        marketId: `azuro-${gameId}`,
        gameState: game?.state ?? null,
        conditions: mapConditions(conditionsByGame.get(gameId) ?? []),
        source: "azuro_rest",
        fetchedAt,
        staleAgeSec,
      });
    }

    console.log(
      JSON.stringify({
        tag: "ORACLE_SOURCE",
        source: "azuro_rest",
        ORACLE_SOURCE: "azuro_rest",
        gameCount: out.length,
        resolvedConditions: out.reduce(
          (n, g) => n + g.conditions.filter((c) => c.state === "Resolved" && c.wonOutcomeIds?.length).length,
          0,
        ),
        latencyMs: Date.now() - started,
      }),
    );

    return out;
  }

  async healthCheck(): Promise<OracleProviderHealth> {
    const started = Date.now();
    try {
      await restPost<{ games?: RestGame[] }>("/games-by-ids", {
        gameIds: ["1006000000000085187748"],
      });
      return {
        source: "azuro_rest",
        ok: true,
        latencyMs: Date.now() - started,
        deprecated: false,
      };
    } catch (e) {
      return {
        source: "azuro_rest",
        ok: false,
        latencyMs: Date.now() - started,
        lastError: e instanceof Error ? e.message : String(e),
        deprecated: false,
      };
    }
  }
}

export function isAzuroRestOracleEnabled(): boolean {
  return process.env.AZURO_USE_REST_ORACLE !== "false";
}
