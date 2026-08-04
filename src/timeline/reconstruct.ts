import type { ImmutableEvidence } from "../evidence/builder";
import { normalizeDate } from "../extraction/normalization";

export type TimelineEvent = {
  type: "IDENTITY" | "OWNERSHIP_RECORD" | "SALE" | "MORTGAGE" | "POWER_OF_ATTORNEY" | "ENCUMBRANCE_SEARCH" | "UNKNOWN";
  date?: string;
  documentId: string;
  evidenceIds: string[];
  description: string;
  confidence: number;
};

export function reconstructTimeline(evidence: ImmutableEvidence[]): TimelineEvent[] {
  const byDocument = new Map<string, ImmutableEvidence[]>();
  for (const item of evidence) byDocument.set(item.documentId, [...(byDocument.get(item.documentId) ?? []), item]);

  const events: TimelineEvent[] = [];
  for (const [documentId, items] of byDocument) {
    const type = items[0]?.documentType;
    const dateEvidence = items.find((item) => /date|period_end/i.test(item.field));
    const date = dateEvidence ? normalizeDate(dateEvidence.value) : undefined;
    const confidence = items.reduce((sum, item) => sum + item.confidence, 0) / Math.max(items.length, 1);
    const map: Record<string, TimelineEvent["type"]> = {
      IDENTITY_CNIC: "IDENTITY",
      IDENTITY_NICOP: "IDENTITY",
      FARD_CURRENT_OWNERSHIP: "OWNERSHIP_RECORD",
      MUTATION_SALE: "SALE",
      MUTATION_MORTGAGE: "MORTGAGE",
      GENERAL_POWER_OF_ATTORNEY: "POWER_OF_ATTORNEY",
      NON_ENCUMBRANCE_CERTIFICATE: "ENCUMBRANCE_SEARCH",
    };
    events.push({
      type: map[type ?? ""] ?? "UNKNOWN",
      date,
      documentId,
      evidenceIds: items.map((item) => item.id),
      description: `${type ?? "UNKNOWN"} recorded from ${items.length} evidence fields.`,
      confidence,
    });
  }

  return events.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}
