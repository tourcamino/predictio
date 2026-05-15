import { defineEventHandler, getRequestURL } from "vinxi/http";
import { minioBaseUrl } from "./minio";
import {
  handlerInternalError,
  handlerRequestContext,
  logHandlerDiag,
  logHandlerFailure,
} from "./lib/runtimeHandlerDiagnostics";

export default defineEventHandler(async (event) => {
  const handler = "og-image";
  const started = Date.now();
  const reqCtx = handlerRequestContext(event);
  logHandlerDiag(handler, "start", {
    method: reqCtx.method,
    pathname: reqCtx.pathname,
  });

  try {
    const requestUrl = getRequestURL(event);
    const url = requestUrl.pathname + requestUrl.search;

    const marketIdMatch = url.match(/\/api\/og\/([^/?]+)/);

    if (!marketIdMatch?.[1]) {
      const response = new Response("Missing market ID", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
      logHandlerDiag(handler, "done", {
        method: reqCtx.method,
        pathname: reqCtx.pathname,
        status: 400,
        durationMs: Date.now() - started,
      });
      return response;
    }

    const marketId = marketIdMatch[1];
    let imageUrl: string;
    try {
      imageUrl = `${minioBaseUrl}/og-images/market-${marketId}.png`;
    } catch (err) {
      logHandlerFailure(handler, "og_redirect_url", err, {
        durationMs: Date.now() - started,
      });
      return handlerInternalError(handler, err);
    }

    const response = new Response(null, {
      status: 302,
      headers: {
        Location: imageUrl,
        "Cache-Control": "public, max-age=60",
      },
    });
    logHandlerDiag(handler, "done", {
      method: reqCtx.method,
      pathname: reqCtx.pathname,
      status: 302,
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
