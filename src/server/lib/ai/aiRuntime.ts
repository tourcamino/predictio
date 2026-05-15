/**
 * Minimal AI runtime diagnostics (Phase 0) — no secrets in logs.
 */
import { AI_MODELS, type AiModelKey } from "~/config/aiModels";
import {
  hasOpenRouterKey,
  resolveOpenRouterKeySource,
} from "~/server/lib/ai/openRouterClient";

export type AiRuntimeStatus = {
  enabled: boolean;
  provider: "openrouter";
  keySource: ReturnType<typeof resolveOpenRouterKeySource>;
  fallbackMode: "openrouter" | "offline";
};

export function getAiRuntimeStatus(): AiRuntimeStatus {
  const keySource = resolveOpenRouterKeySource();
  return {
    enabled: hasOpenRouterKey(),
    provider: "openrouter",
    keySource,
    fallbackMode: hasOpenRouterKey() ? "openrouter" : "offline",
  };
}

let bootstrapped = false;

export function logAiRuntimeBootstrapOnce(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  const status = getAiRuntimeStatus();
  console.log(
    JSON.stringify({
      tag: "ai_runtime",
      level: status.enabled ? "info" : "warn",
      msg: status.enabled ? "ai_enabled" : "ai_disabled",
      provider: status.provider,
      keySource: status.keySource,
      fallbackMode: status.fallbackMode,
    }),
  );
}

export function logAiProcedureStart(
  procedure: string,
  meta: {
    model?: string;
    modelKey?: AiModelKey;
    catalogMarkets?: number;
    usedFallback?: boolean;
    source?: string;
  },
): void {
  const model =
    meta.model ??
    (meta.modelKey ? AI_MODELS[meta.modelKey].model : undefined);
  console.log(
    JSON.stringify({
      tag: "ai_runtime",
      level: "info",
      msg: "procedure_start",
      procedure,
      model,
      catalogMarkets: meta.catalogMarkets,
      usedFallback: meta.usedFallback,
      source: meta.source,
    }),
  );
}
