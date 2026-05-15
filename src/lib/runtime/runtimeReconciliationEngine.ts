import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { checkResolvedMarkets } from "~/services/azuro";
import { db } from "~/server/db";
import {
  buildRuntimeHealthSummary,
  logReconciliationRunSummary,
  logRuntimeReconDev,
} from "~/lib/runtime/reconciliationObservability";
import { getRuntimeReconciliationThresholds } from "~/lib/runtime/runtimeReconciliationConfig";
import type {
  RuntimeReconciliationIssue,
  RuntimeReconciliationIssueCode,
  RuntimeReconciliationResult,
} from "~/lib/runtime/runtimeReconciliationTypes";
import { RuntimeReconciliationIssueSeverity } from "~/lib/runtime/runtimeReconciliationTypes";

export type RuntimeReconciliationRunOptions = {
  /** Max rows fetched per SQL slice (bounded scans). */
  sampleLimit?: number;
  /** Hard cap on emitted issues (safety). */
  maxIssues?: number;
  /** Calls Azuro GraphQL — use from secured cron only. */
  verifyOracleAgainstDb?: boolean;
  prisma?: PrismaClient;
};

const EPS = 0.01;

function nowIso() {
  return new Date().toISOString();
}

function issueCodeCounts(issues: RuntimeReconciliationIssue[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of issues) {
    out[i.issueCode] = (out[i.issueCode] ?? 0) + 1;
  }
  return out;
}

function push(
  issues: RuntimeReconciliationIssue[],
  maxIssues: number,
  truncated: { value: boolean },
  issue: RuntimeReconciliationIssue,
) {
  if (issues.length >= maxIssues) {
    truncated.value = true;
    return;
  }
  issues.push(issue);
}

function countSeverity(issues: RuntimeReconciliationIssue[]) {
  let critical = 0;
  let warning = 0;
  let info = 0;
  for (const i of issues) {
    if (i.severity === RuntimeReconciliationIssueSeverity.CRITICAL) critical += 1;
    else if (i.severity === RuntimeReconciliationIssueSeverity.WARNING) warning += 1;
    else info += 1;
  }
  return { critical, warning, info };
}

/**
 * Read-only reconciliation pass across DB ledger, lifecycle, and optional oracle snapshot.
 * Does **not** settle, refund, or mutate portfolio.
 */
