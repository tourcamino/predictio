import { defineEventHandler, type H3Event } from "vinxi/http";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root";
import { startAutonomousCopyAnalystScheduler } from "~/server/services/autonomousCopyAnalystScheduler";

try {
  startAutonomousCopyAnalystScheduler();
} catch (e) {
  console.error("[trpc] autonomous copy scheduler init failed:", e);
}

export default defineEventHandler((event: H3Event) => {
  const req = event.node.req;
  const host = req.headers.host ?? "predictio.live";
  const protocol = "https";
  const url = `${protocol}://${host}${req.url}`;

  const request = new Request(url, {
    method: req.method ?? "GET",
    headers: req.headers as HeadersInit,
    body:
      req.method !== "GET" && req.method !== "HEAD"
        ? (req as unknown as ReadableStream)
        : undefined,
    duplex: "half",
  } as RequestInit & { duplex: string });

  return fetchRequestHandler({
    endpoint: "",
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
