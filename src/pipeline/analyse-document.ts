import { classifyDocument } from "../ingestion/classifier";
import { extractDocument } from "../extraction/extractors";
import { buildEvidence } from "../evidence/builder";
import { deriveObservations } from "../domain/observations";
import type { Jurisdiction } from "../domain/models";

export function analyseDocument(input: { documentId: string; text: string; jurisdictionHint?: Jurisdiction }) {
  const [classification] = classifyDocument(input.text);
  const jurisdiction = input.jurisdictionHint ?? classification.jurisdiction;
  const extracted = extractDocument({
    documentId: input.documentId,
    documentType: classification.documentType,
    jurisdiction,
    text: input.text,
  });
  const evidence = buildEvidence(extracted);
  const observations = deriveObservations(evidence);
  return { classification, extracted, evidence, observations };
}
