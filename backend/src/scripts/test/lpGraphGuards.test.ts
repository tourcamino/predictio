/**
 * Full LP graph anti-regression tests.
 * Run: npm run test:lp-graph-guards
 */
import assert from "node:assert/strict";
import {
  computeCanonicalMarketAllocations,
  minAllocationUsd,
  type LiquidityAllocationSlot,
} from "../../services/canonicalLiquidityAllocation";
import { scanFootballFirstGuardViolations } from "../../services/footballFirstGuards";

function makeSlots(n: number, footballCount: number): LiquidityAllocationSlot[] {
  return Array.from({ length: n }, (_, i) => ({
    marketId: `azuro-${i}`,
    gameId: String(i),
    marketName: `Market ${i}`,
    league: i < footballCount ? "Serie A" : "UFC",
    sport: i < footballCount ? "football" : "mma",
    appealScore: 50 - i,
    volume: 0,
    startsAtMs: Date.now() + (i + 1) * 3_600_000,
  }));
}

const slots113 = makeSlots(113, 74);
const budget = 10_000;
const rows = computeCanonicalMarketAllocations(slots113, budget, "curated-appeal");

assert.equal(rows.length, 113, "all OPEN markets must be in LP graph");
assert.equal(
  rows.filter((r) => r.allocation <= 0).length,
  0,
  "no zero-allocation long-tail markets",
);
const sum = rows.reduce((s, r) => s + r.allocation, 0);
assert.ok(Math.abs(sum - budget) < 0.25, `allocation sum ${sum} ~= ${budget}`);

const footballAlloc = rows
  .filter((r) => r.sport === "football")
  .reduce((s, r) => s + r.allocation, 0);
const mmaAlloc = rows
  .filter((r) => r.sport === "mma")
  .reduce((s, r) => s + r.allocation, 0);
assert.ok(footballAlloc > mmaAlloc, "football should receive more total liquidity than mma");

const minUsd = minAllocationUsd(budget, 113);
for (const r of rows) {
  assert.ok(r.allocation >= minUsd * 0.99, `floor for ${r.gameId}: ${r.allocation}`);
}

const staticViolations = scanFootballFirstGuardViolations();
assert.equal(
  staticViolations.length,
  0,
  `static LP/registry guards: ${JSON.stringify(staticViolations)}`,
);

console.log("OK: full LP graph guards passed", {
  markets: rows.length,
  sum,
  footballAlloc: Math.round(footballAlloc),
  mmaAlloc: Math.round(mmaAlloc),
  minAllocation: Math.round(minUsd * 100) / 100,
});
