/**
 * Completeness Detector.
 *
 * Examines extracted smartFields and determines whether the document is:
 * - Complete: has enough critical fields to be actionable
 * - Partial: has some critical fields but missing key ones
 * - Template: missing most/all critical fields (blank sample, template, or partial upload)
 *
 * Also identifies which specific "critical fields" are missing so the UI
 * can guide the user on what to fill in before the document is usable.
 *
 * This is a pure function - no LLM, no external calls.
 * Runs on the pre-validated smartFields object.
 */

export type CompletenessStatus = "complete" | "partial" | "template";

export type MissingField = {
  fieldPath: string;
  label: string;
  category: "party" | "financial" | "date" | "property" | "other";
};

export type CompletenessReport = {
  status: CompletenessStatus;
  criticalFieldsPresent: number;
  criticalFieldsTotal: number;
  missingFields: MissingField[];
  hasAnyClauses: boolean;
  hasAnyProperty: boolean;
  message: string;
};

/**
 * Per-document-type critical field definitions.
 * "Critical" = fields without which the document cannot be relied on
 * for its intended legal/financial purpose.
 */
type CriticalFieldSpec = {
  path: string;
  label: string;
  category: MissingField["category"];
  check: (fields: any) => boolean;
};

function partyHasName(party: any): boolean {
  return Boolean(party && typeof party.name === "string" && party.name.trim().length > 0);
}

function moneyHasAmount(money: any): boolean {
  return Boolean(money && typeof money.amount === "number" && money.amount > 0 && !isNaN(money.amount));
}

function stringPresent(v: any): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

const CRITICAL_FIELDS: Record<string, CriticalFieldSpec[]> = {
  TENANCY_AGREEMENT: [
    { path: "parties.landlord", label: "Landlord name", category: "party", check: (f) => partyHasName(f.parties?.landlord) },
    { path: "parties.tenant", label: "Tenant name", category: "party", check: (f) => partyHasName(f.parties?.tenant) },
    { path: "financials.monthly_rent", label: "Monthly rent amount", category: "financial", check: (f) => moneyHasAmount(f.financials?.monthly_rent) },
    { path: "dates.start_or_execution", label: "Tenancy start date", category: "date", check: (f) => stringPresent(f.dates?.start_date) || (stringPresent(f.dates?.execution_date) && f.dates?.duration_months > 0) },
    { path: "dates.end_or_duration", label: "Tenancy end date", category: "date", check: (f) => stringPresent(f.dates?.end_date) || (stringPresent(f.dates?.execution_date) && f.dates?.duration_months > 0) },
    { path: "property.address", label: "Property address", category: "property", check: (f) => stringPresent(f.property?.address) },
  ],

  AGREEMENT_TO_SELL: [
    { path: "parties.seller", label: "Seller name", category: "party", check: (f) => partyHasName(f.parties?.seller) },
    { path: "parties.buyer", label: "Buyer name", category: "party", check: (f) => partyHasName(f.parties?.buyer) },
    { path: "financials.total_price", label: "Total sale price", category: "financial", check: (f) => moneyHasAmount(f.financials?.total_price) },
    { path: "financials.token_amount", label: "Token / earnest money amount", category: "financial", check: (f) => moneyHasAmount(f.financials?.token_amount) },
    { path: "dates.execution_date", label: "Agreement execution date", category: "date", check: (f) => stringPresent(f.dates?.execution_date) },
    { path: "property.address", label: "Property address", category: "property", check: (f) => stringPresent(f.property?.address) },
  ],

  REGISTERED_SALE_DEED: [
    { path: "parties.seller", label: "Seller name", category: "party", check: (f) => partyHasName(f.parties?.seller) },
    { path: "parties.buyer", label: "Buyer name", category: "party", check: (f) => partyHasName(f.parties?.buyer) },
    { path: "financials.total_price", label: "Sale price", category: "financial", check: (f) => moneyHasAmount(f.financials?.total_price) },
    { path: "dates.registration_date", label: "Registration date", category: "date", check: (f) => stringPresent(f.dates?.registration_date) || stringPresent(f.dates?.execution_date) },
    { path: "property.address", label: "Property address", category: "property", check: (f) => stringPresent(f.property?.address) },
    { path: "legal.registration_number", label: "Registration number", category: "other", check: (f) => stringPresent(f.legal?.registration_number) },
  ],

  IDENTITY_CNIC: [
    { path: "parties.holder", label: "Card holder name", category: "party", check: (f) => partyHasName(f.parties?.holder) },
    { path: "parties.holder.cnic", label: "CNIC number", category: "party", check: (f) => stringPresent(f.parties?.holder?.cnic) },
    { path: "dates.dob", label: "Date of birth", category: "date", check: (f) => stringPresent(f.dates?.dob) },
  ],

  FARD_CURRENT_OWNERSHIP: [
    { path: "parties.owner", label: "Owner name", category: "party", check: (f) => partyHasName(f.parties?.owner) },
    { path: "property.khasra_number", label: "Khasra number", category: "property", check: (f) => stringPresent(f.property?.khasra_number) },
    { path: "property.total_area", label: "Total area", category: "property", check: (f) => stringPresent(f.property?.total_area) },
    { path: "legal.fard_number", label: "Fard reference number", category: "other", check: (f) => stringPresent(f.legal?.fard_number) },
  ],

  MUTATION_SALE: [
    { path: "parties.transferor", label: "Transferor (seller) name", category: "party", check: (f) => partyHasName(f.parties?.transferor) },
    { path: "parties.transferee", label: "Transferee (buyer) name", category: "party", check: (f) => partyHasName(f.parties?.transferee) },
    { path: "legal.mutation_number", label: "Mutation number", category: "other", check: (f) => stringPresent(f.legal?.mutation_number) },
    { path: "dates.mutation_date", label: "Mutation date", category: "date", check: (f) => stringPresent(f.dates?.mutation_date) },
  ],

  GENERAL_POWER_OF_ATTORNEY: [
    { path: "parties.principal", label: "Principal (grantor) name", category: "party", check: (f) => partyHasName(f.parties?.principal) },
    { path: "parties.attorney", label: "Attorney (grantee) name", category: "party", check: (f) => partyHasName(f.parties?.attorney) },
    { path: "dates.execution_date", label: "Execution date", category: "date", check: (f) => stringPresent(f.dates?.execution_date) },
  ],
};

