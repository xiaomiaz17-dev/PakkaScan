import type { Evidence, Observation } from "../domain/models";

const fields = (evidence: Evidence[], name: string) => evidence.filter((item) => item.field === name);
const norm = (value?: string) => (value ?? "").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}/\s.-]/gu, " ").replace(/\s+/g, " ").trim();
const identityFromParty = (value: string) => value.match(/\b\d{5}-\d{7}-\d\b/)?.[0];
const personFromParty = (value: string) => norm(value.replace(/\b(?:s\/o|d\/o|w\/o)\b[\s\S]*$/i, "").replace(/\(CNIC[\s\S]*$/i, ""));

function numericArea(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.toLocaleLowerCase("en");
  const marla = normalized.match(/([\d.]+)\s*marla/);
  if (marla) return Number(marla[1]);
  const kanal = normalized.match(/([\d.]+)\s*kanal/);
  if (kanal) return Number(kanal[1]) * 20;
  return undefined;
}

function fraction(value?: string): number | undefined {
  const match = value?.match(/(\d+)\s*\/\s*(\d+)/);
  return match ? Number(match[1]) / Number(match[2]) : undefined;
}

export function deriveCrossDocumentObservations(evidence: Evidence[], asOf = new Date("2026-08-01T00:00:00Z")): Observation[] {
  const observations: Observation[] = [];
  const sellers = fields(evidence, "seller");
  const owners = fields(evidence, "owners");
  if (sellers.length && owners.length) {
    const seller = personFromParty(sellers[0].value);
    const sellerId = identityFromParty(sellers[0].value);
    const ownerText = norm(owners.map((item) => item.value).join(" "));
    if (!ownerText.includes(seller) && !(sellerId && ownerText.includes(sellerId))) {
      observations.push({ code: "SELLER_NOT_IN_CURRENT_OWNERSHIP_RECORD", description: "The sale transferor is not identifiable in the supplied current ownership record.", confidence: Math.min(sellers[0].confidence, Math.max(...owners.map((item) => item.confidence))), evidenceIds: [sellers[0].id, ...owners.map((item) => item.id)] });
    }
  }

  const saleKhasra = fields(evidence, "khasra").find((item) => item.documentType === "MUTATION_SALE");
  const fardKhasra = fields(evidence, "khasra").find((item) => item.documentType === "FARD_CURRENT_OWNERSHIP");
  if (saleKhasra && fardKhasra && saleKhasra.normalizedValue !== fardKhasra.normalizedValue) {
    observations.push({ code: "PROPERTY_REFERENCE_MISMATCH", description: "The sale mutation and current ownership record refer to different property identifiers.", confidence: Math.min(saleKhasra.confidence, fardKhasra.confidence), evidenceIds: [saleKhasra.id, fardKhasra.id] });
  }

  const poaShare = fields(evidence, "share").find((item) => item.documentType === "GENERAL_POWER_OF_ATTORNEY");
  const saleArea = fields(evidence, "area").find((item) => item.documentType === "MUTATION_SALE");
  const totalArea = fields(evidence, "total_area").find((item) => item.documentType === "FARD_CURRENT_OWNERSHIP");
  if (poaShare && saleArea && totalArea) {
    const allowed = fraction(poaShare.value);
    const sold = numericArea(saleArea.normalizedValue ?? saleArea.value);
    const total = numericArea(totalArea.normalizedValue ?? totalArea.value);
    if (allowed !== undefined && sold !== undefined && total !== undefined && sold > total * allowed + 0.001) {
      observations.push({ code: "POA_SCOPE_EXCEEDED", description: "The transfer area appears to exceed the principal's expressly authorised share in the Power of Attorney.", confidence: Math.min(poaShare.confidence, saleArea.confidence, totalArea.confidence), evidenceIds: [poaShare.id, saleArea.id, totalArea.id] });
    }
  }

  for (const end of fields(evidence, "search_period_end")) {
    const timestamp = Date.parse(end.normalizedValue ?? end.value);
    if (!Number.isNaN(timestamp)) {
      const ageDays = Math.floor((asOf.getTime() - timestamp) / 86_400_000);
      if (ageDays > 90) observations.push({ code: "NEC_SEARCH_PERIOD_STALE", description: `The non-encumbrance search ends ${ageDays} days before the assessment date.`, confidence: end.confidence, evidenceIds: [end.id], metadata: { ageDays } });
    }
  }

  const hasSale = evidence.some((item) => item.documentType === "MUTATION_SALE");
  const hasFard = evidence.some((item) => item.documentType === "FARD_CURRENT_OWNERSHIP");
  const hasRegisteredDeed = evidence.some((item) => item.documentType === "REGISTERED_SALE_DEED");
  const hasMutation = evidence.some((item) =>
    item.documentType === "MUTATION_SALE" || item.documentType === "MUTATION_GIFT" || item.documentType === "MUTATION_INHERITANCE"
  );
  if (hasRegisteredDeed && !hasMutation) {
    observations.push({
      code: "DEED_WITHOUT_MUTATION_EVIDENCE",
      description: "A registered sale deed is supplied without mutation (Inteqal) evidence on the revenue record.",
      confidence: 0.95,
      evidenceIds: evidence.filter((item) => item.documentType === "REGISTERED_SALE_DEED").slice(0, 3).map((item) => item.id),
    });
  }

  if (hasSale && !hasFard) observations.push({ code: "MISSING_UPDATED_FARD", description: "A sale mutation is supplied without a current ownership Fard or equivalent updated land record.", confidence: 0.99, evidenceIds: evidence.filter((item) => item.documentType === "MUTATION_SALE").slice(0, 3).map((item) => item.id) });
  return observations;
}
