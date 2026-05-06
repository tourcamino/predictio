import { baseProcedure } from "~/server/trpc/main";
import { minioBaseUrl } from "~/server/minio";

export const getMinioBaseUrl = baseProcedure.query(async () => {
  return {
    baseUrl: minioBaseUrl,
  };
});
