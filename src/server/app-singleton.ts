/**
 * PD-041 — Application bootstrap.
 * Production requires PostgreSQL; never selects memory/JSON persistence.
 */

import { BetaApplication } from "../runtime/beta-application";
import { JsonFileRuntimeStateStore, MemoryRuntimeStateStore } from "../runtime/durable-store";
import { resolveStorageSecret } from "./secrets";
import { assertProductionPersistence } from "./production-guard";
import { readRealClientFlags, createRealPostgresTransport } from "../storage/real-clients";
import { applyBootstrapMigration } from "../storage/migrations";
import { ApplicationPgRepository } from "../storage/application-repository";
import type { SqlTransport } from "../storage/postgres-driver";

declare global {
  /* eslint-disable no-var */
  let __pakkadeedApp: BetaApplication | undefined;
  let __pakkadeedPgRepo: ApplicationPgRepository | undefined;
  let __pakkadeedSql: SqlTransport | undefined;
  /* eslint-enable no-var */
}

export async function bootstrapPostgresApplication(): Promise<{
  transport: SqlTransport;
  repository: ApplicationPgRepository;
}> {
  assertProductionPersistence();
  const flags = readRealClientFlags();
  const requirePg =
    process.env.PAKKADEED_REQUIRE_POSTGRES === "1" || flags.enableRealPostgres;
  const databaseUrl = process.env.DATABASE_URL;
  if (requirePg) {
    if (!databaseUrl?.startsWith("postgres")) {
      throw new Error("FATAL: DATABASE_URL PostgreSQL required");
    }
    process.env.PAKKADEED_ENABLE_REAL_POSTGRES = "1";
    const transport = await createRealPostgresTransport(databaseUrl);
    const probe = await transport.query("SELECT 1 AS ok");
    if (!probe.rows.length) throw new Error("FATAL: PostgreSQL probe failed");
    if (process.env.PAKKADEED_AUTO_MIGRATE === "1") {
      await applyBootstrapMigration(transport);
    }
    const repository = new ApplicationPgRepository(transport);
    const health = await repository.probe();
    if (!health.ok) throw new Error(`FATAL: application repository probe failed: ${health.detail}`);
    (globalThis as unknown as Record<string, unknown>).__pakkadeedSql = transport;
    (globalThis as unknown as Record<string, unknown>).__pakkadeedPgRepo = repository;
    return { transport, repository };
  }
  throw new Error("FATAL: bootstrapPostgresApplication called without postgres requirement");
}

/**
 * Synchronous get for unit/dev paths.
 * Production paths that require Postgres must call bootstrapPostgresApplication first
 * and use getApplicationPgRepository().
 */
export function getBetaApplication(): BetaApplication {
  assertProductionPersistence();
  const globalApp = (globalThis as unknown as Record<string, unknown>).__pakkadeedApp as BetaApplication | undefined;
  const globalPgRepo = (globalThis as unknown as Record<string, unknown>).__pakkadeedPgRepo as ApplicationPgRepository | undefined;

  if (globalApp) return globalApp;

  const nodeEnv = process.env.NODE_ENV ?? "development";
  const requirePg =
    process.env.PAKKADEED_REQUIRE_POSTGRES === "1" ||
    process.env.PAKKADEED_ENABLE_REAL_POSTGRES === "1";

  if (nodeEnv === "production" && requirePg) {
    if (!globalPgRepo) {
      throw new Error(
        "FATAL: production PostgreSQL repository not bootstrapped — call bootstrapPostgresApplication() before serving traffic",
      );
    }
  }

  const statePath = process.env.PAKKADEED_STATE_PATH;
  const store =
    nodeEnv === "production" && requirePg
      ? new MemoryRuntimeStateStore()
      : statePath
        ? new JsonFileRuntimeStateStore(statePath)
        : new MemoryRuntimeStateStore();

  if (nodeEnv === "production" && requirePg && !process.env.DATABASE_URL) {
    throw new Error("FATAL: production requires DATABASE_URL");
  }

  const app = new BetaApplication({
    store,
    storageSecret: resolveStorageSecret(),
    maxUploadBytes: Number(process.env.PAKKADEED_MAX_UPLOAD_BYTES ?? 15 * 1024 * 1024),
  });
  (globalThis as unknown as Record<string, unknown>).__pakkadeedApp = app;
  return app;
}

export function getApplicationPgRepository(): ApplicationPgRepository {
  const globalPgRepo = (globalThis as unknown as Record<string, unknown>).__pakkadeedPgRepo as ApplicationPgRepository | undefined;
  if (!globalPgRepo) {
    throw new Error("PostgreSQL application repository is not initialized");
  }
  return globalPgRepo;
}

export function resetBetaApplicationForTests(): BetaApplication {
  (globalThis as unknown as Record<string, unknown>).__pakkadeedApp = undefined;
  (globalThis as unknown as Record<string, unknown>).__pakkadeedPgRepo = undefined;
  (globalThis as unknown as Record<string, unknown>).__pakkadeedSql = undefined;
  return getBetaApplication();
}

export function bindApplicationPgRepositoryForTests(repo: ApplicationPgRepository): void {
  (globalThis as unknown as Record<string, unknown>).__pakkadeedPgRepo = repo;
}