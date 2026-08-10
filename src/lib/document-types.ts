/**
 * Canonical list of document types users can pre-tag when uploading.
 *
 * The "value" MUST match the classifier's internal enum (see:
 * src/ingestion/classifier.ts and src/intelligence/document-classifier.ts).
 * The "label" is the human-friendly name shown in the UI dropdown.
 *
 * Order matches typical usage frequency in Pakistani property transactions.
 */

export type DocumentTypeOption = {
  value: string;
  label: string;
  category: "primary" | "identity" | "ownership" | "other";
};

export const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  // Primary transaction documents
  { value: "AGREEMENT_TO_SELL", label: "Bayana / Agreement to Sell", category: "primary" },
  { value: "REGISTERED_SALE_DEED", label: "Registered Sale Deed", category: "primary" },
  { value: "TENANCY_AGREEMENT", label: "Tenancy Agreement", category: "primary" },
  { value: "GENERAL_POWER_OF_ATTORNEY", label: "Power of Attorney", category: "primary" },
  { value: "GIFT_DEED", label: "Gift Deed (Hiba-nama)", category: "primary" },

  // Identity documents
  { value: "IDENTITY_CNIC", label: "CNIC (National Identity Card)", category: "identity" },
  { value: "IDENTITY_NICOP", label: "NICOP (Overseas Pakistani ID)", category: "identity" },
  { value: "IDENTITY_POC", label: "POC (Pakistan Origin Card)", category: "identity" },
  { value: "FAMILY_REGISTRATION_CERTIFICATE", label: "Family Registration Certificate", category: "identity" },

  // Ownership / land records
  { value: "FARD_CURRENT_OWNERSHIP", label: "Fard (Ownership Record)", category: "ownership" },
  { value: "FARD_SALE_PURPOSE", label: "Fard for Sale", category: "ownership" },
  { value: "MUTATION_SALE", label: "Mutation (Sale)", category: "ownership" },
  { value: "MUTATION_MORTGAGE", label: "Mutation (Mortgage)", category: "ownership" },
  { value: "MUTATION_GIFT", label: "Mutation (Gift)", category: "ownership" },
  { value: "MUTATION_INHERITANCE", label: "Mutation (Inheritance)", category: "ownership" },
  { value: "NON_ENCUMBRANCE_CERTIFICATE", label: "Non-Encumbrance Certificate", category: "ownership" },

  // Other
  { value: "RELINQUISHMENT_DEED", label: "Relinquishment Deed", category: "other" },
  { value: "CANCELLATION_DEED", label: "Cancellation Deed", category: "other" },
  { value: "AUTHORITY_TRANSFER_APPLICATION", label: "Authority Transfer Application", category: "other" },
  { value: "BUILDING_PLAN_APPROVAL", label: "Building Plan Approval", category: "other" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  primary: "Transaction Documents",
  identity: "Identity Documents",
  ownership: "Ownership / Land Records",
  other: "Other Documents",
};

/**
 * Group options by category, preserving order within each category.
 * Used by the dropdown UI to render sectioned lists.
 */
export function groupedDocumentTypes(): Array<{ category: string; label: string; options: DocumentTypeOption[] }> {
  const map = new Map<string, DocumentTypeOption[]>();
  for (const opt of DOCUMENT_TYPE_OPTIONS) {
    if (!map.has(opt.category)) map.set(opt.category, []);
    map.get(opt.category)!.push(opt);
  }
  return Array.from(map.entries()).map(([category, options]) => ({
    category,
    label: CATEGORY_LABELS[category] || category,
    options,
  }));
}
