import { QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  splitLink,
  httpBatchStreamLink,
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

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return `http://localhost:3000`;
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        splitLink({
          condition: (op: Operation) => op.type === "subscription",
          false: httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
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
