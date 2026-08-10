import type { ClassificationCandidate } from "./types";
import type { DocumentType, Jurisdiction } from "../domain/models";

type Signature = {
  type: DocumentType;
  jurisdiction: Jurisdiction;
  phrases: string[];
  /**
   * Optional required phrases. At least one MUST match, otherwise the
   * signature is disqualified regardless of how many `phrases` matched.
   * Used to prevent bleed-over from documents that share party labels
   * (e.g. Bayana uses VENDOR/VENDEE but is NOT a registered sale deed).
   */
  requires?: string[];
};

const signatures: Signature[] = [
  { type: "IDENTITY_CNIC", jurisdiction: "PAKISTAN_FEDERAL", phrases: ["national identity card", "nadra", "cnic"] },
  { type: "IDENTITY_NICOP", jurisdiction: "PAKISTAN_FEDERAL", phrases: ["national identity card for overseas pakistanis", "nicop"] },
  { type: "IDENTITY_POC", jurisdiction: "PAKISTAN_FEDERAL", phrases: ["pakistan origin card", "poc"] },
  { type: "FAMILY_REGISTRATION_CERTIFICATE", jurisdiction: "PAKISTAN_FEDERAL", phrases: ["family registration certificate", "family head"] },
  { type: "FARD_SALE_PURPOSE", jurisdiction: "PUNJAB", phrases: ["fard-e-malkiyat", "bara-e-baye", "for sale only"] },
  { type: "FARD_COURT_SURETY", jurisdiction: "PUNJAB", phrases: ["bara-e-zamanat", "bail bond", "court lien"] },
  { type: "FARD_CURRENT_OWNERSHIP", jurisdiction: "PUNJAB", phrases: ["fard-e-malkiyat", "khewat", "khatoni"] },
  { type: "MUTATION_SALE", jurisdiction: "PUNJAB", phrases: ["mutation register", "sale (baye)", "transferor"] },
  { type: "MUTATION_GIFT", jurisdiction: "PUNJAB", phrases: ["inteqal hiba", "donor", "donee"] },
  { type: "MUTATION_INHERITANCE", jurisdiction: "PUNJAB", phrases: ["mutation", "inheritance", "legal heirs"] },
  { type: "MUTATION_MORTGAGE", jurisdiction: "PUNJAB", phrases: ["inteqal rahn", "mortgagor", "mortgagee"] },

  // Bayana / Agreement to Sell — MUST come before REGISTERED_SALE_DEED
  // because Bayanas often contain "vendor" / "vendee" party labels and
  // the phrase "final sale deed" as a forward reference.
  {
    type: "AGREEMENT_TO_SELL",
    jurisdiction: "UNKNOWN",
    phrases: [
      "agreement to sell",
      "bayana",
      "token money",
      "earnest money",
      "token amount",
      "balance amount",
      "liquidated damages",
      "backs out",
      "final sale deed",
    ],
    requires: ["agreement to sell", "bayana", "token money", "earnest money", "token amount"],
  },

  // Registered Sale Deed — requires proof of actual registration, not just
  // party labels. A document containing only "vendor" + "vendee" is NOT
  // a registered sale deed (could be a Bayana, template, or draft).
  {
    type: "REGISTERED_SALE_DEED",
    jurisdiction: "UNKNOWN",
    phrases: [
      "registered sale deed",
      "sale deed (registry)",
      "sub-registrar",
      "office of the sub-registrar",
      "registration act",
      "registration no",
      "book-i",
      "presented before the sub-registrar",
    ],
    requires: [
      "registered sale deed",
      "sale deed (registry)",
      "sub-registrar",
      "office of the sub-registrar",
      "registration act",
      "book-i",
      "presented before the sub-registrar",
    ],
  },

  { type: "GIFT_DEED", jurisdiction: "UNKNOWN", phrases: ["hiba-nama", "deed of gift", "donor", "donee"] },
  { type: "RELINQUISHMENT_DEED", jurisdiction: "UNKNOWN", phrases: ["deed of relinquishment", "dastbardari nama"] },
  { type: "CANCELLATION_DEED", jurisdiction: "UNKNOWN", phrases: ["deed of cancellation", "cancel and annul"] },
  { type: "NON_ENCUMBRANCE_CERTIFICATE", jurisdiction: "UNKNOWN", phrases: ["non-encumbrance certificate", "free from all encumbrances"] },
  { type: "GENERAL_POWER_OF_ATTORNEY", jurisdiction: "UNKNOWN", phrases: ["general power of attorney", "mukhtar-e-aam"] },
  { type: "AUTHORITY_TRANSFER_APPLICATION", jurisdiction: "ISLAMABAD_CDA", phrases: ["capital development authority", "application for transfer of plot"] },
  { type: "BUILDING_PLAN_APPROVAL", jurisdiction: "UNKNOWN", phrases: ["building plan approval", "building control"] },
  { type: "SALE_DEED_TEMPLATE", jurisdiction: "UNKNOWN", phrases: ["[vendor name]", "[plot no]", "[amount in figures]"] },

  // Tenancy — Bayana-style Urdu stamp paper docs sometimes trigger sale-deed
  // rules; we add tenancy to the ingestion classifier so we do not lose
  // Urdu-only documents when they route through this file.
  {
    type: "TENANCY_AGREEMENT",
    jurisdiction: "UNKNOWN",
    phrases: [
      "tenancy agreement",
      "rent agreement",
      "rental agreement",
      "deed of tenancy",
      "monthly rent",
      "security deposit",
      "landlord",
      "tenant",
      "lessor",
      "lessee",
    ],
    requires: [
      "tenancy agreement",
      "rent agreement",
      "rental agreement",
      "deed of tenancy",
      "monthly rent",
    ],
  },
];

function normalise(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/g, " ");
}

export function classifyDocument(text: string): ClassificationCandidate[] {
  const haystack = normalise(text);

  const candidates = signatures
    .map((signature) => {
      const hits = signature.phrases.filter((phrase) => haystack.includes(normalise(phrase)));

      // If this signature declares required phrases, at least one must match.
      // Otherwise the signature is disqualified — no matter how many other
      // phrases happen to hit, this document is NOT of this type.
      if (signature.requires && signature.requires.length > 0) {
        const requiredHit = signature.requires.some((phrase) =>
          haystack.includes(normalise(phrase))
        );
        if (!requiredHit) {
          return {
            documentType: signature.type,
            jurisdiction: signature.jurisdiction,
            confidence: 0,
            reasons: [],
          } satisfies ClassificationCandidate;
        }
      }

      return {
        documentType: signature.type,
        jurisdiction: signature.jurisdiction,
        confidence: Number((hits.length / signature.phrases.length).toFixed(4)),
        reasons: hits.map((hit) => `Matched phrase: ${hit}`),
      } satisfies ClassificationCandidate;
    })
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || a.documentType.localeCompare(b.documentType));

  return candidates.length
    ? candidates
    : [{ documentType: "UNKNOWN", jurisdiction: "UNKNOWN", confidence: 0, reasons: ["No known signature matched."] }];
}
