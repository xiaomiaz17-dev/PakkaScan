/**
 * Jurisdiction profiles for property conveyancing analysis (decision-support).
 */

import type { Jurisdiction } from "../domain/models";

export type PropertyJurisdictionProfile = {
  jurisdiction: Jurisdiction;
  label: string;
  revenueAuthority: string;
  registryNotes: string;
  societyNotes: string;
  legalSourceCodes: string[];
  transferChecklist: string[];
  caution: string;
};

const PROFILES: Partial<Record<Jurisdiction, PropertyJurisdictionProfile>> = {
  PUNJAB: {
    jurisdiction: "PUNJAB",
    label: "Punjab",
    revenueAuthority: "PLRA / Punjab land revenue record (Fard, Inteqal)",
    registryNotes: "Sub-registrar sale deed under Registration Act; stamp per Punjab schedules.",
    societyNotes: "DHA and private societies: allotment, NDC/NOC, phase-specific transfer packs.",
    legalSourceCodes: [
      "PD-LAW-TPA-1882",
      "PD-LAW-REG-1908",
      "PD-LAW-STAMP-1899",
      "PD-LAW-LRA-1967",
      "PD-LAW-PLRA-2017",
    ],
    transferChecklist: [
      "Current Fard / ownership record",
      "Registered transfer instrument (sale/gift/etc.)",
      "Mutation (Inteqal) entry or proof",
      "CNIC of transferor/transferee",
      "NEC / encumbrance search where appropriate",
      "Society NDC/NOC if scheme property",
    ],
    caution: "Do not treat registry alone as completed revenue mutation.",
  },
  SINDH: {
    jurisdiction: "SINDH",
    label: "Sindh",
    revenueAuthority: "Sindh Board of Revenue / provincial land record practice",
    registryNotes: "Registration Act + Sindh stamp schedules (rates change with finance acts).",
    societyNotes: "KDA/DHA and societies: clearance and transfer formalities in parallel with registry.",
    legalSourceCodes: ["PD-LAW-TPA-1882", "PD-LAW-REG-1908", "PD-LAW-STAMP-1899", "PD-LAW-SINDH-REVENUE"],
    transferChecklist: [
      "Title / ownership record as locally issued",
      "Registered deed",
      "Mutation / revenue update where applicable",
      "Identity documents",
      "Encumbrance search",
      "Society/authority NOC if applicable",
    ],
    caution: "Confirm current Sindh stamp and revenue digital procedures for the district.",
  },
  ISLAMABAD_CDA: {
    jurisdiction: "ISLAMABAD_CDA",
    label: "Islamabad / CDA",
    revenueAuthority: "CDA / ICT processes for authority land; registry for freehold as applicable",
    registryNotes: "Sub-registrar instruments where freehold; CDA transfer pack for authority plots.",
    societyNotes: "DHA I-R and societies: NDC, allotment/share certificate, dues windows.",
    legalSourceCodes: ["PD-LAW-TPA-1882", "PD-LAW-REG-1908", "PD-LAW-ICT-CDA", "PD-LAW-ICT-NEC"],
    transferChecklist: [
      "Allotment / title letter",
      "CDA transfer application materials",
      "NOC / dues / property tax clearance",
      "Registered deed if applicable",
      "ICT NEC where required",
      "CNICs and photos/signatures as per pack",
    ],
    caution: "Authority land and society transfers often hinge on dues clearance validity windows.",
  },
  KHYBER_PAKHTUNKHWA: {
    jurisdiction: "KHYBER_PAKHTUNKHWA",
    label: "Khyber Pakhtunkhwa",
    revenueAuthority: "KP Board of Revenue / local land record practice",
    registryNotes: "Registration Act + KP stamp practice.",
    societyNotes: "Local society/authority clearances where the property sits in a scheme.",
    legalSourceCodes: ["PD-LAW-TPA-1882", "PD-LAW-REG-1908", "PD-LAW-STAMP-1899", "PD-LAW-KP-REVENUE"],
    transferChecklist: [
      "Current ownership record",
      "Registered transfer instrument",
      "Mutation/revenue update",
      "Identity documents",
      "Encumbrance search",
    ],
    caution: "Do not import Punjab PLRA-only conclusions without local verification.",
  },
  PAKISTAN_FEDERAL: {
    jurisdiction: "PAKISTAN_FEDERAL",
    label: "Federal / cross-provincial",
    revenueAuthority: "Depends on situs of land — always resolve province/ICT first",
    registryNotes: "TPA + Registration Act baseline.",
    societyNotes: "Scheme rules depend on developer/authority.",
    legalSourceCodes: ["PD-LAW-TPA-1882", "PD-LAW-REG-1908", "PD-LAW-STAMP-1899"],
    transferChecklist: ["Identify situs jurisdiction", "Registry instrument", "Revenue mutation", "Encumbrances"],
    caution: "Select the provincial profile of the property location before scoring certainty.",
  },
};

export function propertyProfileFor(jurisdiction: Jurisdiction): PropertyJurisdictionProfile {
  return (
    PROFILES[jurisdiction] ?? {
      jurisdiction,
      label: String(jurisdiction),
      revenueAuthority: "Local revenue authority (verify)",
      registryNotes: "Registration Act framework — confirm local office practice.",
      societyNotes: "Scheme-specific if applicable.",
      legalSourceCodes: ["PD-LAW-TPA-1882", "PD-LAW-REG-1908"],
      transferChecklist: ["Ownership record", "Registered instrument", "Mutation", "Identity", "Encumbrance search"],
      caution: "Jurisdiction not fully specialised — prefer PROCEED_WITH_CAUTION under uncertainty.",
    }
  );
}
