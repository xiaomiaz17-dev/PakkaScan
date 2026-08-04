/**
 * PD-033 — Supervised multi-process job worker deployment helper.
 * Manages one or more JobWorker instances with restart policy and health reporting.
 * Designed for single-host supervision; orchestration systems can wrap the same contract.
 */

import { createJobWorker, type JobWorker, type JobWorkerOptions } from "./job-worker";
import type { DependencyHealthRegistry } from "../production/health-probes";
import type { ProbeAuditSink } from "../production/probe-audit";
import { createAuditEntry } from "../production/probe-audit";

export type WorkerInstanceState = {
  id: string;
  running: boolean;
  restarts: number;
  cycles: number;
  processed: number;
  lastError?: string;
};

export type SupervisedWorkerOptions = {
  workerCount?: number;
  maxRestarts?: number;
  workerOptions?: JobWorkerOptions;
  health?: DependencyHealthRegistry;
  audit?: ProbeAuditSink;
  environment?: string;
  createWorker?: (options: JobWorkerOptions) => JobWorker;
};

type ManagedWorker = {
  id: string;
  worker: JobWorker;
  restarts: number;
  lastError?: string;
};

export class SupervisedWorkerPool {
  private readonly workers: ManagedWorker[] = [];
  private readonly maxRestarts: number;
  private readonly workerOptions: JobWorkerOptions;
  private readonly health?: DependencyHealthRegistry;
  private readonly audit?: ProbeAuditSink;
  private readonly environment: string;
  private readonly createWorker: (options: JobWorkerOptions) => JobWorker;
  private started = false;

  constructor(options: SupervisedWorkerOptions = {}) {
    this.maxRestarts = options.maxRestarts ?? 5;
    this.workerOptions = options.workerOptions ?? {};
    this.health = options.health;
    this.audit = options.audit;
    this.environment = options.environment ?? "staging";
    this.createWorker = options.createWorker ?? createJobWorker;
    const count = Math.max(1, options.workerCount ?? 1);
    for (let i = 0; i < count; i++) {
      this.workers.push(this.spawn(`worker-${i + 1}`));
    }
  }

  private spawn(id: string, restarts = 0): ManagedWorker {
    const worker = this.createWorker({
      ...this.workerOptions,
      health: this.health,
    });
    return { id, worker, restarts };
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const managed of this.workers) {
      managed.worker.start();
    }
    if (this.health) {
      this.health.registerProbe("job-worker", async () => {
        const running = this.workers.filter((w) => w.worker.stats().running).length;
        const ok = this.started && running === this.workers.length;
        const detail = `supervised workers running=${running}/${this.workers.length}`;
        if (this.audit) {
          this.audit.append(
            createAuditEntry(
              {
                name: "job-worker",
                ok,
                latencyMs: 0,
                detail,
                checkedAt: new Date().toISOString(),
              },
              { environment: this.environment, gatedConnectedAfter: ok },
            ),
          );
        }
        return { ok, detail };
      });
    }
  }

  stop(): void {
    this.started = false;
    for (const managed of this.workers) {
      managed.worker.stop();
    }
  }

  /**
   * Restart a failed worker instance if under the restart budget.
   * Returns true when a restart was performed.
   */
  restart(id: string, error?: string): boolean {
    const index = this.workers.findIndex((w) => w.id === id);
    if (index < 0) return false;
    const prior = this.workers[index]!;
    if (prior.restarts >= this.maxRestarts) {
      prior.lastError = error ?? prior.lastError ?? "max restarts exceeded";
      prior.worker.stop();
      return false;
    }
    prior.worker.stop();
    const next = this.spawn(id, prior.restarts + 1);
    next.restarts = prior.restarts + 1;
    next.lastError = error;
    this.workers[index] = next;
    if (this.started) next.worker.start();
    return true;
  }

  status(): WorkerInstanceState[] {
    return this.workers.map((w) => {
      const stats = w.worker.stats();
      return {
        id: w.id,
        running: stats.running,
        restarts: w.restarts,
        cycles: stats.cycles,
        processed: stats.processed,
        lastError: w.lastError,
      };
    });
  }

  async tickAll(): Promise<number> {
    let total = 0;
    for (const managed of this.workers) {
      total += await managed.worker.tick();
    }
    return total;
  }
}

export function createSupervisedWorkerPool(options: SupervisedWorkerOptions = {}): SupervisedWorkerPool {
  return new SupervisedWorkerPool(options);
}


if (require.main === module) {
  const count = Number(process.env.PAKKADEED_WORKER_COUNT ?? 1);
  const pool = createSupervisedWorkerPool({
    workerCount: count,
    maxRestarts: Number(process.env.PAKKADEED_WORKER_MAX_RESTARTS ?? 5),
    workerOptions: { pollIntervalMs: Number(process.env.PAKKADEED_WORKER_POLL_MS ?? 1000) },
  });
  pool.start();
  console.log(`PakkaDeed supervised worker pool started (count=${count})`);
  const shutdown = () => {
    pool.stop();
    console.log("PakkaDeed supervised worker pool stopped");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
