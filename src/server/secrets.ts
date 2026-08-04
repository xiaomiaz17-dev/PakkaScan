/**
 * Production secret loading — no known fallback secrets in production.
 */

export function resolveStorageSecret(env: Record<string, string | undefined> = process.env): string {
  const value = env.PAKKADEED_STORAGE_SECRET?.trim();
  const nodeEnv = env.NODE_ENV ?? "development";
  if (nodeEnv === "production") {
    if (!value) {
      throw new Error("FATAL: PAKKADEED_STORAGE_SECRET is required in production");
    }
    if (value.length < 32) {
      throw new Error("FATAL: PAKKADEED_STORAGE_SECRET must be at least 32 characters in production");
    }
    if (value.includes("change-before-production") || value === "local-beta-storage-secret-change-before-production") {
      throw new Error("FATAL: PAKKADEED_STORAGE_SECRET must not use the development fallback value");
    }
    return value;
  }
  // Development / test only
  return value && value.length > 0 ? value : "local-beta-storage-secret-change-before-production";
}
