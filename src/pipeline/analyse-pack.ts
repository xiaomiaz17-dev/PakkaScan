import type { Jurisdiction, Observation } from "../domain/models";
import { evaluateObservations } from "../domain/engine";
import { analyseDocument } from "./analyse-document";
import { resolvePeople, resolveProperties } from "../resolution/entities";
import { reconstructTimeline } from "../timeline/reconstruct";
import { deriveCrossDocumentObservations } from "../decision/cross-document";
import { assessMissingEvidence } from "../decision/requirements";
import { calculateCategoryScores, calculateTrustScore } from "../decision/scoring";
export type PackDocumentInput = { documentId: string; text: string; jurisdictionHint?: Jurisdiction };
export function analysePropertyPack(input: { jurisdiction: Jurisdiction; documents: PackDocumentInput[]; asOf?: Date }) {
  const documents = input.documents.map(analyseDocument);
  const evidence = documents.flatMap((document) => document.evidence);
  const observations: Observation[] = [...documents.flatMap((document) => document.observations), ...deriveCrossDocumentObservations(evidence, input.asOf)];
  const analysis = evaluateObservations(observations, input.jurisdiction);
  const required = assessMissingEvidence(evidence);
  analysis.categoryScores = calculateCategoryScores(analysis.findings);
  analysis.trustScore = calculateTrustScore({ evidence, findings: analysis.findings, requiredDocumentCoverage: required.coverage });
  return { documents, evidence, observations, missingEvidence: required.missing, people: resolvePeople(evidence), properties: resolveProperties(evidence), timeline: reconstructTimeline(evidence), analysis };
}
