/**
 * PD-031 — Standalone durable job worker process.
 * Shares the DurableRepository contract with the API process.
 * Polls for runnable jobs and executes registered handlers.
 */

import { DurableJobRunner, createDefaultJobHandlers, type DurableJobRunnerOptions } from "../production/durable-job-runner";
import { MemoryDurableRepository, type DurableRepository } from "../storage/repository";
import type { DependencyHealthRegistry } from "../production/health-probes";

export type JobWorkerOptions = {
  repository?: DurableRepository;
  pollIntervalMs?: number;
  batchSize?: number;
  handlers?: DurableJobRunnerOptions["handlers"];
  health?: DependencyHealthRegistry;
  now?: () => Date;
};

export class JobWorker {
  private readonly runner: DurableJobRunner;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly health?: DependencyHealthRegistry;
  private readonly now: () => Date;
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private cycles = 0;
  private processed = 0;

  constructor(options: JobWorkerOptions = {}) {
    const repository = options.repository ?? new MemoryDurableRepository();
    this.runner = new DurableJobRunner({
      repository,
      handlers: options.handlers ?? createDefaultJobHandlers(),
    });
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
    this.batchSize = options.batchSize ?? 5;
    this.health = options.health;
    this.now = options.now ?? (() => new Date());
  }

  getRunner(): DurableJobRunner {
    return this.runner;
  }

  stats(): { running: boolean; cycles: number; processed: number } {
    return { running: this.running, cycles: this.cycles, processed: this.processed };
  }

  async tick(): Promise<number> {
    this.cycles += 1;
    const results = await this.runner.processAvailable(this.batchSize, this.now());
    this.processed += results.length;
    return results.length;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      void this.tick().catch(() => {
        // Keep worker alive; individual job failures are recorded on the job record.
      });
    }, this.pollIntervalMs);
    if (this.health) {
      this.health.registerProbe("job-worker", async () => ({
        ok: this.running,
        detail: this.running
          ? `Worker running; cycles=${this.cycles} processed=${this.processed}`
          : "Worker stopped",
      }));
    }
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

/** Factory used by the CLI entrypoint and tests. */
export function createJobWorker(options: JobWorkerOptions = {}): JobWorker {
  return new JobWorker(options);
}

if (require.main === module) {
  const pollIntervalMs = Number(process.env.PAKKADEED_WORKER_POLL_MS ?? 1000);
  const worker = createJobWorker({ pollIntervalMs });
  worker.start();
  console.log(`PakkaDeed job worker started (poll=${pollIntervalMs}ms)`);
  const shutdown = () => {
    worker.stop();
    console.log("PakkaDeed job worker stopped");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
