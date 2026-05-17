/**
 * Structured settlement / oracle diagnostics (PR2).
 * Read-only classification — does not change settlement math or DB writes.
 */

export type SettlementSkipReasonCode =
  | "SETTLEMENT_ELIGIBLE"
  | "ORACLE_PREMATCH"
  | "ORACLE_NOT_RESOLVED"
  | "CONDITION_MISSING"
  | "WINNER_UNKNOWN"
  | "DRAW_UNSUPPORTED"
  | "MARKET_ALREADY_SETTLED"
  | "INVALID_MAPPING"
  | "GAME_NOT_IN_SUBGRAPH"
  | "NON_AZURO_MARKET"
  | "VOID_OR_REFUND"
  | "DISPUTE_QUEUED"
  | "GRAPHQL_ERROR";

export type SettlementDiagnosticEntry = {
  marketId: string;
  azuroGameId: string | null;
  conditionId: string | null;
  closesAt: string | null;
  azuroGameState: string | null;
  hasWinner: boolean;
  reasonCode: SettlementSkipReasonCode;
  reasonDetail: string;
  skipped: boolean;
  observedAt: string;
};

export function logSettlementDiagnostic(entry: SettlementDiagnosticEntry): void {
  console.log(
    JSON.stringify({
      type: "settlement_diagnostic",
      ...entry,
    }),
  );
}

type AzuroConditionLike = {
  conditionId?: string;
  wonOutcomeIds?: string[];
  outcomes?: { outcomeId?: string }[];
};

type AzuroGameLike = {
  gameId?: string;
  state?: string;
  status?: string;
  conditions?: AzuroConditionLike[];
};

export function classifyAzuroGameForSettlement(
  marketId: string,
  game: AzuroGameLike | null | undefined,
  meta?: { closesAt?: Date | string | null; dbStatus?: string | null },
): SettlementDiagnosticEntry {
  const observedAt = new Date().toISOString();
  const closesAt =
    meta?.closesAt != null
      ? meta.closesAt instanceof Date
        ? meta.closesAt.toISOString()
        : String(meta.closesAt)
      : null;

  if (!marketId.startsWith("azuro-")) {
    return {
      marketId,
      azuroGameId: null,
      conditionId: null,
      closesAt,
      azuroGameState: null,
      hasWinner: false,
      reasonCode: "NON_AZURO_MARKET",
      reasonDetail: "Market id is not azuro-prefixed",
      skipped: true,
      observedAt,
    };
  }

  const azuroGameId = marketId.replace(/^azuro-/, "");

  if (!game) {
    return {
      marketId,
      azuroGameId,
      conditionId: null,
      closesAt,
      azuroGameState: null,
      hasWinner: false,
      reasonCode: "GAME_NOT_IN_SUBGRAPH",
      reasonDetail: "Game not returned by Azuro GraphQL games(where: gameId_in)",
      skipped: true,
      observedAt,
    };
  }

  const main = game.conditions?.[0];
  const conditionId = main?.conditionId ?? null;
  const rawState = (game.state ?? game.status ?? "").trim();
  const hasWinner = Boolean(main?.wonOutcomeIds?.[0]);

  if (!conditionId) {
    return {
      marketId,
      azuroGameId,
      conditionId: null,
      closesAt,
      azuroGameState: rawState || null,
      hasWinner: false,
      reasonCode: "CONDITION_MISSING",
      reasonDetail: "conditions[0].conditionId missing — mapping may need another condition index",
      skipped: true,
      observedAt,
    };
  }

  if (/^(Canceled|Cancelled|Voided|Void)$/i.test(rawState)) {
    return {
      marketId,
      azuroGameId,
      conditionId,
      closesAt,
      azuroGameState: rawState,
      hasWinner: false,
      reasonCode: "VOID_OR_REFUND",
      reasonDetail: "Void/cancel state — refund path",
      skipped: false,
      observedAt,
    };
  }

  if (/postpon|suspend|abandon/i.test(rawState)) {
    return {
      marketId,
      azuroGameId,
      conditionId,
      closesAt,
      azuroGameState: rawState,
      hasWinner: false,
      reasonCode: "DISPUTE_QUEUED",
      reasonDetail: `Exceptional state: ${rawState}`,
      skipped: false,
      observedAt,
    };
  }

  if (/^Prematch$/i.test(rawState)) {
    return {
      marketId,
      azuroGameId,
      conditionId,
      closesAt,
      azuroGameState: rawState,
      hasWinner: false,
      reasonCode: "ORACLE_PREMATCH",
      reasonDetail:
        "Azuro still reports Prematch — settlement tick skips until Resolved/Finished",
      skipped: true,
      observedAt,
    };
  }

  if (rawState !== "Resolved" && rawState !== "Finished") {
    return {
      marketId,
      azuroGameId,
      conditionId,
      closesAt,
      azuroGameState: rawState || null,
      hasWinner,
      reasonCode: "ORACLE_NOT_RESOLVED",
      reasonDetail: `State "${rawState || "unknown"}" is not terminal`,
      skipped: true,
      observedAt,
    };
  }

  if (!hasWinner) {
    return {
      marketId,
      azuroGameId,
      conditionId,
      closesAt,
      azuroGameState: rawState,
      hasWinner: false,
      reasonCode: "WINNER_UNKNOWN",
      reasonDetail: "Resolved/Finished but wonOutcomeIds[0] empty",
      skipped: true,
      observedAt,
    };
  }

  const outs = main?.outcomes ?? [];
  const wonId = main!.wonOutcomeIds![0]!;
  if (outs.length >= 3 && outs[1]?.outcomeId && wonId === outs[1].outcomeId) {
    return {
      marketId,
      azuroGameId,
      conditionId,
      closesAt,
      azuroGameState: rawState,
      hasWinner: true,
      reasonCode: "DRAW_UNSUPPORTED",
      reasonDetail: "Draw outcome won — paper refund path",
      skipped: false,
      observedAt,
    };
  }

  if (outs.length < 1 || !outs[0]?.outcomeId) {
    return {
      marketId,
      azuroGameId,
      conditionId,
      closesAt,
      azuroGameState: rawState,
      hasWinner: true,
      reasonCode: "INVALID_MAPPING",
      reasonDetail: "Cannot map wonOutcomeId to home/away outcomes",
      skipped: true,
      observedAt,
    };
  }

  if ((meta?.dbStatus ?? "").toLowerCase() === "resolved") {
    return {
      marketId,
      azuroGameId,
      conditionId,
      closesAt,
      azuroGameState: rawState,
      hasWinner: true,
      reasonCode: "MARKET_ALREADY_SETTLED",
      reasonDetail: "DB market already resolved",
      skipped: true,
      observedAt,
    };
  }

  return {
    marketId,
    azuroGameId,
    conditionId,
    closesAt,
    azuroGameState: rawState,
    hasWinner: true,
    reasonCode: "SETTLEMENT_ELIGIBLE",
    reasonDetail: "Binary settle eligible",
    skipped: false,
    observedAt,
  };
}
