import type { DocumentSchema } from "./types";

const schemas: DocumentSchema[] = [
  {
    documentType: "IDENTITY_CNIC",
    version: "1.0.0",
    fields: [
      { name: "name", required: true, aliases: ["name"] },
      { name: "father_name", required: false, aliases: ["father name", "s/o", "d/o"] },
      { name: "identity_number", required: true, aliases: ["identity number", "cnic"] },
      { name: "date_of_birth", required: false, aliases: ["date of birth", "dob"] },
      { name: "date_of_expiry", required: false, aliases: ["date of expiry", "expiry"] },
      { name: "present_address", required: false, aliases: ["present address"] },
      { name: "permanent_address", required: false, aliases: ["permanent address"] },
    ],
    criticalFields: ["name", "identity_number"],
  },
  {
    documentType: "IDENTITY_NICOP",
    version: "1.0.0",
    fields: [
      { name: "name", required: true, aliases: ["name"] },
      { name: "father_name", required: false, aliases: ["father name"] },
      { name: "identity_number", required: true, aliases: ["identity number", "nicop"] },
      { name: "country_of_residence", required: false, aliases: ["country of residence", "country of stay"] },
      { name: "passport_number", required: false, aliases: ["passport number", "passport no"] },
      { name: "date_of_expiry", required: false, aliases: ["date of expiry"] },
    ],
    criticalFields: ["name", "identity_number"],
  },
  {
    documentType: "FARD_CURRENT_OWNERSHIP",
    version: "1.0.0",
    fields: [
      { name: "district", required: true, aliases: ["district"] },
      { name: "tehsil", required: true, aliases: ["tehsil"] },
      { name: "mauza", required: true, aliases: ["mauza", "village"] },
      { name: "khewat", required: false, aliases: ["khewat"] },
      { name: "khatoni", required: false, aliases: ["khatoni"] },
      { name: "khasra", required: true, aliases: ["khasra"] },
      { name: "total_area", required: true, aliases: ["total area", "area"] },
      { name: "owners", required: true, aliases: ["ownership details", "owner name"] },
      { name: "remarks", required: false, aliases: ["remarks", "redlines"] },
    ],
    criticalFields: ["mauza", "khasra", "owners"],
  },
  {
    documentType: "MUTATION_SALE",
    version: "1.0.0",
    fields: [
      { name: "mutation_number", required: true, aliases: ["mutation no", "mutation number"] },
      { name: "mutation_type", required: true, aliases: ["type of mutation", "mutation type"] },
      { name: "seller", required: true, aliases: ["transferor", "seller"] },
      { name: "buyer", required: true, aliases: ["transferee", "buyer"] },
      { name: "khasra", required: true, aliases: ["khasra no", "khasra"] },
      { name: "area", required: true, aliases: ["total area mutated", "area"] },
      { name: "consideration", required: false, aliases: ["sale consideration amount", "consideration"] },
      { name: "attestation_date", required: false, aliases: ["date of attestation", "attestation date"] },
      { name: "status", required: false, aliases: ["status"] },
    ],
    criticalFields: ["mutation_number", "seller", "buyer", "khasra"],
  },
  {
    documentType: "MUTATION_MORTGAGE",
    version: "1.0.0",
    fields: [
      { name: "mutation_number", required: true, aliases: ["mutation no"] },
      { name: "mortgagor", required: true, aliases: ["mortgagor", "borrower"] },
      { name: "mortgagee", required: true, aliases: ["mortgagee", "lender"] },
      { name: "khasra", required: true, aliases: ["khasra no"] },
      { name: "area", required: true, aliases: ["area"] },
      { name: "loan_amount", required: false, aliases: ["loan amount secured"] },
      { name: "restriction", required: true, aliases: ["remarks"] },
    ],
    criticalFields: ["mortgagor", "mortgagee", "khasra", "restriction"],
  },
  {
    documentType: "GENERAL_POWER_OF_ATTORNEY",
    version: "1.0.0",
    fields: [
      { name: "principal", required: true, aliases: ["i,"] },
      { name: "attorney", required: true, aliases: ["attorney"] },
      { name: "principal_identity_number", required: false, aliases: ["cnic"] },
      { name: "property_reference", required: true, aliases: ["khasra no", "property"] },
      { name: "share", required: false, aliases: ["share"] },
      { name: "powers", required: true, aliases: ["powers granted"] },
      { name: "registration_reference", required: false, aliases: ["registration no"] },
    ],
    criticalFields: ["principal", "attorney", "property_reference", "powers"],
  },
  {
    documentType: "NON_ENCUMBRANCE_CERTIFICATE",
    version: "1.0.0",
    fields: [
      { name: "certificate_number", required: true, aliases: ["certificate serial no"] },
      { name: "search_period_start", required: true, aliases: ["period from"] },
      { name: "search_period_end", required: true, aliases: ["to"] },
      { name: "property_reference", required: true, aliases: ["property description"] },
      { name: "area", required: false, aliases: ["area"] },
      { name: "result", required: true, aliases: ["result of search"] },
    ],
    criticalFields: ["search_period_end", "property_reference", "result"],
  },
  {
    documentType: "SALE_DEED_TEMPLATE",
    version: "1.0.0",
    fields: [
      { name: "template_detected", required: true, aliases: ["[vendor name]", "[plot no]"] },
    ],
    criticalFields: ["template_detected"],
  },
  {
    documentType: "TENANCY_AGREEMENT",
    version: "1.0.0",
    fields: [
      { name: "landlord_name", required: true, aliases: ["landlord", "owner", "lessor", "first party", "malik"] },
      { name: "tenant_name", required: true, aliases: ["tenant", "lessee", "second party", "mustajir"] },
      { name: "monthly_rent", required: true, aliases: ["monthly rent", "rent per month"] },
      { name: "security_deposit", required: false, aliases: ["security deposit", "refundable security", "advance security"] },
      { name: "tenancy_duration", required: false, aliases: ["tenancy period", "term of lease"] },
      { name: "tenancy_start_date", required: false, aliases: ["commencing from", "effective from"] },
      { name: "tenancy_end_date", required: false, aliases: ["ending on", "expiring on"] },
      { name: "property_reference", required: true, aliases: ["demised premises", "rented premises"] },
      { name: "rent_increment_percentage", required: false, aliases: ["increment"] },
      { name: "premises_purpose", required: false, aliases: ["purpose"] },
      { name: "execution_date", required: false, aliases: ["dated", "executed on"] },
    ],
    criticalFields: ["landlord_name", "tenant_name", "monthly_rent", "property_reference"],
  },
  {
    documentType: "LEASE_DEED",
    version: "1.0.0",
    fields: [
      { name: "landlord_name", required: true, aliases: ["lessor", "landlord"] },
      { name: "tenant_name", required: true, aliases: ["lessee", "tenant"] },
      { name: "monthly_rent", required: false, aliases: ["monthly rent"] },
      { name: "security_deposit", required: false, aliases: ["security deposit"] },
      { name: "property_reference", required: true, aliases: ["demised premises"] },
      { name: "tenancy_duration", required: false, aliases: ["lease term"] },
      { name: "execution_date", required: false, aliases: ["dated"] },
    ],
    criticalFields: ["landlord_name", "tenant_name", "property_reference"],
  },
  {
    documentType: "AGREEMENT_TO_SELL",
    version: "1.0.0",
    fields: [
      { name: "seller", required: true, aliases: ["seller", "vendor", "transferor", "first party"] },
      { name: "buyer", required: true, aliases: ["buyer", "vendee", "purchaser", "transferee"] },
      { name: "total_consideration", required: true, aliases: ["total sale consideration", "sale consideration", "sale price"] },
      { name: "token_amount", required: true, aliases: ["token money", "bayana", "earnest money"] },
      { name: "balance_amount", required: false, aliases: ["balance amount", "balance due", "remaining amount"] },
      { name: "balance_due_date", required: false, aliases: ["balance due date", "on or before"] },
      { name: "property_reference", required: true, aliases: ["property described", "subject property"] },
      { name: "registration_deadline", required: false, aliases: ["within", "not later than"] },
      { name: "execution_date", required: false, aliases: ["dated", "executed on"] },
    ],
    criticalFields: ["seller", "buyer", "total_consideration", "token_amount", "property_reference"],
  },
];

export class SchemaRegistry {
  private readonly byType = new Map(schemas.map((schema) => [schema.documentType, schema]));

  get(documentType: DocumentSchema["documentType"]): DocumentSchema | undefined {
    return this.byType.get(documentType);
  }

  list(): DocumentSchema[] {
    return [...this.byType.values()];
  }
}

export const SCHEMA_REGISTRY = new SchemaRegistry();