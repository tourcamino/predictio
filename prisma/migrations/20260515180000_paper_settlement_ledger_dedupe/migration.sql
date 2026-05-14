-- One paper settlement ledger row per order (replay-safe at DB level).
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_paper_settlement_one_per_order_idx"
ON "Transaction" ("orderId")
WHERE "orderId" IS NOT NULL
  AND type IN ('position_settlement_win', 'position_settlement_loss');