export async function runRuntimeReconciliation(
  options: RuntimeReconciliationRunOptions = {},
): Promise<RuntimeReconciliationResult> {
  const startedAt = new Date();
  const runId = crypto.randomUUID();
  const client = options.prisma ?? db;
  const sampleLimit = Math.min(Math.max(options.sampleLimit ?? 200, 1), 2000);
  const maxIssues = Math.min(Math.max(options.maxIssues ?? 800, 50), 5000);
  const thresholds = getRuntimeReconciliationThresholds();
  const truncated = { value: false };
  const issues: RuntimeReconciliationIssue[] = [];
  const detectedAt = nowIso();

  const lockedCutoff = new Date(
    startedAt.getTime() - thresholds.staleLockedHours * 3600 * 1000,
  );
  const resolvingCutoff = new Date(
    startedAt.getTime() - thresholds.staleResolvingHours * 3600 * 1000,
  );
  const disputedCutoff = new Date(
    startedAt.getTime() - thresholds.staleDisputedHours * 3600 * 1000,
  );

  logRuntimeReconDev("run_start", {
    runId,
    sampleLimit,
    verifyOracleAgainstDb: Boolean(options.verifyOracleAgainstDb),
  });

  // --- CHECK 1: resolved market + open orders ---
  const check1 = await client.$queryRaw<
    { market_id: string; open_count: bigint; status: string | null }[]
  >(Prisma.sql`
    SELECT m.id AS market_id, COUNT(o.id)::bigint AS open_count, m.status
    FROM "Market" m
    INNER JOIN "Order" o ON o."marketId" = m.id AND o.status = 'open'
    WHERE (
      LOWER(TRIM(m.status)) = 'resolved'
      OR (m."resolvedAt" IS NOT NULL AND m.winner IS NOT NULL AND TRIM(m.winner) <> '')
    )
    GROUP BY m.id, m.status
    LIMIT ${sampleLimit}
  `);

  for (const row of check1) {
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.CRITICAL,
      category: "LIFECYCLE",
      issueCode: "RESOLVED_MARKET_OPEN_ORDERS",
      description: `Market has terminal resolution signals but ${row.open_count} open order(s) remain.`,
      detectedAt,
      suggestedAction: "Run guarded settlement/refund engines or investigate stuck orders.",
      marketId: row.market_id,
      context: { openCount: Number(row.open_count), dbStatus: row.status },
    });
  }

  // --- CHECK 2: refunded market, resolved orders missing refund ledger ---
  const check2 = await client.$queryRaw<
    { order_id: string; market_id: string; wallet: string }[]
  >(Prisma.sql`
    SELECT o.id AS order_id, o."marketId" AS market_id, o.wallet
    FROM "Order" o
    INNER JOIN "Market" m ON m.id = o."marketId"
    WHERE LOWER(TRIM(m.status)) = 'refunded'
      AND o.status = 'resolved'
      AND NOT EXISTS (
        SELECT 1 FROM "Transaction" t
        WHERE t."orderId" = o.id AND t.type = 'position_refund'
      )
    LIMIT ${sampleLimit}
  `);

  for (const row of check2) {
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.CRITICAL,
      category: "LEDGER",
      issueCode: "REFUND_LEDGER_MISSING",
      description: "Order marked resolved on refunded market without position_refund ledger row.",
      detectedAt,
      suggestedAction: "Replay refund settlement (admin) after verifying market authority.",
      marketId: row.market_id,
      orderId: row.order_id,
      userWallet: row.wallet.toLowerCase(),
      context: {},
    });
  }

  // --- CHECK 3: resolved binary market, resolved order, missing settlement ledger ---
  const check3 = await client.$queryRaw<
    { order_id: string; market_id: string; wallet: string }[]
  >(Prisma.sql`
    SELECT o.id AS order_id, o."marketId" AS market_id, o.wallet
    FROM "Order" o
    INNER JOIN "Market" m ON m.id = o."marketId"
    WHERE LOWER(TRIM(m.status)) = 'resolved'
      AND UPPER(TRIM(m.winner)) IN ('YES', 'NO')
      AND o.status = 'resolved'
      AND NOT EXISTS (
        SELECT 1 FROM "Transaction" t
        WHERE t."orderId" = o.id AND t.type = 'position_refund'
      )
      AND NOT EXISTS (
        SELECT 1 FROM "Transaction" t
        WHERE t."orderId" = o.id
          AND t.type IN ('position_settlement_win', 'position_settlement_loss')
      )
    LIMIT ${sampleLimit}
  `);

  for (const row of check3) {
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.CRITICAL,
      category: "SETTLEMENT",
      issueCode: "SETTLEMENT_TX_MISSING",
      description: "Resolved binary market has resolved order without settlement win/loss transaction.",
      detectedAt,
      suggestedAction: "Replay binary settlement after oracle verification.",
      marketId: row.market_id,
      orderId: row.order_id,
      userWallet: row.wallet.toLowerCase(),
      context: {},
    });
  }

  // --- CHECK 4: stale LOCKED (DB still `open` past closesAt + threshold) ---
  const staleLocked = await client.market.findMany({
    where: {
      status: { equals: "open", mode: "insensitive" },
      closesAt: { lt: lockedCutoff },
    },
    select: { id: true, closesAt: true, status: true },
    take: sampleLimit,
    orderBy: { closesAt: "asc" },
  });
  for (const m of staleLocked) {
    const hours = (startedAt.getTime() - m.closesAt.getTime()) / 3600000;
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.WARNING,
      category: "STALE",
      issueCode: "STALE_LOCKED",
      description: `Market still "open" in DB more than ${thresholds.staleLockedHours}h after closesAt (LOCKED phase).`,
      detectedAt,
      suggestedAction: "Ensure oracle poll + lifecycle writer transitions to closed/resolving.",
      marketId: m.id,
      context: { hoursPastClose: hours, thresholdHours: thresholds.staleLockedHours },
    });
  }

  // --- Stale RESOLVING ---
  const staleResolving = await client.market.findMany({
    where: {
      status: { equals: "closed", mode: "insensitive" },
      resolvedAt: null,
      closesAt: { lt: resolvingCutoff },
    },
    select: { id: true, closesAt: true, status: true },
    take: sampleLimit,
    orderBy: { closesAt: "asc" },
  });
  for (const m of staleResolving) {
    const hours = (startedAt.getTime() - m.closesAt.getTime()) / 3600000;
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.WARNING,
      category: "STALE",
      issueCode: "STALE_RESOLVING",
      description: `Market closed without resolution longer than ${thresholds.staleResolvingHours}h.`,
      detectedAt,
      suggestedAction: "Verify Azuro state; run paper settlement/refund/dispute when oracle terminal.",
      marketId: m.id,
      context: { hoursSinceClose: hours, thresholdHours: thresholds.staleResolvingHours },
    });
  }

  // --- CHECK 5: stale DISPUTED ---
  const staleDisputed = await client.$queryRaw<
    { id: string; closesAt: Date; status: string; disputeReason: string | null }[]
  >(Prisma.sql`
    SELECT id, "closesAt", status, "disputeReason"
    FROM "Market"
    WHERE "closesAt" < ${disputedCutoff}
      AND (
        LOWER(TRIM(status)) = 'under_review'
        OR ("disputeReason" IS NOT NULL AND LENGTH(TRIM("disputeReason")) > 0)
      )
    ORDER BY "closesAt" ASC
    LIMIT ${sampleLimit}
  `);
  for (const m of staleDisputed) {
    const hours = (startedAt.getTime() - m.closesAt.getTime()) / 3600000;
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.WARNING,
      category: "STALE",
      issueCode: "STALE_DISPUTED",
      description: `Disputed / under_review longer than ${thresholds.staleDisputedHours}h since closesAt.`,
      detectedAt,
      suggestedAction: "Operator review or automated dispute resolution playbook.",
      marketId: m.id,
      context: {
        hoursSinceClose: hours,
        thresholdHours: thresholds.staleDisputedHours,
        disputeReason: m.disputeReason,
      },
    });
  }

  // --- CHECK 6: duplicate settlement ledger rows per order ---
  const dupSettle = await client.$queryRaw<{ order_id: string; cnt: bigint }[]>(Prisma.sql`
    SELECT t."orderId" AS order_id, COUNT(*)::bigint AS cnt
    FROM "Transaction" t
    WHERE t."orderId" IS NOT NULL
      AND t.type IN ('position_settlement_win', 'position_settlement_loss')
    GROUP BY t."orderId"
    HAVING COUNT(*) > 1
    LIMIT ${sampleLimit}
  `);
  for (const row of dupSettle) {
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.CRITICAL,
      category: "DATA_INTEGRITY",
      issueCode: "DUPLICATE_SETTLEMENT_LEDGER",
      description: "Multiple settlement ledger rows for the same orderId.",
      detectedAt,
      suggestedAction: "Freeze payouts; admin forensic + partial unique index enforcement.",
      orderId: row.order_id,
      context: { duplicateCount: Number(row.cnt) },
    });
  }

  // --- CHECK 7: virtualBalance vs latest ledger tail ---
  const balDrift = await client.$queryRaw<
    { wallet: string; virtual_balance: number; tail_balance: number }[]
  >(Prisma.sql`
    SELECT u.wallet, u."virtualBalance" AS virtual_balance, l."balanceAfter" AS tail_balance
    FROM "User" u
    INNER JOIN (
      SELECT DISTINCT ON (LOWER(wallet))
        LOWER(wallet) AS lw,
        "balanceAfter",
        id,
        "createdAt"
      FROM "Transaction"
      WHERE status = 'completed' AND "balanceAfter" IS NOT NULL
      ORDER BY LOWER(wallet), "createdAt" DESC, id DESC
    ) l ON LOWER(u.wallet) = l.lw
    WHERE ABS(u."virtualBalance" - l."balanceAfter") > ${EPS}
    LIMIT ${sampleLimit}
  `);
  for (const row of balDrift) {
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.CRITICAL,
      category: "PORTFOLIO",
      issueCode: "LEDGER_BALANCE_TAIL_MISMATCH",
      description: "User.virtualBalance diverges from latest Transaction.balanceAfter.",
      detectedAt,
      suggestedAction: "Replay ledger reconstruction or emergency balance repair after root-cause.",
      userWallet: row.wallet.toLowerCase(),
      context: { virtualBalance: row.virtual_balance, tailBalance: row.tail_balance },
    });
  }

  // --- Orphan ledger rows (orderId set but no matching Order) ---
  const orphanLedger = await client.$queryRaw<{ tx_id: string; order_id: string | null }[]>(
    Prisma.sql`
    SELECT t.id AS tx_id, t."orderId" AS order_id
    FROM "Transaction" t
    LEFT JOIN "Order" o ON o.id = t."orderId"
    WHERE t."orderId" IS NOT NULL AND o.id IS NULL
    LIMIT ${sampleLimit}
  `,
  );
  for (const row of orphanLedger) {
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.WARNING,
      category: "DATA_INTEGRITY",
      issueCode: "ORPHAN_LEDGER_ORDER_REF",
      description: "Transaction references missing Order row.",
      detectedAt,
      suggestedAction: "DB forensic — likely manual edit or partial rollback.",
      orderId: row.order_id ?? undefined,
      context: { transactionId: row.tx_id },
    });
  }

  // --- Aggregate hint when any check likely hit LIMIT ---
  const check1Total = await client.$queryRaw<{ c: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS c FROM (
      SELECT m.id
      FROM "Market" m
      INNER JOIN "Order" o ON o."marketId" = m.id AND o.status = 'open'
      WHERE (
        LOWER(TRIM(m.status)) = 'resolved'
        OR (m."resolvedAt" IS NOT NULL AND m.winner IS NOT NULL AND TRIM(m.winner) <> '')
      )
      GROUP BY m.id
    ) x
  `);
  if (Number(check1Total[0]?.c ?? 0) > sampleLimit) {
    push(issues, maxIssues, truncated, {
      severity: RuntimeReconciliationIssueSeverity.INFO,
      category: "SETTLEMENT",
      issueCode: "SETTLEMENT_INCOMPLETE_AGGREGATE",
      description: "More RESOLVED+OPEN markets exist than sampleLimit; raise limit or paginate recon.",
      detectedAt,
      suggestedAction: "Increase sampleLimit / add scheduled pagination.",
      context: { totalMarkets: Number(check1Total[0]?.c ?? 0), sampleLimit },
    });
  }

  // --- CHECK 8: oracle vs DB (optional network) ---
  if (options.verifyOracleAgainstDb) {
    const resolvedAzuro = await client.market.findMany({
      where: {
        id: { startsWith: "azuro-" },
        status: { equals: "resolved", mode: "insensitive" },
        winner: { not: null },
      },
      select: { id: true, winner: true },
      take: sampleLimit,
    });
    if (resolvedAzuro.length > 0) {
      const poll = await checkResolvedMarkets(resolvedAzuro.map((m) => m.id));
      for (const m of resolvedAzuro) {
        const w = (m.winner ?? "").trim().toUpperCase();
        if (w !== "YES" && w !== "NO") continue;
        const hit = poll.find((p) => p.marketId === m.id && p.kind === "BINARY");
        if (!hit || hit.kind !== "BINARY") {
          push(issues, maxIssues, truncated, {
            severity: RuntimeReconciliationIssueSeverity.INFO,
            category: "ORACLE",
            issueCode: "ORACLE_VS_DB_SKIPPED_NO_NETWORK",
            description:
              "Oracle poll did not return binary terminal for resolved DB market (may be lag or void path).",
            detectedAt,
            suggestedAction: "Inspect Azuro game state vs DB; re-run poll when GraphQL healthy.",
            marketId: m.id,
            context: { dbWinner: m.winner },
          });
          continue;
        }
        const oracleYes = hit.result === "home";
        const dbYes = w === "YES";
        if (oracleYes !== dbYes) {
          push(issues, maxIssues, truncated, {
            severity: RuntimeReconciliationIssueSeverity.CRITICAL,
            category: "ORACLE",
            issueCode: "ORACLE_DB_WINNER_MISMATCH",
            description: "Azuro binary winner disagrees with DB Market.winner.",
            detectedAt,
            suggestedAction: "Freeze trading; admin dispute + corrective settlement.",
            marketId: m.id,
            context: { dbWinner: m.winner, oracleResult: hit.result },
          });
        }
      }
    }
  } else {
    logRuntimeReconDev("oracle_check_skipped", { runId, reason: "verifyOracleAgainstDb=false" });
  }

  const finishedAt = new Date();
  const { critical, warning, info } = countSeverity(issues);
  const counters: Record<string, number> = {
    issues_total: issues.length,
    check1_rows: check1.length,
    check2_rows: check2.length,
    check3_rows: check3.length,
    stale_locked: staleLocked.length,
    stale_resolving: staleResolving.length,
    stale_disputed: staleDisputed.length,
    dup_settlement: dupSettle.length,
    balance_mismatch: balDrift.length,
    orphan_ledger: orphanLedger.length,
  };

  const health = buildRuntimeHealthSummary({
    runId,
    checkedAt: finishedAt.toISOString(),
    counters,
    critical,
    error: 0,
    warning,
    info,
  });

  const result: RuntimeReconciliationResult = {
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    issues,
    health,
    issueCodeCounts: issueCodeCounts(issues),
    truncated: truncated.value,
  };

  logReconciliationRunSummary(result);
  return result;
}

/** Typed helper for dashboards / tests. */
export function summarizeIssuesByCode(
  issues: RuntimeReconciliationIssue[],
): Partial<Record<RuntimeReconciliationIssueCode, number>> {
  const acc: Partial<Record<RuntimeReconciliationIssueCode, number>> = {};
  for (const i of issues) {
    acc[i.issueCode] = (acc[i.issueCode] ?? 0) + 1;
  }
  return acc;
}
