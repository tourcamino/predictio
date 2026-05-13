import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countConsecutiveLoginStreakDays,
  liquidityPointsForUsdcDeposit,
  localDayKey,
} from "./pointsPure";

describe("localDayKey", () => {
  it("normalizes to YYYY-MM-DD at local midnight", () => {
    const d = new Date(2026, 4, 13, 15, 30, 0); // May 13 local
    assert.equal(localDayKey(d), "2026-05-13");
  });
});

describe("countConsecutiveLoginStreakDays", () => {
  it("returns 0 when today is missing", () => {
    const today = new Date(2026, 4, 13, 0, 0, 0);
    const keys = new Set<string>(["2026-05-12", "2026-05-11"]);
    assert.equal(countConsecutiveLoginStreakDays(today, keys), 0);
  });

  it("counts through today", () => {
    const today = new Date(2026, 4, 13, 0, 0, 0);
    const keys = new Set<string>(["2026-05-13", "2026-05-12", "2026-05-11"]);
    assert.equal(countConsecutiveLoginStreakDays(today, keys), 3);
  });

  it("stops at first gap", () => {
    const today = new Date(2026, 4, 13, 0, 0, 0);
    const keys = new Set<string>(["2026-05-13", "2026-05-12", "2026-05-10"]);
    assert.equal(countConsecutiveLoginStreakDays(today, keys), 2);
  });
});

describe("liquidityPointsForUsdcDeposit", () => {
  it("is 10 pts per full $10 at base rate 10", () => {
    assert.equal(liquidityPointsForUsdcDeposit(100, 10), 100);
    assert.equal(liquidityPointsForUsdcDeposit(25, 10), 20);
    assert.equal(liquidityPointsForUsdcDeposit(9, 10), 0);
  });
});
