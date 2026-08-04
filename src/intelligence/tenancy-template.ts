/**
 * Basic tenancy agreement checklist for Pakistan (decision-support).
 * Not a substitute for provincial statute or counsel-drafted forms.
 */

export type TenancyTemplateField = {
  key: string;
  label: string;
  required: boolean;
  notes: string;
};

/** Fields a written residential tenancy should usually make explicit. */
export const TENANCY_AGREEMENT_TEMPLATE_FIELDS: TenancyTemplateField[] = [
  { key: "landlord_name", label: "Landlord full name + identity ref", required: true, notes: "Match to title/Fard/allotment where possible." },
  { key: "tenant_name", label: "Tenant full name + identity ref", required: true, notes: "CNIC/NICOP as applicable." },
  { key: "property_address", label: "Premises description / address", required: true, notes: "Plot/house identifiers if society property." },
  { key: "lease_start", label: "Commencement date", required: true, notes: "" },
  { key: "lease_end", label: "End date / term", required: true, notes: "Longer terms may trigger registration analysis." },
  { key: "monthly_rent", label: "Rent amount + due date", required: true, notes: "Currency and payment method." },
  { key: "security_deposit", label: "Security / advance rent", required: true, notes: "Amount and return conditions." },
  { key: "use_of_premises", label: "Residential / commercial use", required: false, notes: "Affects applicable controls." },
  { key: "utilities_taxes", label: "Utilities & tax allocation", required: false, notes: "" },
  { key: "subletting", label: "Sub-letting / assignment", required: false, notes: "" },
  { key: "termination_notice", label: "Termination & notice", required: false, notes: "" },
  { key: "escalation", label: "Rent escalation", required: false, notes: "Frequency/cap if any." },
  { key: "witnesses", label: "Witnesses / execution", required: false, notes: "" },
  { key: "stamp_registration", label: "Stamp & registration cues", required: true, notes: "Stamp Act + Rent Registrar / Registration Act as applicable." },
];

export function scoreTenancyTemplateCompleteness(presentKeys: string[]): {
  score: number;
  missingRequired: string[];
  missingOptional: string[];
} {
  const present = new Set(presentKeys);
  const missingRequired = TENANCY_AGREEMENT_TEMPLATE_FIELDS.filter((f) => f.required && !present.has(f.key)).map((f) => f.key);
  const missingOptional = TENANCY_AGREEMENT_TEMPLATE_FIELDS.filter((f) => !f.required && !present.has(f.key)).map((f) => f.key);
  const requiredTotal = TENANCY_AGREEMENT_TEMPLATE_FIELDS.filter((f) => f.required).length;
  const score = Math.round(((requiredTotal - missingRequired.length) / requiredTotal) * 100);
  return { score, missingRequired, missingOptional };
}
