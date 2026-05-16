import type { PrismaClient } from "@prisma/client";
import type { CurationGamePayload } from "./eventCurationPipeline";
import {
  syncProtocolRegistryToPrisma,
  type ProtocolRegistryDiagnosticsInput,
} from "./protocolRegistrySync";

/** @deprecated Use `syncProtocolRegistryToPrisma` — kept for import compatibility. */
export async function syncRawFeedGamesToPrisma(
  prisma: PrismaClient,
  games: CurationGamePayload[],
  diagnostics?: ProtocolRegistryDiagnosticsInput,
): Promise<{
  written: number;
  deactivated: number;
  cap: number;
}> {
  const r = await syncProtocolRegistryToPrisma(prisma, games, diagnostics);
  return { written: r.written, deactivated: r.deactivated, cap: r.cap };
}
