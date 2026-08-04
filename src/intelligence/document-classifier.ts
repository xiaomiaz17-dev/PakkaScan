/**
 * Deterministic document type hints from extracted text cues.
 */
import type { DocumentType } from "../domain/models";

export type ClassificationHint = {
  documentType: DocumentType;
  confidence: number;
  matchedCues: string[];
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u200b-\u200f\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const CUES: { type: DocumentType; cues: string[]; weight: number }[] = [
  { type: "FARD_CURRENT_OWNERSHIP", cues: ["fard", "jamabandi", "khasra", "khatooni", "malkiat"], weight: 0.9 },
  { type: "MUTATION_SALE", cues: ["inteqal", "mutation", "intiqal"], weight: 0.85 },
  { type: "REGISTERED_SALE_DEED", cues: ["sale deed", "registered deed", "sub-registrar"], weight: 0.85 },
  { type: "GENERAL_POWER_OF_ATTORNEY", cues: ["power of attorney", "mukhtar", "attorney"], weight: 0.8 },
  { type: "AUTHORITY_ALLOTMENT", cues: ["allotment", "allocation letter"], weight: 0.8 },
  { type: "NON_ENCUMBRANCE_CERTIFICATE", cues: ["non-encumbrance", "non encumbrance", "no demand certificate"], weight: 0.8 },
  { type: "AGREEMENT_TO_SELL", cues: ["agreement to sell", "bayana", "earnest money"], weight: 0.8 },
  {
    type: "TENANCY_AGREEMENT",
    cues: [
      "tenancy agreement",
      "agreement of tenancy",
      "deed of tenancy",
      "rent agreement",
      "rental agreement",
      "rent deed",
      "tenant",
      "tenants",
      "landlord",
      "landlords",
      "land lord",
      "security deposit",
      "demised premises",
      "rented premises",
      "monthly rent",
      "tenancy",
      "lessor",
      "lessee",
      "lease",
      // Urdu / roman-Urdu common on stamp paper
      "kiraaya",
      "kiraya",
      "kraaya",
      "mustajir",
      "malik",
      "کرایہ",
      "کرايه",
      "مستاجر",
      "مالک",
      "معاہدہ",
    ],
    weight: 0.85,
  },
  { type: "LEASE_DEED", cues: ["lease deed", "lease agreement"], weight: 0.85 },
  { type: "IDENTITY_CNIC", cues: ["identity card", "nadra"], weight: 0.7 },
];

const TENANCY_REGEXES: RegExp[] = [
  /agreement\s+of\s+tenancy/i,
  /deed\s+of\s+tenancy/i,
  /tenancy\s+agreement/i,
  /rent\s+agreement/i,
  /rental\s+agreement/i,
  /demised\s+premises/i,
  /monthly\s+rent/i,
  /security\s+deposit/i,
  /\blessors?\b/i,
  /\blesses?\b/i,
  /\btenants?\b/i,
  /\bland\s*lords?\b/i,
  /\btenancy\b/i,
  /\brent\b/i,
];

export function classifyFromText(text: string): ClassificationHint {
  const lower = norm(text);
  let best: ClassificationHint = { documentType: "UNKNOWN", confidence: 0.2, matchedCues: [] };

  for (const row of CUES) {
    const matched = row.cues.filter((c) => lower.includes(norm(c)));
    if (!matched.length) continue;
    const confidence = Math.min(0.95, row.weight + matched.length * 0.03);
    if (confidence > best.confidence) {
      best = { documentType: row.type, confidence, matchedCues: matched };
    }
  }

  const regexHits = TENANCY_REGEXES.filter((re) => re.test(text)).map((re) => re.source);
  if (regexHits.length && (best.documentType === "UNKNOWN" || best.confidence < 0.85)) {
    best = {
      documentType: "TENANCY_AGREEMENT",
      confidence: Math.min(0.95, 0.82 + regexHits.length * 0.02),
      matchedCues: [...new Set([...best.matchedCues, ...regexHits.map((s) => `re:${s}`)])],
    };
  }

  // Filename / page-header hints often survive even when OCR wording is odd
  if (best.documentType === "UNKNOWN" && /tenancy|tenant|rent\b/i.test(text)) {
    best = {
      documentType: "TENANCY_AGREEMENT",
      confidence: 0.88,
      matchedCues: ["loose_tenancy_token"],
    };
  }

  return best;
}
