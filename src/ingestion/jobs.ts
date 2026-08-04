import { randomUUID } from "node:crypto";
import type { ProcessingJob } from "./types";

const stages: ProcessingJob["stage"][] = [
  "MALWARE_SCAN",
  "IMAGE_NORMALISATION",
  "OCR",
  "CLASSIFICATION",
  "EXTRACTION",
  "EVIDENCE_PERSISTENCE",
  "RULE_ANALYSIS",
];

export function createProcessingJobs(input: {
  uploadId: string;
  propertyId: string;
  storageKey: string;
  sha256: string;
}): ProcessingJob[] {
  const createdAt = new Date().toISOString();
  return stages.map((stage) => ({
    id: randomUUID(),
    ...input,
    stage,
    attempts: 0,
    createdAt,
  }));
}
