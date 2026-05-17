/**
 * Structured settlement / oracle diagnostics (PR2 + PR6 condition selection).
 * Read-only classification — does not change settlement math or DB writes.
 */

import {
  mapWonOutcomeToHomeAway,
  pickMoneylineCondition,
  type AzuroConditionLike,
  type MoneylineOddsHint,
} from "~/lib/settlement/azuroConditionSelection";

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
  conditionIndex: number | null;
  conditionCount: number;
  conditionSelectionReason: string | null;
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

type AzuroGameLike = {
  gameId?: string;
  state?: string;
  status?: string;
  conditions?: AzuroConditionLike[];
};

function baseEntry(
  partial: Omit<SettlementDiagnosticEntry, "observedAt">,
): SettlementDiagnosticEntry {
  return { ...partial, observedAt: new Date().toISOString() };
}

export function classifyAzuroGameForSettlement(
  marketId: string,
  game: AzuroGameLike | null | undefined,
  meta?: {
    closesAt?: Date | string | null;
    dbStatus?: string | null;
    oddsHint?: MoneylineOddsHint;
  },
): SettlementDiagnosticEntry {
  const closesAt =
    meta?.closesAt != null
      ? meta.closesAt instanceof Date
        ? meta.closesAt.toISOString()
        : String(meta.closesAt)
      : null;

  const conditionCount = game?.conditions?.length ?? 0;

  if (!marketId.startsWith("azuro-")) {
    return baseEntry({
      marketId,
      azuroGameId: null,
      conditionId: null,
      conditionIndex: null,
      conditionCount: 0,
      conditionSelectionReason: null,
      closesAt,
      azuroGameState: null,
      hasWinner: false,
      reasonCode: "NON_AZURO_MARKET",
      reasonDetail: "Market id is not azuro-prefixed",
      skipped: true,
    });
  }

  const azuroGameId = marketId.replace(/^azuro-/, "");

  if (!game) {
    return baseEntry({
      marketId,
      azuroGameId,
      conditionId: null,
      conditionIndex: null,
      conditionCount: 0,
      conditionSelectionReason: null,
      closesAt,
      azuroGameState: null,
      hasWinner: false,
      reasonCode: "GAME_NOT_IN_SUBGRAPH",
      reasonDetail: "Game not returned by Azuro GraphQL games(where: gameId_in)",
      skipped: true,
    });
  }

  const pick = pickMoneylineCondition(game.conditions, meta?.oddsHint);
  const main = pick?.condition;
  const conditionId = main?.conditionId ?? null;
  const conditionIndex = pick?.index ?? null;
  const selectionReason = pick?.reason ?? null;
  const rawState = (game.state ?? game.status ?? "").trim();
  const hasWinner = Boolean(main?.wonOutcomeIds?.[0]);

  if (!conditionId) {
    return baseEntry({
      marketId,
      azuroGameId,
      conditionId: null,
      conditionIndex,
      conditionCount,
      conditionSelectionReason: selectionReason,
      closesAt,
      azuroGameState: rawState || null,
      hasWinner: false,
      reasonCode: "CONDITION_MISSING",
      reasonDetail: `No settlement condition (${conditionCount} raw conditions from subgraph)`,
      skipped: true,
    });
  }

  const diagCore = {
    marketId,
    azuroGameId,
    conditionId,
    conditionIndex,
    conditionCount,
    conditionSelectionReason: selectionReason,
    closesAt,
  };

  if (/^(Canceled|Cancelled|Voided|Void)$/i.test(rawState)) {
    return baseEntry({
      ...diagCore,
      azuroGameState: rawState,
      hasWinner: false,
      reasonCode: "VOID_OR_REFUND",
      reasonDetail: "Void/cancel state — refund path",
      skipped: false,
    });
  }

  if (/postpon|suspend|abandon/i.test(rawState)) {
    return baseEntry({
      ...diagCore,
      azuroGameState: rawState,
      hasWinner: false,
      reasonCode: "DISPUTE_QUEUED",
      reasonDetail: `Exceptional state: ${rawState}`,
      skipped: false,
    });
  }

  if (/^Prematch$/i.test(rawState)) {
    const idxNote =
      conditionIndex != null && conditionIndex !== 0
        ? ` Using condition[${conditionIndex}] (${selectionReason}), not conditions[0].`
        : "";
    return baseEntry({
      ...diagCore,
      azuroGameState: rawState,
      hasWinner: false,
      reasonCode: "ORACLE_PREMATCH",
      reasonDetail:
        `Azuro still reports Prematch — settlement tick skips until Resolved/Finished.${idxNote}`,
      skipped: true,
    });
  }

  if (rawState !== "Resolved" && rawState !== "Finished") {
    return baseEntry({
      ...diagCore,
      azuroGameState: rawState || null,
      hasWinner,
      reasonCode: "ORACLE_NOT_RESOLVED",
      reasonDetail: `State "${rawState || "unknown"}" is not terminal`,
      skipped: true,
    });
  }

  if (!hasWinner) {
    return baseEntry({
      ...diagCore,
      azuroGameState: rawState,
      hasWinner: false,
      reasonCode: "WINNER_UNKNOWN",
      reasonDetail: `Resolved/Finished but wonOutcomeIds empty on condition[${conditionIndex ?? "?"}]`,
      skipped: true,
    });
  }

  const mapped = mapWonOutcomeToHomeAway(main!);
  if (mapped === "draw") {
    return baseEntry({
      ...diagCore,
      azuroGameState: rawState,
      hasWinner: true,
      reasonCode: "DRAW_UNSUPPORTED",
      reasonDetail: "Draw outcome won — paper refund path",
      skipped: false,
    });
  }

  if (mapped === null) {
    return baseEntry({
      ...diagCore,
      azuroGameState: rawState,
      hasWinner: true,
      reasonCode: "INVALID_MAPPING",
      reasonDetail: "Cannot map wonOutcomeId to home/away on selected moneyline condition",
      skipped: true,
    });
  }

  if ((meta?.dbStatus ?? "").toLowerCase() === "resolved") {
    return baseEntry({
      ...diagCore,
      azuroGameState: rawState,
      hasWinner: true,
      reasonCode: "MARKET_ALREADY_SETTLED",
      reasonDetail: "DB market already resolved",
      skipped: true,
    });
  }

  return baseEntry({
    ...diagCore,
    azuroGameState: rawState,
    hasWinner: true,
    reasonCode: "SETTLEMENT_ELIGIBLE",
    reasonDetail: `Binary settle eligible → ${mapped} (condition[${conditionIndex}] ${selectionReason})`,
    skipped: false,
  });
}
