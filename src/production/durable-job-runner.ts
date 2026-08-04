/**
 * PD-030 — Durable background job runner for analysis stages.
 * Jobs are persisted via DurableRepository so work survives process restart.
 * Execution is in-process for local/staging; a future worker process can
 * share the same repository contract.
 */

import { randomUUID } from "node:crypto";
import type { DurableRepository, JobRecord } from "../storage/repository";
import { createProcessingJob, runProcessingJob, type JobStage, type ProcessingJob } from "./jobs";

export type JobHandler = (job: JobRecord) => Promise<void> | void;

export type DurableJobRunnerOptions = {
  repository: DurableRepository;
  maxAttempts?: number;
  handlers?: Partial<Record<JobStage, JobHandler>>;
};

const DEFAULT_STAGES: JobStage[] = [
  "MALWARE_SCAN",
  "OCR",
  "CLASSIFICATION",
  "EXTRACTION",
  "EVIDENCE",
  "DECISION",
  "REPORT",
];

export class DurableJobRunner {
  private readonly repository: DurableRepository;
  private readonly maxAttempts: number;
  private readonly handlers: Partial<Record<JobStage, JobHandler>>;

  constructor(options: DurableJobRunnerOptions) {
    this.repository = options.repository;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.handlers = options.handlers ?? {};
  }

  async enqueueAnalysisPipeline(input: {
    documentId: string;
    propertyId: string;
    stages?: JobStage[];
  }): Promise<JobRecord[]> {
    const stages = input.stages ?? DEFAULT_STAGES;
    const created: JobRecord[] = [];
    const now = new Date().toISOString();
    for (const stage of stages) {
      const job: JobRecord = {
        id: randomUUID(),
        documentId: input.documentId,
        propertyId: input.propertyId,
        stage,
        state: "PENDING",
        attempts: 0,
        maxAttempts: this.maxAttempts,
        createdAt: now,
        updatedAt: now,
      };
      created.push(await this.repository.saveJob(job));
    }
    return created;
  }

  async processNext(now = new Date()): Promise<JobRecord | undefined> {
    const runnable = await this.repository.listRunnableJobs(now);
    if (!runnable.length) return undefined;
    // Oldest first
    runnable.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const next = runnable[0]!;
    return this.execute(next, now);
  }

  async processAvailable(limit = 10, now = new Date()): Promise<JobRecord[]> {
    const results: JobRecord[] = [];
    for (let i = 0; i < limit; i++) {
      const job = await this.processNext(now);
      if (!job) break;
      results.push(job);
    }
    return results;
  }

  async execute(job: JobRecord, now = new Date()): Promise<JobRecord> {
    const processing: ProcessingJob = {
      id: job.id,
      documentId: job.documentId,
      stage: job.stage as JobStage,
      state: job.state as ProcessingJob["state"],
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      nextAttemptAt: job.nextAttemptAt,
      lastError: job.lastError,
    };

    const handler = this.handlers[job.stage as JobStage];
    const updated = runProcessingJob(processing, () => {
      if (!handler) {
        // No-op success for stages without a registered handler (pipeline scaffolding).
        return;
      }
      const result = handler(job);
      // runProcessingJob is sync; if handler returns a promise we cannot await here.
      // Callers that need async handlers should use executeAsync.
      if (result && typeof (result as Promise<void>).then === "function") {
        throw new Error("Async handlers must use executeAsync");
      }
    }, now);

    const record: JobRecord = {
      ...job,
      state: updated.state,
      attempts: updated.attempts,
      nextAttemptAt: updated.nextAttemptAt,
      lastError: updated.lastError,
      updatedAt: now.toISOString(),
    };
    return this.repository.saveJob(record);
  }

  async executeAsync(job: JobRecord, now = new Date()): Promise<JobRecord> {
    const handler = this.handlers[job.stage as JobStage];
    const running: JobRecord = {
      ...job,
      state: "RUNNING",
      attempts: job.attempts + 1,
      nextAttemptAt: undefined,
      updatedAt: now.toISOString(),
    };
    await this.repository.saveJob(running);

    try {
      if (handler) await handler(job);
      const succeeded: JobRecord = {
        ...running,
        state: "SUCCEEDED",
        lastError: undefined,
        updatedAt: new Date().toISOString(),
      };
      return this.repository.saveJob(succeeded);
    } catch (error) {
      const lastError = error instanceof Error ? error.message : "Unknown processing error";
      if (running.attempts >= running.maxAttempts) {
        const dead: JobRecord = {
          ...running,
          state: "DEAD_LETTER",
          lastError,
          updatedAt: new Date().toISOString(),
        };
        return this.repository.saveJob(dead);
      }
      const delaySeconds = Math.min(300, 2 ** running.attempts);
      const retry: JobRecord = {
        ...running,
        state: "RETRY_SCHEDULED",
        lastError,
        nextAttemptAt: new Date(now.getTime() + delaySeconds * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return this.repository.saveJob(retry);
    }
  }

  async counts(): Promise<Record<string, number>> {
    const states = ["PENDING", "RUNNING", "RETRY_SCHEDULED", "SUCCEEDED", "DEAD_LETTER"];
    const result: Record<string, number> = {};
    for (const state of states) {
      result[state] = (await this.repository.listJobsByState(state)).length;
    }
    return result;
  }
}

export function createDefaultJobHandlers(): Partial<Record<JobStage, JobHandler>> {
  return {
    MALWARE_SCAN: () => { /* quarantine scan already enforced at upload boundary */ },
    OCR: () => { /* live OCR path is optional; text documents skip */ },
    CLASSIFICATION: () => {},
    EXTRACTION: () => {},
    EVIDENCE: () => {},
    DECISION: () => {},
    REPORT: () => {},
  };
}
