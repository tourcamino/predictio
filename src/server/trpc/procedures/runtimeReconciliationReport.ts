import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { runRuntimeReconciliation } from "~/lib/runtime/runtimeReconciliationEngine";
import { env } from "~/server/env";
import { baseProcedure } from "~/server/trpc/main";

function assertReconAuthorized(secret: string) {
  if (!env.BOT_API_KEY && !env.ADMIN_PASSWORD) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Runtime reconciliation is disabled (set BOT_API_KEY or ADMIN_PASSWORD).",
    });
  }
  const ok =
    (env.BOT_API_KEY && secret === env.BOT_API_KEY) ||
    (env.ADMIN_PASSWORD && secret === env.ADMIN_PASSWORD);
  if (!ok) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid secret." });
  }
}

/**
 * Secured read-only reconciliation report for cron / ops dashboards.
 * Pass `secret` equal to `BOT_API_KEY` or `ADMIN_PASSWORD` in the **mutation body** (not query string).
 */
export const runtimeReconciliationReport = baseProcedure
  .input(
    z.object({
      secret: z.string().min(1),
      sampleLimit: z.number().int().min(1).max(2000).optional(),
      maxIssues: z.number().int().min(50).max(5000).optional(),
      verifyOracleAgainstDb: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    assertReconAuthorized(input.secret);
    return runRuntimeReconciliation({
      sampleLimit: input.sampleLimit,
      maxIssues: input.maxIssues,
      verifyOracleAgainstDb: input.verifyOracleAgainstDb,
    });
  });
