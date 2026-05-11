import {
  defineEventHandler,
  toWebRequest,
  type H3Event,
} from "vinxi/http";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root";
import { startAutonomousCopyAnalystScheduler } from "~/server/services/autonomousCopyAnalystScheduler";

startAutonomousCopyAnalystScheduler();

export default defineEventHandler((event: H3Event) => {
  const request = toWebRequest(event);
  if (!request) {
    return new Response("No request", { status: 400 });
  }

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
