/**
 * Phase 2 intelligence orchestration on the web stack (deterministic core).
 */

import type { Evidence, Jurisdiction } from "../domain/models";
import { deriveObservations } from "../domain/observations";
import { deriveCrossDocumentObservations } from "../decision/cross-document";
import { assessMissingEvidence } from "../decision/requirements";
import { evaluateObservations } from "../domain/engine";
import { classifyFromText } from "./document-classifier";
import { explainFindings } from "./explain-finding";
import { answerWithEvidence } from "./assistant-policy";
import { resolveDecisionPosture } from "../decision/caution-posture";
import { tenancyProfileFor } from "./tenancy-jurisdiction";
import { propertyProfileFor } from "./property-jurisdiction";

export function runPhase2Analysis(input: {
  evidence: Evidence[];
  jurisdiction: Jurisdiction;
  /** Optional free text used only for classification hints — not for scoring. */
  rawTextHint?: string;
}) {
  const classification = input.rawTextHint
    ? classifyFromText(input.rawTextHint)
    : { documentType: "UNKNOWN" as const, confidence: 0, matchedCues: [] as string[] };

  const fieldObs = deriveObservations(input.evidence);
  const crossObs = deriveCrossDocumentObservations(input.evidence);
  const byCode = new Map(fieldObs.map((o) => [o.code, o]));
  for (const o of crossObs) byCode.set(o.code, o);
  const observations = [...byCode.values()];
  const missing = assessMissingEvidence(input.evidence);
  const analysis = evaluateObservations(observations, input.jurisdiction);
  const explanations = explainFindings(analysis.findings);

  const minConf =
    input.evidence.length === 0
      ? 0
      : Math.min(...input.evidence.map((e) => e.confidence));
  const coverage = Math.min(1, input.evidence.length / 4);
  const lowCapture = input.evidence.some((e) => e.confidence < 0.55);
  const posture = resolveDecisionPosture({
    lowCaptureQuality: lowCapture,
    pakkaScore: analysis.pakkaScore ?? 0,
    materialIssueCount:
      analysis.blockers + analysis.findings.filter((f) => f.effect === "DEDUCTION").length,
    minEvidenceConfidence: minConf,
    requiredDocumentCoverage: coverage,
  });

  const assistant = answerWithEvidence({
    mode: "summarise_report",
    reportSummary: `Decision ${analysis.decision}; posture ${posture}; findings ${analysis.findings.length}.`,
    evidenceRefs: input.evidence.slice(0, 5).map((e) => e.id),
  });

  return {
    classification,
    observations,
    analysis,
    explanations,
    posture,
    assistant,
    missingEvidence: missing,
    tenancyJurisdiction: tenancyProfileFor(input.jurisdiction),
    propertyJurisdiction: propertyProfileFor(input.jurisdiction),
  };
}
