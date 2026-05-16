/**
 * Static + runtime anti-regression guards for protocol registry (football-first phase).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isProtocolRegistryMode } from "./emergencyRelaxMode";

export type FootballFirstGuardViolation = {
  code: string;
  file: string;
  detail: string;
};

const REPO_ROOT = join(__dirname, "..", "..", "..");

const FORBIDDEN_PATTERNS: Array<{
  code: string;
  file: string;
  pattern: RegExp;
  hint: string;
}> = [
  {
    code: "PRE_PERSIST_SLICE_9",
    file: "backend/src/services/protocolRegistrySync.ts",
    pattern: /games\.slice\s*\(\s*0\s*,\s*9\s*\)/,
    hint: "Do not cap registry payload to 9 before upsert",
  },
  {
    code: "CATALOG_TARGET_IN_REGISTRY_SYNC",
    file: "backend/src/services/protocolRegistrySync.ts",
    pattern: /CATALOG_TARGET_SIZE/,
    hint: "Editorial catalog cap must not appear in registry sync",
  },
  {
    code: "DEFAULT_UNKNOWN_TO_FOOTBALL",
    file: "backend/src/services/eventCurationPipeline.ts",
    pattern: /canonicalSportFromRaw\([^)]+\)\s*\?\?\s*["']football["']/,
    hint: "Never default unknown Azuro rows to football",
  },
  {
    code: "LP_SLOT_CAP_SLICE",
    file: "backend/src/services/canonicalLiquidityState.ts",
    pattern: /slice\s*\(\s*0\s*,\s*CANONICAL_OPEN_MARKET_CAP\s*\)/,
    hint: "Do not cap LP graph to fixed slot count",
  },
  {
    code: "LP_SLOT_CAP_CONSTANT",
    file: "backend/src/services/canonicalLiquidityState.ts",
    pattern: /CANONICAL_OPEN_MARKET_CAP\s*=\s*9/,
    hint: "Remove fixed 9-market LP cap — use full graph",
  },
  {
    code: "REBALANCE_FINGERPRINT_TAKE_9",
    file: "backend/src/services/catalogLiquidityRebalance.ts",
    pattern: /take:\s*9\b/,
    hint: "Rebalance fingerprint must include full OPEN set",
  },
];

export function scanFootballFirstGuardViolations(): FootballFirstGuardViolation[] {
  const out: FootballFirstGuardViolation[] = [];
  for (const rule of FORBIDDEN_PATTERNS) {
    const path = join(REPO_ROOT, rule.file);
    if (!existsSync(path)) continue;
    const src = readFileSync(path, "utf8");
    if (rule.pattern.test(src)) {
      out.push({ code: rule.code, file: rule.file, detail: rule.hint });
    }
  }
  return out;
}

export function assertFootballFirstGuards(): void {
  const violations = scanFootballFirstGuardViolations();
  if (violations.length > 0) {
    throw new Error(
      `Football-first guard failed:\n${violations.map((v) => `- ${v.code}: ${v.file} (${v.detail})`).join("\n")}`,
    );
  }
}

/** Runtime: registry sync must not filter by sport before persist. */
export function checkPrePersistenceSportFilter(opts: {
  payloadGames: number;
  persistedCount: number;
  sportFilterApplied?: boolean;
}): FootballFirstGuardViolation | null {
  if (!isProtocolRegistryMode()) return null;
  if (opts.sportFilterApplied) {
    return {
      code: "PRE_PERSISTENCE_SPORT_FILTER",
      file: "runtime",
      detail: "Sport filter applied before protocol registry persist",
    };
  }
  if (opts.payloadGames > 0 && opts.persistedCount === 0) {
    return {
      code: "PRE_PERSISTENCE_EMPTY_WRITE",
      file: "runtime",
      detail: "Valid payload but zero rows persisted in protocol mode",
    };
  }
  return null;
}
