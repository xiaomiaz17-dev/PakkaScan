export type Jurisdiction =
  | "PAKISTAN_FEDERAL"
  | "PUNJAB"
  | "ISLAMABAD_CDA"
  | "SINDH"
  | "KHYBER_PAKHTUNKHWA"
  | "FOREIGN"
  | "UNKNOWN";

export type DocumentType =
  | "IDENTITY_CNIC"
  | "IDENTITY_NICOP"
  | "IDENTITY_POC"
  | "FAMILY_REGISTRATION_CERTIFICATE"
  | "FARD_CURRENT_OWNERSHIP"
  | "FARD_SALE_PURPOSE"
  | "FARD_COURT_SURETY"
  | "MUTATION_SALE"
  | "MUTATION_GIFT"
  | "MUTATION_INHERITANCE"
  | "MUTATION_MORTGAGE"
  | "REGISTERED_SALE_DEED"
  | "GIFT_DEED"
  | "RELINQUISHMENT_DEED"
  | "CANCELLATION_DEED"
  | "NON_ENCUMBRANCE_CERTIFICATE"
  | "GENERAL_POWER_OF_ATTORNEY"
  | "AUTHORITY_ALLOTMENT"
  | "AUTHORITY_TRANSFER_APPLICATION"
  | "BUILDING_PLAN_APPROVAL"
  | "SALE_DEED_TEMPLATE"
  | "AGREEMENT_TO_SELL"
  | "TENANCY_AGREEMENT"
  | "LEASE_DEED"
  | "RENT_RECEIPT"
  | "LEGAL_SOURCE"
  | "RESEARCH_SOURCE"
  | "UNKNOWN";

export type Evidence = {
  id: string;
  documentId: string;
  documentType: DocumentType;
  field: string;
  value: string;
  normalizedValue?: string;
  confidence: number;
  page?: number;
};

export type Observation = {
  code: string;
  description: string;
  confidence: number;
  evidenceIds: string[];
  metadata?: Record<string, string | number | boolean>;
};

export type RuleEffect = "INFORMATION" | "DEDUCTION" | "SCORE_CAP" | "BLOCKER" | "INCONCLUSIVE";

export type Rule = {
  code: string;
  name: string;
  jurisdiction: Jurisdiction | "ANY";
  category: "OWNERSHIP" | "IDENTITY" | "ENCUMBRANCE" | "AUTHORITY" | "COMPLETENESS" | "JURISDICTION" | "DOCUMENT_INTEGRITY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  effect: RuleEffect;
  observationCode: string;
  minimumConfidence: number;
  scoreImpact?: number;
  scoreCap?: number;
  recommendation: string;
  legalSources: string[];
  enabled: boolean;
};

export type Finding = {
  ruleCode: string;
  category: Rule["category"];
  title: string;
  description: string;
  severity: Rule["severity"];
  effect: RuleEffect;
  confidence: number;
  scoreImpact: number;
  scoreCap?: number;
  evidenceIds: string[];
  recommendation: string;
  legalSources: string[];
};

export type AnalysisResult = {
  pakkaScore: number | null;
  confidenceScore: number;
  decision: "PROCEED" | "PROCEED_WITH_CAUTION" | "LEGAL_REVIEW_REQUIRED" | "DO_NOT_PROCEED" | "INCONCLUSIVE";
  blockers: number;
  findings: Finding[];
  categoryScores?: Record<Rule["category"], number>;
  trustScore?: number;
};
