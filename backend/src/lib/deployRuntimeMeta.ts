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
