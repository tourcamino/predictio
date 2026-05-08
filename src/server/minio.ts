import { Client } from "minio";
import { env } from "./env";
import { getBaseUrl } from "./utils/base-url";

const minioUrl = new URL(getBaseUrl({ port: 9000 }));

export const minioBaseUrl = minioUrl.origin;

/**
 * Optional in local dev. When unset, features that depend on object storage should
 * degrade gracefully (OG image fetch falls back to defaults).
 */
export const minioClient: Client | null = (() => {
  if (!env.ADMIN_PASSWORD) return null;

  const port =
    minioUrl.port !== ""
      ? Number(minioUrl.port)
      : minioUrl.protocol === "https:"
        ? 443
        : 80;

  return new Client({
    endPoint: minioUrl.hostname,
    port,
    useSSL: minioUrl.protocol === "https:",
    accessKey: "admin",
    secretKey: env.ADMIN_PASSWORD,
  });
})();
