import type { ImmutableEvidence } from "../evidence/builder";
import { normalizeIdentityNumber, normalizePersonName, normalizePropertyReference } from "../extraction/normalization";

export type PersonCandidate = {
  canonicalName: string;
  identityNumber?: string;
  aliases: string[];
  evidenceIds: string[];
  confidence: number;
};

export type PropertyCandidate = {
  canonicalReference: string;
  evidenceIds: string[];
  confidence: number;
};

const personFields = /owner|seller|buyer|principal|attorney|mortgagor|mortgagee|name/i;

export function resolvePeople(evidence: ImmutableEvidence[]): PersonCandidate[] {
  const identities = new Map<string, string>();
  for (const item of evidence.filter((item) => /identity_number|cnic/i.test(item.field))) {
    identities.set(item.documentId, normalizeIdentityNumber(item.value));
  }

  const groups = new Map<string, PersonCandidate>();
  for (const item of evidence.filter((item) => personFields.test(item.field) && !/identity_number/i.test(item.field))) {
    const canonicalName = normalizePersonName(item.value);
    if (!canonicalName) continue;
    const key = identities.get(item.documentId) || canonicalName;
    const current = groups.get(key) ?? {
      canonicalName,
      identityNumber: identities.get(item.documentId),
      aliases: [],
      evidenceIds: [],
      confidence: 0,
    };
    current.aliases.push(item.value);
    current.evidenceIds.push(item.id);
    current.confidence = Math.max(current.confidence, item.confidence);
    groups.set(key, current);
  }
  return [...groups.values()].map((group) => ({ ...group, aliases: [...new Set(group.aliases)] }));
}

export function resolveProperties(evidence: ImmutableEvidence[]): PropertyCandidate[] {
  const groups = new Map<string, PropertyCandidate>();
  for (const item of evidence.filter((item) => /khasra|property_reference/i.test(item.field))) {
    const canonicalReference = normalizePropertyReference(item.value);
    if (!canonicalReference) continue;
    const current = groups.get(canonicalReference) ?? { canonicalReference, evidenceIds: [], confidence: 0 };
    current.evidenceIds.push(item.id);
    current.confidence = Math.max(current.confidence, item.confidence);
    groups.set(canonicalReference, current);
  }
  return [...groups.values()];
}
