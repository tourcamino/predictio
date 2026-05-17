#!/usr/bin/env node
/**
 * Forensic audit for a wallet's open orders vs market lifecycle.
 * Usage: node scripts/audit-wallet-positions.mjs 0x665cee... [API_BASE]
 */
const wallet = (process.argv[2] || "").toLowerCase();
const base = (process.argv[3] || "https://api.predictio.live").replace(/\/$/, "");

if (!wallet) {
  console.error("Usage: node scripts/audit-wallet-positions.mjs <wallet> [apiBase]");
  process.exit(1);
}

async function get(path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const { positions } = await get(
    `/api/v1/web/user-positions?walletAddress=${wallet}&status=open`,
  );
  const open = positions || [];
  console.log(`\nWallet ${wallet} — ${open.length} open orders\n`);

  for (const o of open) {
    const m = o.market || {};
    console.log("─".repeat(72));
    console.log(`orderId:     ${o.id}`);
    console.log(`marketId:    ${o.marketId}`);
    console.log(`event:       ${m.event || "?"}`);
    console.log(`outcome:     ${o.outcome} | stake $${o.amount} | shares ${o.shares} @ ${o.avgPrice}`);
    console.log(`orderStatus: ${o.status}`);
    console.log(`marketDb:    status=${m.status} winner=${m.winner ?? "—"} closesAt=${m.closesAt} resolvedAt=${m.resolvedAt ?? "—"}`);
    console.log(`createdAt:   ${o.createdAt}`);
    try {
      const snap = await get(`/api/v1/web/paper-wallet-balance?walletAddress=${wallet}`);
      void snap;
    } catch {
      /* ignore */
    }
  }
  console.log("\nRun settlement tick on VPS:");
  console.log("  node --env-file=.env --import tsx src/server/scripts/runGlobalPaperSettlementTick.ts\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
