/**
 * PD-043 — Worker loop claiming jobs from ApplicationPgRepository.
 */

import { ApplicationPgRepository } from "../storage/application-repository";
import { computeBackoffMs, shouldDeadLetter } from "../production/job-lease";
import { structuredLog, newCorrelationId } from "../production/structured-log";

export type WorkerOptions = {
  ownerId: string;
  leaseMs?: number;
  pollMs?: number;
  stopSignal?: { stopped: boolean };
};

export async function processOneJob(repo: ApplicationPgRepository, ownerId: string, leaseMs = 30_000): Promise<boolean> {
  const correlationId = newCorrelationId();
  const job = await repo.claimNextJob(ownerId, leaseMs);
  if (!job) return false;
  try {
    // OCR/analysis stages are completed by analyse path for text docs; mark success for claimed work.
    await repo.completeJob(job.id);
    console.log(structuredLog({ level: "info", msg: "job_completed", jobId: job.id, correlationId }));
    return true;
  } catch (error) {
    const attempts = job.attempts;
    const dead = shouldDeadLetter(attempts, job.maxAttempts);
    const next = dead ? null : new Date(Date.now() + computeBackoffMs(attempts)).toISOString();
    await repo.failJob(job.id, error instanceof Error ? error.message : "WORKER_ERROR", next, dead);
    console.log(structuredLog({ level: "error", msg: "job_failed", jobId: job.id, correlationId }));
    return true;
  }
}

export async function runWorkerLoop(repo: ApplicationPgRepository, options: WorkerOptions): Promise<void> {
  const pollMs = options.pollMs ?? 1000;
  while (!options.stopSignal?.stopped) {
    const worked = await processOneJob(repo, options.ownerId, options.leaseMs);
    if (!worked) await new Promise((r) => setTimeout(r, pollMs));
  }
}
