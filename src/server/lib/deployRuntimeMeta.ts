export type DeployRuntimeMeta = {
  service: "predictio-web";
  environment: string;
  gitCommitSha: string | null;
  gitCommitShort: string | null;
  gitBranch: string | null;
  buildTime: string | null;
  vercelDeploymentId: string | null;
};

/**
 * Read-only deploy identity for `/api/version` (no secrets).
 * Vercel sets VERCEL_* automatically; Docker backend can set GIT_* / BUILD_TIME_ISO at build or runtime.
 */
export function getDeployRuntimeMeta(): DeployRuntimeMeta {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GIT_COMMIT_SHA?.trim() ||
    null;
  const branch =
    process.env.VERCEL_GIT_COMMIT_REF?.trim() ||
    process.env.GITHUB_REF_NAME?.trim() ||
    process.env.GIT_BRANCH?.trim() ||
    null;
  const environment =
    process.env.VERCEL_ENV?.trim() ||
    process.env.VITE_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV ||
    "development";
  const buildTime =
    process.env.BUILD_TIME_ISO?.trim() ||
    process.env.DEPLOY_BUILD_TIME?.trim() ||
    null;

  return {
    service: "predictio-web",
    environment,
    gitCommitSha: sha,
    gitCommitShort: sha ? sha.slice(0, 7) : null,
    gitBranch: branch,
    buildTime,
    vercelDeploymentId: process.env.VERCEL_DEPLOYMENT_ID?.trim() || null,
  };
}
