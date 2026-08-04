/**
 * PD-035 — Job completion notifications and processing status for customers.
 */

import { createHash } from "node:crypto";
import type { JobRecord } from "../storage/repository";
import type { EmailProvider } from "../deployment/providers";

export type JobCompletionEvent = {
  jobId: string;
  documentId: string;
  propertyId: string;
  stage: string;
  state: "SUCCEEDED" | "DEAD_LETTER";
  occurredAt: string;
  payloadHash: string;
};

export type ProcessingStatus = {
  propertyId: string;
  documentId?: string;
  overall: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  stages: Array<{ stage: string; state: string; updatedAt: string }>;
  reportReady: boolean;
  lastEvent?: JobCompletionEvent;
};

export function buildJobCompletionEvent(job: JobRecord, now = new Date()): JobCompletionEvent {
  if (job.state !== "SUCCEEDED" && job.state !== "DEAD_LETTER") {
    throw new Error(`Completion event only for terminal states, got ${job.state}`);
  }
  const base = {
    jobId: job.id,
    documentId: job.documentId,
    propertyId: job.propertyId,
    stage: job.stage,
    state: job.state as "SUCCEEDED" | "DEAD_LETTER",
    occurredAt: now.toISOString(),
  };
  return {
    ...base,
    payloadHash: createHash("sha256").update(JSON.stringify(base)).digest("hex"),
  };
}

export async function notifyJobCompletion(
  email: EmailProvider,
  input: { to: string; event: JobCompletionEvent },
): Promise<{ messageId: string }> {
  const template = input.event.state === "SUCCEEDED" ? "REPORT_READY" : "PROCESSING_FAILED";
  return email.send({
    to: input.to,
    template,
    variables: {
      jobId: input.event.jobId,
      documentId: input.event.documentId,
      propertyId: input.event.propertyId,
      stage: input.event.stage,
      state: input.event.state,
    },
  });
}

export function deriveProcessingStatus(input: {
  propertyId: string;
  documentId?: string;
  jobs: JobRecord[];
  lastEvent?: JobCompletionEvent;
}): ProcessingStatus {
  const stages = input.jobs.map((j) => ({
    stage: j.stage,
    state: j.state,
    updatedAt: j.updatedAt,
  }));
  const anyFailed = input.jobs.some((j) => j.state === "DEAD_LETTER");
  const allSucceeded = input.jobs.length > 0 && input.jobs.every((j) => j.state === "SUCCEEDED");
  const anyActive = input.jobs.some((j) => j.state === "PENDING" || j.state === "RUNNING" || j.state === "RETRY_SCHEDULED");
  let overall: ProcessingStatus["overall"] = "QUEUED";
  if (anyFailed) overall = "FAILED";
  else if (allSucceeded) overall = "READY";
  else if (anyActive || input.jobs.some((j) => j.state === "SUCCEEDED")) overall = "PROCESSING";
  return {
    propertyId: input.propertyId,
    documentId: input.documentId,
    overall,
    stages,
    reportReady: allSucceeded && input.jobs.some((j) => j.stage === "REPORT" || j.stage === "EXTRACTION" || j.stage === "CLASSIFICATION"),
    lastEvent: input.lastEvent,
  };
}
