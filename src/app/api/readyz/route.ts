import { json } from "@/server/http";
import { readiness } from "@/production/health-endpoints";

export async function GET() {
  const requirePostgres = process.env.PAKKADEED_REQUIRE_POSTGRES === "1";
  let postgresConnected = false;
  if (requirePostgres) {
    try {
      const { getApplicationPgRepository } = await import("@/server/app-singleton");
      const probe = await getApplicationPgRepository().probe();
      postgresConnected = probe.ok;
    } catch {
      postgresConnected = false;
    }
  } else {
    postgresConnected = true;
  }

  let objectStorageConnected = true;
  if (process.env.PAKKADEED_ENABLE_REAL_OBJECT_STORAGE === "1") {
    objectStorageConnected = false;
    try {
      if (process.env.OBJECT_STORAGE_ENDPOINT) {
        const res = await fetch(`${process.env.OBJECT_STORAGE_ENDPOINT.replace(/\/$/, "")}/minio/health/live`, {
          signal: AbortSignal.timeout(2000),
        });
        objectStorageConnected = res.ok;
      }
    } catch {
      objectStorageConnected = false;
    }
  }

  const result = readiness({
    postgresConnected,
    requirePostgres,
    requireObjectStorage: process.env.PAKKADEED_ENABLE_REAL_OBJECT_STORAGE === "1",
    objectStorageConnected,
  });
  return json(result, result.ready ? 200 : 503);
}
