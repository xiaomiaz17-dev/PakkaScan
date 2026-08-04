import type { Jurisdiction } from "../domain/models";

export type TenancyJurisdictionProfile = {
  jurisdiction: Jurisdiction;
  statuteLabel: string;
  legalSourceCodes: string[];
  notes: string;
};

const PROFILES: Partial<Record<Jurisdiction, TenancyJurisdictionProfile>> = {
  PUNJAB: {
    jurisdiction: "PUNJAB",
    statuteLabel: "Punjab Rented Premises Act, 2009",
    legalSourceCodes: ["PD-LAW-PRPA-2009", "PD-LAW-REG-1908", "PD-LAW-STAMP-1899"],
    notes: "Written tenancy; Rent Registrar entry; Registration Act may apply to longer leases.",
  },
  SINDH: {
    jurisdiction: "SINDH",
    statuteLabel: "Sindh Rented Premises Ordinance, 1979",
    legalSourceCodes: ["PD-LAW-SRPO-1979", "PD-LAW-STAMP-1899"],
    notes: "Provincial ordinance + stamp schedules; confirm current finance-act duty rates.",
  },
  ISLAMABAD_CDA: {
    jurisdiction: "ISLAMABAD_CDA",
    statuteLabel: "ICT rent restriction / rent controller framework",
    legalSourceCodes: ["PD-LAW-ICT-RENT"],
    notes: "Verify current controller registration practice for ICT tenancies.",
  },
  KHYBER_PAKHTUNKHWA: {
    jurisdiction: "KHYBER_PAKHTUNKHWA",
    statuteLabel: "KP rented premises / rent controller framework",
    legalSourceCodes: ["PD-LAW-KP-RENT"],
    notes: "Apply local KP statute; do not import Punjab-only conclusions.",
  },
};

export function tenancyProfileFor(jurisdiction: Jurisdiction): TenancyJurisdictionProfile {
  return (
    PROFILES[jurisdiction] ?? {
      jurisdiction,
      statuteLabel: "Applicable provincial rented-premises law (verify locally)",
      legalSourceCodes: ["PD-LAW-TENANCY-GENERIC"],
      notes: "Jurisdiction not fully specialised in engine — use caution posture.",
    }
  );
}
