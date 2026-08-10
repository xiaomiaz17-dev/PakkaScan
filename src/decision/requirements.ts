import type { DocumentType, Evidence } from "../domain/models";

export type MissingEvidenceRequirement = { code: string; label: string; critical: boolean };

/**
 * Context-aware missing-evidence checker.
 *
 * Each "scenario" defines what a complete evidence pack looks like for a specific
 * use case (buying property, renting, granting power of attorney, etc.).
 *
 * We pick the scenario based on what the user actually uploaded — then check
 * only the requirements relevant to THAT scenario.
 *
 * This avoids nonsensical outputs like "missing encumbrance search" for a
 * tenancy agreement.
 */

type Scenario = "TENANCY" | "PROPERTY_TRANSFER" | "POA_ONLY" | "IDENTITY_ONLY" | "UNKNOWN";

const TENANCY_TYPES: DocumentType[] = ["TENANCY_AGREEMENT", "LEASE_DEED"];
const TRANSFER_TYPES: DocumentType[] = ["MUTATION_SALE", "REGISTERED_SALE_DEED", "GIFT_DEED", "MUTATION_INHERITANCE", "AGREEMENT_TO_SELL"];
const POA_TYPES: DocumentType[] = ["GENERAL_POWER_OF_ATTORNEY"];
const IDENTITY_TYPES: DocumentType[] = ["IDENTITY_CNIC", "IDENTITY_NICOP", "IDENTITY_POC"];
const OWNERSHIP_TYPES: DocumentType[] = ["FARD_CURRENT_OWNERSHIP"];
const NEC_TYPES: DocumentType[] = ["NON_ENCUMBRANCE_CERTIFICATE"];

function detectScenario(present: Set<DocumentType>): Scenario {
  if (TENANCY_TYPES.some((type) => present.has(type))) return "TENANCY";
  if (TRANSFER_TYPES.some((type) => present.has(type))) return "PROPERTY_TRANSFER";
  if (POA_TYPES.some((type) => present.has(type))) return "POA_ONLY";
  if (IDENTITY_TYPES.some((type) => present.has(type))) return "IDENTITY_ONLY";
  return "UNKNOWN";
}

function has(present: Set<DocumentType>, types: DocumentType[]): boolean {
  return types.some((type) => present.has(type));
}

function tenancyRequirements(present: Set<DocumentType>): MissingEvidenceRequirement[] {
  const missing: MissingEvidenceRequirement[] = [];
  if (!has(present, IDENTITY_TYPES)) {
    missing.push({
      code: "LANDLORD_TENANT_ID",
      label: "Landlord and tenant CNICs (or NICOP/POC) for identity verification",
      critical: true,
    });
  }
  if (!has(present, OWNERSHIP_TYPES)) {
    missing.push({
      code: "LANDLORD_OWNERSHIP_PROOF",
      label: "Landlord's ownership proof (Fard, registry, or recent utility bill)",
      critical: false,
    });
  }
  return missing;
}

function propertyTransferRequirements(present: Set<DocumentType>): MissingEvidenceRequirement[] {
  const missing: MissingEvidenceRequirement[] = [];
  if (!has(present, IDENTITY_TYPES)) {
    missing.push({
      code: "IDENTITY_DOCUMENT",
      label: "CNIC (or NICOP/POC) of the seller and buyer",
      critical: true,
    });
  }
  if (!has(present, OWNERSHIP_TYPES)) {
    missing.push({
      code: "CURRENT_OWNERSHIP_RECORD",
      label: "Current dated Fard or equivalent ownership record",
      critical: true,
    });
  }
  if (!has(present, TRANSFER_TYPES)) {
    missing.push({
      code: "TRANSFER_INSTRUMENT",
      label: "Registered sale deed, mutation, or gift instrument",
      critical: true,
    });
  }
  if (!has(present, NEC_TYPES)) {
    missing.push({
      code: "ENCUMBRANCE_SEARCH",
      label: "Current non-encumbrance / registry search (recommended)",
      critical: false,
    });
  }
  return missing;
}

function poaRequirements(present: Set<DocumentType>): MissingEvidenceRequirement[] {
  const missing: MissingEvidenceRequirement[] = [];
  if (!has(present, IDENTITY_TYPES)) {
    missing.push({
      code: "GRANTOR_GRANTEE_ID",
      label: "CNIC of both the grantor (principal) and grantee (attorney)",
      critical: true,
    });
  }
  if (!has(present, OWNERSHIP_TYPES)) {
    missing.push({
      code: "SUBJECT_PROPERTY_TITLE",
      label: "Title document for the property covered by the Power of Attorney",
      critical: false,
    });
  }
  return missing;
}

function identityOnlyRequirements(_present: Set<DocumentType>): MissingEvidenceRequirement[] {
  return [
    {
      code: "TRANSACTION_INSTRUMENT",
      label: "A transaction document (tenancy, sale deed, PoA, etc.) to review alongside this identity document",
      critical: false,
    },
  ];
}

function unknownRequirements(_present: Set<DocumentType>): MissingEvidenceRequirement[] {
  return [
    {
      code: "DOCUMENT_TYPE_UNCLEAR",
      label: "Document type could not be determined confidently — re-upload a clearer version or add a second supporting document",
      critical: false,
    },
  ];
}

export function assessMissingEvidence(evidence: Evidence[]) {
  const present = new Set<DocumentType>(evidence.map((item) => item.documentType));
  const scenario = detectScenario(present);

  let missing: MissingEvidenceRequirement[];
  let totalChecks: number;

  switch (scenario) {
    case "TENANCY":
      missing = tenancyRequirements(present);
      totalChecks = 2;
      break;
    case "PROPERTY_TRANSFER":
      missing = propertyTransferRequirements(present);
      totalChecks = 4;
      break;
    case "POA_ONLY":
      missing = poaRequirements(present);
      totalChecks = 2;
      break;
    case "IDENTITY_ONLY":
      missing = identityOnlyRequirements(present);
      totalChecks = 1;
      break;
    default:
      missing = unknownRequirements(present);
      totalChecks = 1;
  }

  const coverage = totalChecks === 0 ? 1 : (totalChecks - missing.length) / totalChecks;
  return { missing, coverage, scenario };
}