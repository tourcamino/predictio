export type DeployRuntimeMeta = {
  service: "predictio-backend";
  environment: string;
  gitCommitSha: string | null;
  gitCommitShort: string | null;
  gitBranch: string | null;
  buildTime: string | null;
};

/**
 * Read-only deploy identity (no secrets). Set via Docker build-args or container env.
 */
export function getDeployRuntimeMeta(): DeployRuntimeMeta {
  const sha = process.env.GIT_COMMIT_SHA?.trim() || null;
  const branch = process.env.GIT_BRANCH?.trim() || null;
  const environment = process.env.NODE_ENV || "development";
  const buildTime = process.env.BUILD_TIME_ISO?.trim() || null;

  return {
    service: "predictio-backend",
    environment,
    gitCommitSha: sha,
    gitCommitShort: sha ? sha.slice(0, 7) : null,
    gitBranch: branch,
    buildTime,
  };
}

/** JSON body for GET /api/v1/version and GET /api/version (deploy verification, no DB). */
export function getVersionEndpointBody(): DeployRuntimeMeta & {
  ok: true;
  timestamp: string;
  uptimeSec: number;
  runtime: {
    marketStatusSchedulerMs: number;
    marketStatusSchedulerNote: string;
    openRouterConfigured: boolean;
    azuroDataFeedConfigured: boolean;
  };
} {
  return {
    ok: true,
    ...getDeployRuntimeMeta(),
    uptimeSec: Math.floor(process.uptime()),
    runtime: {
      marketStatusSchedulerMs: 60_000,
      marketStatusSchedulerNote:
        "Curated lifecycle + auto-publish: one setInterval in jobs/marketStatusUpdater.ts, loaded once per Node process; Docker --force-recreate replaces the process (no orphan timers across deploys).",
      openRouterConfigured: Boolean(
        (process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY || "").trim(),
      ),
      azuroDataFeedConfigured: Boolean((process.env.AZURO_DATA_FEED_URL || "").trim()),
    },
    timestamp: new Date().toISOString(),
  };
}
