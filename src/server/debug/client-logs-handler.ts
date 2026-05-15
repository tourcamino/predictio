import {
  defineEventHandler,
  getMethod,
  type H3Event,
} from "vinxi/http";

export default defineEventHandler(async (event: H3Event) => {
  if (getMethod(event) !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // This endpoint is best-effort browser diagnostics only. Never let logging
  // failures produce user-visible 500s or noisy FUNCTION_INVOCATION_FAILED logs.
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});
