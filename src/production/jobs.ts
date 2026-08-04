import { randomUUID } from "node:crypto";

export type JobStage = "MALWARE_SCAN" | "OCR" | "CLASSIFICATION" | "EXTRACTION" | "EVIDENCE" | "DECISION" | "REPORT";
export type JobState = "PENDING" | "RUNNING" | "RETRY_SCHEDULED" | "SUCCEEDED" | "DEAD_LETTER";
export type ProcessingJob = {
  id: string;
  documentId: string;
  stage: JobStage;
  state: JobState;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  lastError?: string;
};

export function createProcessingJob(documentId: string, stage: JobStage, maxAttempts = 3): ProcessingJob {
  if (maxAttempts < 1) throw new Error("maxAttempts must be positive");
  return { id: randomUUID(), documentId, stage, state: "PENDING", attempts: 0, maxAttempts };
}

export function runProcessingJob(job: ProcessingJob, handler: () => void, now = new Date()): ProcessingJob {
  if (["SUCCEEDED", "DEAD_LETTER"].includes(job.state)) return job;
  const running = { ...job, state: "RUNNING" as const, attempts: job.attempts + 1, nextAttemptAt: undefined };
  try {
    handler();
    return { ...running, state: "SUCCEEDED", lastError: undefined };
  } catch (error) {
    const lastError = error instanceof Error ? error.message : "Unknown processing error";
    if (running.attempts >= running.maxAttempts) return { ...running, state: "DEAD_LETTER", lastError };
    const delaySeconds = Math.min(300, 2 ** running.attempts);
    return {
      ...running,
      state: "RETRY_SCHEDULED",
      lastError,
      nextAttemptAt: new Date(now.getTime() + delaySeconds * 1000).toISOString(),
    };
  }
}
