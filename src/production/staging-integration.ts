/**
 * PD-034 — Staging integration harness for real PostgreSQL + object storage.
 * Live execution requires Docker Compose and feature flags.
 * Unit tests exercise the control flow with injectable transports only.
 */

import { createRealPostgresTransport, createRealObjectStorageTransport, readRealClientFlags } from "../storage/real-clients";
import { PostgresDriver } from "../storage/postgres-driver";
import { S3Driver } from "../storage/s3-driver";
import { applyBootstrapMigration } from "../storage/migrations";
import { DurableJobRunner } from "./durable-job-runner";
import { DependencyHealthRegistry } from "./health-probes";
import { ContinuousProbeGate } from "./continuous-probes";
import { MemoryProbeAudit, type ProbeAuditSink } from "./probe-audit";
import type { SqlTransport } from "../storage/postgres-driver";
import type { HttpTransport } from "../storage/s3-driver";

export type StagingIntegrationOptions = {
  env?: Record<string, string | undefined>;
  sqlTransport?: SqlTransport;
  objectHttp?: HttpTransport;
  audit?: ProbeAuditSink;
  requiredSuccesses?: number;
  /** When true, attempt real clients (still needs flags + packages). */
  preferRealClients?: boolean;
};

export type StagingIntegrationResult = {
  migrated: boolean;
  productionReady: boolean;
  jobsSucceeded: number;
  probeEntries: number;
  detail: string;
  usedRealPostgres: boolean;
  usedRealObjectStorage: boolean;
};

export async function runStagingJobShareIntegration(
  options: StagingIntegrationOptions = {},
): Promise<StagingIntegrationResult> {
  const env = options.env ?? process.env;
  const flags = readRealClientFlags(env);
  const audit = options.audit ?? new MemoryProbeAudit();
  const health = new DependencyHealthRegistry();
  const gate = new ContinuousProbeGate(
    health,
    { requiredSuccesses: options.requiredSuccesses ?? 2 },
    { audit, environment: "staging" },
  );

  let sql = options.sqlTransport;
  let usedRealPostgres = false;
  if (!sql && options.preferRealClients && flags.enableRealPostgres) {
    sql = await createRealPostgresTransport(env.DATABASE_URL ?? "");
    usedRealPostgres = true;
  }
  if (!sql) {
    return {
      migrated: false,
      productionReady: false,
      jobsSucceeded: 0,
      probeEntries: 0,
      detail: "No SQL transport — supply injectable transport or enable real Postgres with Docker",
      usedRealPostgres: false,
      usedRealObjectStorage: false,
    };
  }

  let objectHttp = options.objectHttp;
  let usedRealObjectStorage = false;
  if (!objectHttp && options.preferRealClients && flags.enableRealObjectStorage) {
    objectHttp = await createRealObjectStorageTransport({
      accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY ?? "",
      secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY ?? "",
    });
    usedRealObjectStorage = true;
  }

  const postgres = new PostgresDriver({
    connectionString: env.DATABASE_URL ?? "postgresql://local/pakkadeed",
    transport: sql,
  });
  health.registerProbe("postgres", () => postgres.probe());

  if (objectHttp) {
    const s3 = new S3Driver({
      bucket: env.OBJECT_STORAGE_BUCKET ?? "pakkadeed",
      endpoint: env.OBJECT_STORAGE_ENDPOINT ?? "http://localhost:9000",
      accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY ?? "minio",
      secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY ?? "minio",
      transport: objectHttp,
    });
    health.registerProbe("object-storage", () => s3.probe());
  } else {
    health.registerProbe("object-storage", async () => ({ ok: false, detail: "object storage transport not supplied" }));
  }

  // Continuous probes
  for (let i = 0; i < (options.requiredSuccesses ?? 2); i++) {
    await gate.cycle("postgres");
    if (objectHttp) await gate.cycle("object-storage");
  }

  const pgReady = gate.getState("postgres").gatedConnected;
  if (!pgReady) {
    return {
      migrated: false,
      productionReady: false,
      jobsSucceeded: 0,
      probeEntries: audit.list().length,
      detail: "PostgreSQL continuous probes did not succeed",
      usedRealPostgres,
      usedRealObjectStorage,
    };
  }

  await applyBootstrapMigration(sql);

  // API-side enqueue
  const apiRunner = new DurableJobRunner({
    repository: postgres,
    handlers: { OCR: () => {}, CLASSIFICATION: () => {}, EXTRACTION: () => {} },
  });
  await apiRunner.enqueueAnalysisPipeline({
    documentId: "doc-live-share",
    propertyId: "prop-live-share",
    stages: ["OCR", "CLASSIFICATION", "EXTRACTION"],
  });

  // Worker-side process (separate runner instance, shared transport/repository)
  const workerRunner = new DurableJobRunner({
    repository: postgres,
    handlers: { OCR: () => {}, CLASSIFICATION: () => {}, EXTRACTION: () => {} },
  });
  const processed = await workerRunner.processAvailable(10);

  const counts = await apiRunner.counts();
  const productionReady =
    gate.getState("postgres").gatedConnected &&
    (!objectHttp || gate.getState("object-storage").gatedConnected) &&
    counts.SUCCEEDED >= 3;

  return {
    migrated: true,
    productionReady,
    jobsSucceeded: counts.SUCCEEDED,
    probeEntries: audit.list().length,
    detail: productionReady
      ? `Shared job pipeline OK (${processed} processed this cycle)`
      : `Partial: succeeded=${counts.SUCCEEDED} processed=${processed}`,
    usedRealPostgres,
    usedRealObjectStorage,
  };
}

/**
 * 24h continuous probe window tracker (PD-034).
 * Records whether the required streak was held across a sequence of cycles.
 */
export class ProbeWindowTracker {
  private readonly results: boolean[] = [];
  constructor(private readonly windowSize: number) {}

  record(ok: boolean): void {
    this.results.push(ok);
    if (this.results.length > this.windowSize) this.results.shift();
  }

  /** True when the window is full and every sample is successful. */
  isStable(): boolean {
    return this.results.length >= this.windowSize && this.results.every(Boolean);
  }

  summary(): { samples: number; successes: number; stable: boolean } {
    return {
      samples: this.results.length,
      successes: this.results.filter(Boolean).length,
      stable: this.isStable(),
    };
  }
}
