/**
 * PD-032 — Production bootstrap with continuous probe gating.
 * Dependencies are configured eagerly but only marked production-ready
 * after ContinuousProbeGate records the required success streak.
 */

import { DependencyHealthRegistry, type DependencyName } from "./health-probes";
import { ContinuousProbeGate } from "./continuous-probes";
import { loadProductionConfig, type ProductionConfig } from "./config";
import { PostgresDriver, type SqlTransport } from "../storage/postgres-driver";
import { S3Driver, type HttpTransport } from "../storage/s3-driver";
import { StagingOcrProbe } from "../deployment/staging-ocr-probe";
import { FallbackOcrProvider, HttpLiveOcrProvider } from "../deployment/live-ocr";
import { FixtureOcrProvider } from "../deployment/providers";

export type BootstrapTransports = {
  sql?: SqlTransport;
  objectHttp?: HttpTransport;
  ocrHttp?: HttpTransport;
};

export type BootstrapOptions = {
  env?: Record<string, string | undefined>;
  transports?: BootstrapTransports;
  ocrFixtures?: Record<string, string>;
  requiredSuccesses?: number;
};

export type ProductionBootstrap = {
  config: ProductionConfig;
  health: DependencyHealthRegistry;
  gate: ContinuousProbeGate;
  postgres: PostgresDriver;
  objectStorage: S3Driver;
  ocr: FallbackOcrProvider;
  stagingOcr?: StagingOcrProbe;
  /** Run one probe cycle for all production dependencies. */
  cycle(): Promise<void>;
  /** True only when all gated dependencies are continuously healthy. */
  isProductionReady(): boolean;
};

const PRODUCTION_DEPS: DependencyName[] = ["postgres", "object-storage", "live-ocr"];

export function bootstrapProduction(options: BootstrapOptions = {}): ProductionBootstrap {
  const env = options.env ?? process.env;
  const config = loadProductionConfig(env);
  const health = new DependencyHealthRegistry();
  const gate = new ContinuousProbeGate(health, {
    requiredSuccesses: options.requiredSuccesses ?? 3,
  });

  const postgres = new PostgresDriver({
    connectionString: config.databaseUrl,
    transport: options.transports?.sql,
  });
  health.registerProbe("postgres", () => postgres.probe());

  const objectStorage = new S3Driver({
    bucket: config.objectStorageBucket,
    endpoint: env.OBJECT_STORAGE_ENDPOINT ?? "https://storage.example.invalid",
    accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY ?? "missing",
    secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY ?? "missing",
    transport: options.transports?.objectHttp,
  });
  health.registerProbe("object-storage", () => objectStorage.probe());

  let stagingOcr: StagingOcrProbe | undefined;
  const ocrBase = env.OCR_BASE_URL;
  const ocrKey = env.OCR_API_KEY;
  if (ocrBase && ocrKey) {
    stagingOcr = new StagingOcrProbe({
      baseUrl: ocrBase,
      apiKey: ocrKey,
      transport: options.transports?.ocrHttp,
    });
    health.registerProbe("live-ocr", () => stagingOcr!.probe());
  } else {
    health.registerProbe("live-ocr", async () => ({
      ok: false,
      detail: "OCR_BASE_URL / OCR_API_KEY not supplied",
    }));
  }

  const liveProvider = stagingOcr?.getProvider() ?? new HttpLiveOcrProvider();
  const fixture = new FixtureOcrProvider(options.ocrFixtures ?? {});
  const ocr = new FallbackOcrProvider(liveProvider, fixture, true);

  return {
    config,
    health,
    gate,
    postgres,
    objectStorage,
    ocr,
    stagingOcr,
    async cycle() {
      await gate.cycleAll(PRODUCTION_DEPS);
    },
    isProductionReady() {
      return PRODUCTION_DEPS.every((name) => gate.getState(name).gatedConnected);
    },
  };
}