// Fallback: for doc types without a specific critical-fields spec,
// use a generic set that looks for ANY party and ANY date.
const GENERIC_CRITICAL: CriticalFieldSpec[] = [
  {
    path: "parties.any",
    label: "At least one named party",
    category: "party",
    check: (f) => {
      const p = f.parties || {};
      for (const key of Object.keys(p)) {
        if (key === "witnesses" || key === "additional_parties" || key === "additional_cnics_found_in_document") continue;
        if (partyHasName(p[key])) return true;
      }
      return false;
    },
  },
  {
    path: "dates.any",
    label: "At least one document date",
    category: "date",
    check: (f) => {
      const d = f.dates || {};
      for (const key of Object.keys(d)) {
        if (stringPresent(d[key])) return true;
        if (typeof d[key] === "number" && d[key] > 0) return true;
      }
      return false;
    },
  },
];

function hasAnyClauses(fields: any): boolean {
  const clauses = fields?.clauses;
  if (!clauses || typeof clauses !== "object") return false;
  for (const key of Object.keys(clauses)) {
    const v = clauses[key];
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim().length > 0) return true;
    if (typeof v === "number" && v > 0) return true;
    if (typeof v === "boolean") return true;
    if (Array.isArray(v) && v.length > 0) return true;
  }
  return false;
}

function hasAnyProperty(fields: any): boolean {
  const prop = fields?.property;
  if (!prop || typeof prop !== "object") return false;
  for (const key of Object.keys(prop)) {
    const v = prop[key];
    if (stringPresent(v)) return true;
  }
  return false;
}

/**
 * Analyse a smartFields object and return a completeness report.
 */
export function detectCompleteness(
  documentType: string,
  smartFields: any
): CompletenessReport {
  if (!smartFields || typeof smartFields !== "object" || smartFields.extractionError) {
    return {
      status: "template",
      criticalFieldsPresent: 0,
      criticalFieldsTotal: 0,
      missingFields: [],
      hasAnyClauses: false,
      hasAnyProperty: false,
      message: "Extraction failed - unable to analyse completeness.",
    };
  }

  const spec = CRITICAL_FIELDS[documentType] || GENERIC_CRITICAL;
  const missingFields: MissingField[] = [];
  let present = 0;

  for (const field of spec) {
    if (field.check(smartFields)) {
      present++;
    } else {
      missingFields.push({
        fieldPath: field.path,
        label: field.label,
        category: field.category,
      });
    }
  }

  const total = spec.length;
  const presentRatio = total > 0 ? present / total : 0;

  const clausesPresent = hasAnyClauses(smartFields);
  const propertyPresent = hasAnyProperty(smartFields);

  let status: CompletenessStatus;
  let message: string;

  if (presentRatio >= 0.75) {
    status = "complete";
    message = "Document is complete and can be relied on.";
  } else if (presentRatio >= 0.4) {
    status = "partial";
    message = "Document is partially complete. Some critical fields are missing.";
  } else if (clausesPresent && presentRatio >= 0.2) {
    // P0: fill-in-the-blank tenancies still have clauses — not a blank template
    status = "partial";
    message =
      "Document has legal clauses but some critical fields were not extracted. Check Key Facts and the original PDF for rent, deposit, and parties.";
  } else {
    status = "template";
    if (clausesPresent && propertyPresent) {
      message = "This looks like a sample or incomplete document with standard clauses but missing party details, amounts, and/or dates. Do not use as-is - fill in and sign before it becomes legally binding.";
    } else if (clausesPresent) {
      message = "This appears to be a blank template with standard clauses but no specific transaction details filled in.";
    } else if (propertyPresent) {
      message = "This document mentions a property but is missing most critical fields (parties, amounts, dates).";
    } else {
      message = "This document appears blank or incomplete. Most critical fields are missing.";
    }
  }

  return {
    status,
    criticalFieldsPresent: present,
    criticalFieldsTotal: total,
    missingFields,
    hasAnyClauses: clausesPresent,
    hasAnyProperty: propertyPresent,
    message,
  };
}
