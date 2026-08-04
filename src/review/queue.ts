import { randomUUID } from "node:crypto";
import type { ClassificationCandidate, ReviewItem } from "../ingestion/types";

export function createClassificationReview(input: {
  documentId: string;
  propertyId: string;
  topCandidate: ClassificationCandidate;
}): ReviewItem | null {
  if (input.topCandidate.documentType === "UNKNOWN" || input.topCandidate.confidence < 0.7) {
    return {
      id: randomUUID(),
      documentId: input.documentId,
      propertyId: input.propertyId,
      reasonCode: "LOW_CLASSIFICATION_CONFIDENCE",
      priority: input.topCandidate.confidence < 0.35 ? "HIGH" : "MEDIUM",
      summary: `Classification confidence ${(input.topCandidate.confidence * 100).toFixed(0)}% for ${input.topCandidate.documentType}.`,
      createdAt: new Date().toISOString(),
    };
  }
  return null;
}
