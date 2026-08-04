/**
 * PD-040 — Refuse memory-store fallback in production when Postgres is required.
 */

export function assertProductionPersistence(env: Record<string, string | undefined> = process.env): void {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (nodeEnv !== "production") return;
  if (env.PAKKADEED_REQUIRE_POSTGRES === "1" || env.PAKKADEED_ENABLE_REAL_POSTGRES === "1") {
    if (!env.DATABASE_URL?.startsWith("postgres")) {
      throw new Error("FATAL: production requires DATABASE_URL PostgreSQL when PAKKADEED_REQUIRE_POSTGRES is set");
    }
  }
  if (env.PAKKADEED_ALLOW_MEMORY_STORE === "1") {
    throw new Error("FATAL: PAKKADEED_ALLOW_MEMORY_STORE is not permitted in production");
  }
}
