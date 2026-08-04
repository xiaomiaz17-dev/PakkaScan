/**
 * PD-034 — Worker process entry: shared PostgreSQL repository, separate from API process.
 */

import { createRealPostgresTransport, readRealClientFlags } from "../storage/real-clients";
import { PostgresDriver } from "../storage/postgres-driver";
import { applyBootstrapMigration } from "../storage/migrations";
import { createJobWorker } from "./job-worker";
import { DependencyHealthRegistry } from "../production/health-probes";
import { FileProbeAudit } from "../production/probe-audit";
import { RELEASE_VERSION } from "../release/metadata";

async function main(): Promise<void> {
  const env = process.env;
  const databaseUrl = env.DATABASE_URL ?? "";
  if (!readRealClientFlags(env).enableRealPostgres || !databaseUrl) {
    console.error("Worker requires PAKKADEED_ENABLE_REAL_POSTGRES=1 and DATABASE_URL");
    process.exit(1);
  }

  if (env.PAKKADEED_AUTO_MIGRATE === "1") {
    const transport = await createRealPostgresTransport(databaseUrl);
    try {
      console.log(JSON.stringify({ migrate: await applyBootstrapMigration(transport) }));
    } finally {
      await transport.close();
    }
  }

  const transport = await createRealPostgresTransport(databaseUrl);
  const repository = new PostgresDriver({ connectionString: databaseUrl, transport });
  const health = new DependencyHealthRegistry();
  health.registerProbe("postgres", () => repository.probe());
  await repository.probe();

  const audit = new FileProbeAudit(env.PAKKADEED_PROBE_AUDIT_PATH ?? "./var/probe-audit.jsonl");
  void audit;
  const worker = createJobWorker({
    repository,
    health,
    pollIntervalMs: Number(env.PAKKADEED_WORKER_POLL_MS ?? 1000),
    handlers: {
      OCR: () => {},
      CLASSIFICATION: () => {},
      EXTRACTION: () => {},
      REPORT: () => {},
    },
  });
  worker.start();
  console.log(JSON.stringify({ service: "worker", version: RELEASE_VERSION }));

  const shutdown = () => {
    worker.stop();
    void transport.close().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
