import { Client } from "minio";
import { env } from "./env";
import { getBaseUrl } from "./utils/base-url";

function computeMinioOrigin(): string {
  try {
    return new URL(getBaseUrl({ port: 9000 })).origin;
  } catch {
    const raw = env.BASE_URL?.trim() || "https://predictio.live";
    try {
      const withScheme = raw.startsWith("http") ? raw : `https://${raw}`;
      return new URL(withScheme).origin;
    } catch {
      return "https://predictio.live";
    }
  }
}

export const minioBaseUrl = computeMinioOrigin();

/**
 * Optional in local dev. When unset, features that depend on object storage should
 * degrade gracefully (OG image fetch falls back to defaults).
 */
export const minioClient: Client | null = (() => {
  if (!env.ADMIN_PASSWORD) return null;

  try {
    const minioUrl = new URL(minioBaseUrl);
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
  } catch {
    return null;
  }
})();
