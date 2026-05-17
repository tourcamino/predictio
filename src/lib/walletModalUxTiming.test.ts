import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { remainingMinDisplayMs } from "./walletModalUxTiming";

describe("remainingMinDisplayMs", () => {
  it("returns full min when start is unknown", () => {
    assert.equal(remainingMinDisplayMs(null, 1200), 1200);
  });

  it("returns zero when min dwell already elapsed", () => {
    const started = Date.now() - 5000;
    assert.equal(remainingMinDisplayMs(started, 1200), 0);
  });
});
