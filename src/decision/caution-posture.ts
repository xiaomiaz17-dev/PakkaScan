/**
 * Phase 1 decision posture: false negatives cost more than false positives.
 * Prefer caution states when confidence is low or evidence is incomplete.
 */

export type DecisionPosture = "CLEAR" | "PROCEED_WITH_CAUTION" | "BLOCKER_REVIEW";

export type PostureInput = {
  pakkaScore: number;
  materialIssueCount: number;
  minEvidenceConfidence: number;
  requiredDocumentCoverage: number;
  /** True when OCR/extraction quality is degraded (handwriting, poor scan). */
  lowCaptureQuality?: boolean;
};

/**
 * Maps score + evidence health to a customer-facing posture.
 * Uncertain or incomplete packets never resolve to CLEAR.
 */
export function resolveDecisionPosture(input: PostureInput): DecisionPosture {
  if (input.materialIssueCount > 0) {
    return input.pakkaScore < 40 ? "BLOCKER_REVIEW" : "PROCEED_WITH_CAUTION";
  }
  if (input.lowCaptureQuality) {
    return "PROCEED_WITH_CAUTION";
  }
  if (input.minEvidenceConfidence < 0.55 || input.requiredDocumentCoverage < 0.7) {
    return "PROCEED_WITH_CAUTION";
  }
  if (input.pakkaScore >= 80 && input.minEvidenceConfidence >= 0.7 && input.requiredDocumentCoverage >= 0.85) {
    return "CLEAR";
  }
  return "PROCEED_WITH_CAUTION";
}
