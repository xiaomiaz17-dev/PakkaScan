import type { Evidence, Observation } from "./models";

const byField = (evidence: Evidence[], field: string) => evidence.filter((item) => item.field === field);

export function deriveObservations(evidence: Evidence[]): Observation[] {
  const observations: Observation[] = [];

  if (byField(evidence, "active_mortgage").some((item) => item.normalizedValue === "true")) {
    const matches = byField(evidence, "active_mortgage");
    observations.push({
      code: "ACTIVE_MORTGAGE_PRESENT",
      description: "The supplied land record indicates an active mortgage or charge.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id)
    });
  }

  if (byField(evidence, "active_court_lien").some((item) => item.normalizedValue === "true")) {
    const matches = byField(evidence, "active_court_lien");
    observations.push({
      code: "ACTIVE_COURT_LIEN_PRESENT",
      description: "The supplied record states that the property cannot be sold or transferred until a court lien is discharged.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id)
    });
  }

  if (byField(evidence, "document_state").some((item) => item.normalizedValue === "blank_template")) {
    const matches = byField(evidence, "document_state");
    observations.push({
      code: "UNEXECUTED_TEMPLATE",
      description: "A blank or placeholder-based deed template was supplied instead of an executed instrument.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id)
    });
  }

  if (byField(evidence, "document_state").some((item) => item.normalizedValue === "application_only")) {
    const matches = byField(evidence, "document_state");
    observations.push({
      code: "APPLICATION_NOT_APPROVAL",
      description: "The document is an application form and does not show that the authority approved or completed the transfer.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id)
    });
  }

  if (byField(evidence, "ownership_chronology_status").some((item) => item.normalizedValue === "unreconciled")) {
    const matches = byField(evidence, "ownership_chronology_status");
    observations.push({
      code: "MUTATION_NOT_RECONCILED_WITH_CURRENT_RECORD",
      description: "A transfer mutation is present but the supplied current ownership record has not been dated or reconciled after the transfer.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id)
    });
  }


  const landlord = byField(evidence, "landlord_name");
  const titleOwner = byField(evidence, "owner_name").concat(byField(evidence, "current_owner_name"));
  if (landlord.length && titleOwner.length) {
    const ln = String(landlord[0].normalizedValue ?? "").toLowerCase();
    const match = titleOwner.some((o) => String(o.normalizedValue ?? "").toLowerCase() === ln);
    if (ln && !match) {
      observations.push({
        code: "LANDLORD_NOT_ON_TITLE",
        description: "The landlord named on the tenancy or lease instrument is not identifiable on the supplied ownership record.",
        confidence: Math.min(landlord[0].confidence, Math.max(...titleOwner.map((i) => i.confidence))),
        evidenceIds: [landlord[0].id, ...titleOwner.map((i) => i.id)],
      });
    }
  }

  if (byField(evidence, "lease_term_status").some((item) => item.normalizedValue === "inconsistent")) {
    const matches = byField(evidence, "lease_term_status");
    observations.push({
      code: "LEASE_TERM_INCONSISTENT",
      description: "Lease term dates or rent figures disagree across the supplied pages.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id),
    });
  }

  if (byField(evidence, "lease_formality").some((item) => item.normalizedValue === "unstamped_or_unregistered_cues")) {
    const matches = byField(evidence, "lease_formality");
    observations.push({
      code: "LEASE_STAMP_OR_REGISTRATION_CUES_MISSING",
      description: "The lease or tenancy instrument lacks clear stamp or registration cues required for reliance in many transfer contexts.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id),
    });
  }


  const allottee = byField(evidence, "allottee_name");
  const nocBeneficiary = byField(evidence, "noc_beneficiary_name");
  if (allottee.length && nocBeneficiary.length) {
    const a = String(allottee[0].normalizedValue ?? "").toLowerCase();
    const n = String(nocBeneficiary[0].normalizedValue ?? "").toLowerCase();
    if (a && n && a !== n) {
      observations.push({
        code: "ALLOTMENT_NOC_BENEFICIARY_MISMATCH",
        description: "The allotment letter holder does not match the society NOC beneficiary.",
        confidence: Math.min(allottee[0].confidence, nocBeneficiary[0].confidence),
        evidenceIds: [allottee[0].id, nocBeneficiary[0].id],
      });
    }
  }

  if (byField(evidence, "ndc_dues_status").some((item) => item.normalizedValue === "outstanding")) {
    const matches = byField(evidence, "ndc_dues_status");
    observations.push({
      code: "SOCIETY_NDC_DUES_OUTSTANDING",
      description: "The No Demand Certificate indicates outstanding society dues before transfer.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id),
    });
  }


  if (byField(evidence, "tenancy_form").some((item) => item.normalizedValue === "oral_only" || item.normalizedValue === "not_in_writing")) {
    const matches = byField(evidence, "tenancy_form");
    observations.push({
      code: "TENANCY_NOT_IN_WRITING",
      description: "The tenancy appears oral-only or not reduced to a written agreement; provincial rented-premises frameworks generally expect writing.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id),
    });
  }

  if (byField(evidence, "tenancy_registration_status").some((item) => item.normalizedValue === "unregistered" || item.normalizedValue === "not_presented_to_registrar")) {
    const matches = byField(evidence, "tenancy_registration_status");
    observations.push({
      code: "TENANCY_REGISTRATION_CUES_ABSENT",
      description: "No clear cue that the tenancy was entered with the Rent Registrar / controller or otherwise registered where required.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id),
    });
  }

  if (byField(evidence, "security_deposit_status").some((item) => item.normalizedValue === "undocumented")) {
    const matches = byField(evidence, "security_deposit_status");
    observations.push({
      code: "SECURITY_DEPOSIT_UNDOCUMENTED",
      description: "Security deposit or advance rent is alleged but not clearly documented in the written instrument.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id),
    });
  }


  if (byField(evidence, "instrument_stage").some((item) => item.normalizedValue === "agreement_to_sell")) {
    const matches = byField(evidence, "instrument_stage");
    const hasDeed = evidence.some(
      (e) => e.documentType === "REGISTERED_SALE_DEED" || e.field === "deed_registration_number",
    );
    if (!hasDeed) {
      observations.push({
        code: "AGREEMENT_TO_SELL_ONLY",
        description:
          "Only an agreement to sell / bayana instrument is present; a registered conveyance (sale deed) is not evidenced.",
        confidence: Math.max(...matches.map((item) => item.confidence)),
        evidenceIds: matches.map((item) => item.id),
      });
    }
  }

  if (byField(evidence, "seller_on_current_title").some((item) => item.normalizedValue === "false" || item.normalizedValue === "no")) {
    const matches = byField(evidence, "seller_on_current_title");
    observations.push({
      code: "SELLER_NOT_ON_CURRENT_TITLE",
      description: "The named seller does not appear on the current ownership / Fard record supplied.",
      confidence: Math.max(...matches.map((item) => item.confidence)),
      evidenceIds: matches.map((item) => item.id),
    });
  }

  return observations;
}




