import { defineEventHandler, getRequestURL, type H3Event } from "vinxi/http";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root";
import { startAutonomousCopyAnalystScheduler } from "~/server/services/autonomousCopyAnalystScheduler";

try {
  startAutonomousCopyAnalystScheduler();
} catch (e) {
  console.error("[trpc] autonomous copy scheduler init failed:", e);
}

export default defineEventHandler((event: H3Event) => {
  const url = getRequestURL(event);
  const request = new Request(url, {
    method: event.node.req.method ?? "GET",
    headers: event.node.req.headers as HeadersInit,
    body:
      event.node.req.method !== "GET" && event.node.req.method !== "HEAD"
        ? (event.node.req as unknown as ReadableStream)
        : undefined,
    duplex: "half",
  } as RequestInit & { duplex: string });

  return fetchRequestHandler({
    endpoint: "/trpc",
    req: request,
    router: appRouter,
    createContext() {
      return {};
    },
    onError({ error, path }) {
      console.error(`tRPC error on '${path}':`, error);
    },
  });
});
