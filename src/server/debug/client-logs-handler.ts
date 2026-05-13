import {
  defineEventHandler,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from "h3";

export default defineEventHandler(async (event: H3Event) => {
  if (event.node.req.method !== "POST") {
    setResponseStatus(event, 405);
    return "Method not allowed";
  }

  // This endpoint is best-effort browser diagnostics only. Never let logging
  // failures produce user-visible 500s or noisy FUNCTION_INVOCATION_FAILED logs.
  setResponseHeader(event, "Content-Type", "application/json; charset=utf-8");
  return JSON.stringify({ success: true });
});
