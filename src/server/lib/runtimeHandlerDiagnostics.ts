import { getMethod, getRequestURL, type H3Event } from "vinxi/http";

/** Dev or explicit flag — request timing/path diagnostics only (no secrets). */
export function isRuntimeHandlerDiagnosticsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.RUNTIME_HANDLER_DEBUG === "1"
  );
}

export function runtimeHandlerEnv(): {
  nodeEnv: string | undefined;
  vercel: boolean;
} {
  return {
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL === "1",
  };
}

export function handlerRequestContext(event: H3Event): {
  method: string;
  pathname: string;
} {
  const url = getRequestURL(event);
  return { method: getMethod(event), pathname: url.pathname };
}

export function errorMessage(err: unknown, maxLen = 200): string {
  if (err instanceof Error) return err.message.slice(0, maxLen);
  return String(err).slice(0, maxLen);
}

export function logHandlerDiag(
  handler: string,
  phase: "start" | "done" | "error",
  fields: Record<string, unknown>,
): void {
  if (!isRuntimeHandlerDiagnosticsEnabled()) return;
  console.info(
    JSON.stringify({
      tag: "runtime_handler",
      handler,
      phase,
      ...runtimeHandlerEnv(),
      ...fields,
    }),
  );
}

/** Sanitized failure log — safe in production (no headers/body/wallet data). */
export function logHandlerFailure(
  handler: string,
  step: string,
  err: unknown,
  fields: Record<string, unknown> = {},
): void {
  console.error(
    JSON.stringify({
      tag: "runtime_handler_error",
      handler,
      step,
      message: errorMessage(err),
      ...runtimeHandlerEnv(),
      ...fields,
    }),
  );
}

export function handlerInternalError(handler: string, err: unknown): Response {
  logHandlerFailure(handler, "unhandled", err);
  return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
    status: 500,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
