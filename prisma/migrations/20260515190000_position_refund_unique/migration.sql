-- At most one paper refund ledger row per order (replay-safe).
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_position_refund_one_per_order_idx"
ON "Transaction" ("orderId")
WHERE "orderId" IS NOT NULL
  AND type = 'position_refund';
