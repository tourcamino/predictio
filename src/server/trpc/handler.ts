import { defineEventHandler, getWebRequest, type H3Event } from "vinxi/http";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root";
import { startAutonomousCopyAnalystScheduler } from "~/server/services/autonomousCopyAnalystScheduler";
import {
  handlerInternalError,
  handlerRequestContext,
  logHandlerDiag,
  logHandlerFailure,
} from "~/server/lib/runtimeHandlerDiagnostics";

try {
  startAutonomousCopyAnalystScheduler();
} catch (e) {
  console.error("[trpc] autonomous copy scheduler init failed:", e);
}

export default defineEventHandler(async (event: H3Event) => {
  const handler = "trpc";
  const started = Date.now();
  const reqCtx = handlerRequestContext(event);
  logHandlerDiag(handler, "start", {
    method: reqCtx.method,
    pathname: reqCtx.pathname,
  });

  try {
    let request: Request;
    try {
      request = getWebRequest(event);
    } catch (err) {
      logHandlerFailure(handler, "getWebRequest", err, {
        durationMs: Date.now() - started,
      });
      return handlerInternalError(handler, err);
    }

    let response: Response;
    try {
      response = await fetchRequestHandler({
        endpoint: "",
        req: request,
        router: appRouter,
        createContext() {
          return {};
        },
        onError({ error, path, type }) {
          const cause = error.cause;
          const causeMsg =
            cause instanceof Error ? cause.message : String(cause ?? "");
          const prismaCode =
            typeof (error as { code?: string }).code === "string"
              ? (error as { code?: string }).code
              : undefined;
          console.error(
            JSON.stringify({
              tag: "trpc_onError",
              path,
              type,
              message: error.message,
              code: error.code,
              prismaCode,
              cause: causeMsg?.slice(0, 500),
              name: error.name,
            }),
          );
          if (path === "syncUserAccount" && process.env.VERCEL === "1") {
            console.error(
              "[trpc] syncUserAccount failed on Vercel — check: DATABASE_URL pooled (-pooler for Neon), Prisma logs, Vercel Runtime logs for this invocation.",
            );
          }
        },
      });
    } catch (err) {
      logHandlerFailure(handler, "fetchRequestHandler", err, {
        durationMs: Date.now() - started,
      });
      return handlerInternalError(handler, err);
    }

    logHandlerDiag(handler, "done", {
      method: reqCtx.method,
      pathname: reqCtx.pathname,
      status: response.status,
      durationMs: Date.now() - started,
    });
    return response;
  } catch (err) {
    logHandlerFailure(handler, "handler", err, {
      durationMs: Date.now() - started,
    });
    return handlerInternalError(handler, err);
  }
});
