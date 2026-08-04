import type { DocumentType, Evidence } from "../domain/models";
export type MissingEvidenceRequirement = { code: string; label: string; critical: boolean };
const requirements: Array<{ types: DocumentType[]; code: string; label: string; critical: boolean }> = [
  { types: ["IDENTITY_CNIC", "IDENTITY_NICOP", "IDENTITY_POC"], code: "IDENTITY_DOCUMENT", label: "Identity document for the relevant owner or transferor", critical: true },
  { types: ["FARD_CURRENT_OWNERSHIP"], code: "CURRENT_OWNERSHIP_RECORD", label: "Current dated Fard or equivalent ownership record", critical: true },
  { types: ["MUTATION_SALE", "REGISTERED_SALE_DEED", "GIFT_DEED", "MUTATION_INHERITANCE"], code: "TRANSFER_INSTRUMENT", label: "Relevant transfer or succession instrument", critical: true },
  { types: ["NON_ENCUMBRANCE_CERTIFICATE"], code: "ENCUMBRANCE_SEARCH", label: "Current non-encumbrance or registry search", critical: false },
  { types: ["TENANCY_AGREEMENT", "LEASE_DEED"], code: "TENANCY_INSTRUMENT", label: "Tenancy or lease instrument when renting", critical: false },
];
export function assessMissingEvidence(evidence: Evidence[]) {
  const present = new Set(evidence.map((item) => item.documentType));
  const missing = requirements.filter((requirement) => !requirement.types.some((type) => present.has(type))).map(({ code, label, critical }) => ({ code, label, critical }));
  return { missing, coverage: (requirements.length - missing.length) / requirements.length };
}
