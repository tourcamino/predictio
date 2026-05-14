-- Normalize Prisma `Transaction.type` to exchange-style semantic ledger strings.
-- Safe to re-run only if no rows match the source predicates twice; run once in deploy.

-- 1) LP flows (must run before blanket deposit/withdrawal renames)
UPDATE "Transaction"
SET type = 'lp_deposit'
WHERE type = 'deposit'
  AND (
    (metadata->>'type') IN ('lp_deposit', 'protocol_vault_deposit')
    OR (metadata->>'vaultDeposit') = 'true'
  );

UPDATE "Transaction"
SET type = 'lp_withdraw'
WHERE type = 'withdrawal'
  AND (
    (metadata->>'type') IN ('lp_withdrawal', 'protocol_vault_withdrawal')
    OR (metadata->>'vaultWithdrawal') = 'true'
  );

-- 2) Wallet funding (remaining deposit / withdrawal rows)
UPDATE "Transaction" SET type = 'wallet_deposit' WHERE type = 'deposit';
UPDATE "Transaction" SET type = 'wallet_withdrawal' WHERE type = 'withdrawal';

-- 3) Prediction opens
UPDATE "Transaction" SET type = 'position_open' WHERE type = 'bet_placed';

-- 4) Settlement vs pre-resolution sell (legacy reused `bet_won`)
UPDATE "Transaction"
SET type = 'position_settlement_win'
WHERE type = 'bet_won'
  AND (metadata->>'winningOutcome' IS NOT NULL);

UPDATE "Transaction"
SET type = 'position_sell'
WHERE type = 'bet_won'
  AND (metadata->>'sharesSold' IS NOT NULL);

UPDATE "Transaction"
SET type = 'position_settlement_win'
WHERE type = 'bet_won';

-- 5) Settlement losses
UPDATE "Transaction" SET type = 'position_settlement_loss' WHERE type = 'bet_lost';

-- 6) Refunds / voids
UPDATE "Transaction" SET type = 'position_refund' WHERE type = 'bet_refund';

-- 7) Rewards (order matters: narrow buckets first)
UPDATE "Transaction"
SET type = 'lp_reward_claim'
WHERE type = 'reward_claim'
  AND (
    (metadata->>'type') = 'lp_fee_claim'
    OR (metadata->>'rewardType') = 'lp_fee_claim'
  );

UPDATE "Transaction"
SET type = 'holding_reward'
WHERE type = 'reward_claim'
  AND (metadata->>'rewardType') = 'holding_rewards';

UPDATE "Transaction"
SET type = 'analyst_reward'
WHERE type = 'reward_claim'
  AND (
    (metadata->>'source') = 'analyst_commission'
    OR (metadata->>'rewardType') = 'analyst_fees'
  );

UPDATE "Transaction"
SET type = 'affiliate_reward'
WHERE type = 'reward_claim';

-- 8) Legacy top-level `lp_fee_claim` if ever written
UPDATE "Transaction" SET type = 'lp_reward_claim' WHERE type = 'lp_fee_claim';
