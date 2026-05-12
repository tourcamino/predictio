import { QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  splitLink,
  httpBatchLink,
  httpSubscriptionLink,
  createTRPCClient,
  type Operation,
} from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";

// Now, with the newer @trpc/tanstack-react-query package, we no longer need createTRPCReact.
// We use createTRPCContext instead.
const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export { useTRPC, useTRPCClient };

/**
 * tRPC HTTP batch URL. Vinxi serves `/trpc` on the SPA origin.
 *
 * `VITE_API_URL` targets the REST Express app (`/api/*`, see `getApiBaseUrl`) and does not
 * expose tRPC. If we pointed the tRPC client at that host (e.g. api.predictio.live or
 * localhost:3001), market detail and every other procedure would fail while `/api/markets`
 * still worked — exactly the split-API vs SPA pattern this repo uses.
 *
 * So in the browser, whenever `VITE_API_URL` is a different origin than the page, use
 * `window.location.origin` for tRPC (same rule as local dev, extended to production).
 */
function getBaseUrl() {
  const viteApi = import.meta.env.VITE_API_URL as string | undefined;
  const apiTrimmed = viteApi?.trim().replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    if (apiTrimmed && apiTrimmed !== origin) {
      return origin;
    }
    if (apiTrimmed) return apiTrimmed;
    return origin;
  }
  const appTrimmed = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (appTrimmed) return appTrimmed.replace(/\/$/, "");
  return "http://127.0.0.1:5173";
}

/**
 * tRPC expects JSON (SuperJSON). Proxies, timeouts, and platform error pages often return
 * plain text/HTML — `response.json()` then throws `Unexpected token 'A'` on bodies like
 * "An error occurred...". Fail fast with a readable message instead.
 */
function fetchExpectingTrpcJson(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, init).then(async (res) => {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/event-stream")) {
      return res;
    }
    const text = await res.clone().text();
    if (!text.length) {
      return res;
    }
    try {
      JSON.parse(text);
      return res;
    } catch {
      const snippet = text.trim().replace(/\s+/g, " ").slice(0, 220);
      throw new Error(
        snippet ||
          `Trade API returned non-JSON (HTTP ${res.status} ${res.statusText})`,
      );
    }
  });
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          // Verbose request logging in dev noticeably slows the UI; log failures only.
          enabled: (opts) =>
            opts.direction === "down" && opts.result instanceof Error,
        }),
        splitLink({
          condition: (op: Operation) => op.type === "subscription",
          // Non-streaming batch: avoids "Stream closed" when proxies, SSR, or slow
          // Azuro payloads interrupt httpBatchStreamLink's chunked response.
          false: httpBatchLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
            maxURLLength: Infinity,
            fetch: fetchExpectingTrpcJson,
          }),
          true: httpSubscriptionLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
