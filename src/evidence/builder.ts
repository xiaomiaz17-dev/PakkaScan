import { createHash, randomUUID } from "node:crypto";
import type { Evidence } from "../domain/models";
import type { ExtractedDocument } from "../extraction/types";
import { normalizeField } from "../extraction/normalization";

export type ImmutableEvidence = Evidence & {
  immutableHash: string;
  schemaVersion: string;
  version: number;
  supersedesEvidenceId?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  createdAt: string;
};

function hashEvidence(input: Omit<ImmutableEvidence, "id" | "immutableHash" | "createdAt">): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function buildEvidence(extracted: ExtractedDocument): ImmutableEvidence[] {
  return extracted.fields.map((raw) => {
    const base = {
      documentId: extracted.documentId,
      documentType: extracted.documentType,
      field: raw.field,
      value: raw.value,
      normalizedValue: normalizeField(raw.field, raw.value),
      confidence: raw.confidence,
      page: raw.page,
      boundingBox: raw.boundingBox,
      schemaVersion: extracted.schemaVersion,
      version: 1,
    };
    return {
      id: randomUUID(),
      ...base,
      immutableHash: hashEvidence(base),
      createdAt: new Date().toISOString(),
    };
  });
}

export function correctEvidence(
  prior: ImmutableEvidence,
  correction: { value: string; confidence?: number }
): ImmutableEvidence {
  const base = {
    documentId: prior.documentId,
    documentType: prior.documentType,
    field: prior.field,
    value: correction.value,
    normalizedValue: normalizeField(prior.field, correction.value),
    confidence: correction.confidence ?? 1,
    page: prior.page,
    boundingBox: prior.boundingBox,
    schemaVersion: prior.schemaVersion,
    version: prior.version + 1,
    supersedesEvidenceId: prior.id,
  };
  return {
    id: randomUUID(),
    ...base,
    immutableHash: hashEvidence(base),
    createdAt: new Date().toISOString(),
  };
}
