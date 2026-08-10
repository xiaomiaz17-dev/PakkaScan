import { classifyDocument } from "../ingestion/classifier";
import { extractDocument } from "../extraction/extractors";
import { buildEvidence } from "../evidence/builder";
import { deriveObservations } from "../domain/observations";
import type { DocumentType, Jurisdiction } from "../domain/models";

/**
 * Analyse a single document.
 *
 * If `documentTypeHint` is provided (from the API-level bestClassification),
 * it OVERRIDES the built-in classifier. This is important: the API layer
 * combines two classifiers (ingestion + intelligence) and we must not
 * re-classify here or we risk routing to the wrong extractor.
 */
export function analyseDocument(input: {
  documentId: string;
  text: string;
  jurisdictionHint?: Jurisdiction;
  documentTypeHint?: DocumentType;
}) {
  const [classification] = classifyDocument(input.text);
  const documentType = input.documentTypeHint ?? classification.documentType;
  const jurisdiction = input.jurisdictionHint ?? classification.jurisdiction;

  const extracted = extractDocument({
    documentId: input.documentId,
    documentType,
    jurisdiction,
    text: input.text,
  });
  const evidence = buildEvidence(extracted);
  const observations = deriveObservations(evidence);

  // Return the effective classification (what we actually used), not the raw
  // internal one — otherwise the UI shows one type while extraction ran another.
  const effectiveClassification = {
    ...classification,
    documentType,
    jurisdiction,
  };

  return { classification: effectiveClassification, extracted, evidence, observations };
}
