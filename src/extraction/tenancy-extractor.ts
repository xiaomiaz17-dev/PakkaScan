/**
 * Tenancy / Lease agreement specific extractor.
 * Called by extractors.ts when documentType is TENANCY_AGREEMENT or LEASE_DEED.
 *
 * Returns fields tailored to rental agreements. Emitted fields are then
 * merged with universal-extractors output — the higher-confidence wins.
 */

import type { RawField } from "./types";

function makeField(field: string, value: string, confidence = 0.85): RawField | null {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return { field, value: cleaned, confidence, page: 1, rawText: cleaned };
}

/**
 * Look up a labelled value on the same line.
 * Handles both English labels and common Urdu / Roman-Urdu equivalents.
 */
function labelValue(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`${escaped}\\s*[:\\-]?\\s*([^\\n\\r]+)`, "i");
    const m = text.match(rx);
    if (m && m[1] && m[1].trim().length > 1) return m[1].trim();
  }
  return undefined;
}

export function extractTenancyFields(text: string): RawField[] {
  const out: (RawField | null)[] = [];

  // Landlord identification — try both "Landlord:" style and free-text party clauses
  const landlordLine = labelValue(text, [
    "Landlord",
    "Owner",
    "Lessor",
    "First Party",
    "Party of the First Part",
    "Malik",
    "مالک",
  ]);
  if (landlordLine) out.push(makeField("landlord_name", landlordLine, 0.85));

  const tenantLine = labelValue(text, [
    "Tenant",
    "Lessee",
    "Second Party",
    "Party of the Second Part",
    "Mustajir",
    "مستاجر",
  ]);
  if (tenantLine) out.push(makeField("tenant_name", tenantLine, 0.85));

  // Monthly rent — Pakistani agreements often say "Rs. XXX/- per month" or
  // "monthly rent of Rs XXX".
  const rentPatterns: RegExp[] = [
    /(?:monthly\s+rent|rent\s+per\s+month|per\s+month\s+rent)[\s\S]{0,40}?(?:pkr|rs\.?|₨)\s*([\d,]+)/i,
    /(?:pkr|rs\.?|₨)\s*([\d,]+)[\s\S]{0,20}?(?:per\s+month|p\.m\.?|monthly|\/month)/i,
    /(?:کرایہ|kiraaya|kraaya)[\s\S]{0,30}?(?:pkr|rs\.?|₨)?\s*([\d,]+)/i,
  ];
  for (const rx of rentPatterns) {
    const m = text.match(rx);
    if (m && m[1]) {
      out.push(makeField("monthly_rent", `PKR ${m[1]}`, 0.9));
      break;
    }
  }

  // Security deposit
  const depositPatterns: RegExp[] = [
    /(?:security\s+deposit|refundable\s+security|advance\s+security)[\s\S]{0,40}?(?:pkr|rs\.?|₨)\s*([\d,]+)/i,
    /(?:pkr|rs\.?|₨)\s*([\d,]+)[\s\S]{0,20}?(?:as\s+security|security\s+deposit|refundable)/i,
  ];
  for (const rx of depositPatterns) {
    const m = text.match(rx);
    if (m && m[1]) {
      out.push(makeField("security_deposit", `PKR ${m[1]}`, 0.9));
      break;
    }
  }

  // Tenancy period — either "for a period of X months/years" or explicit start/end
  const durationMatch = text.match(
    /(?:period\s+of|for\s+a\s+period\s+of|term\s+of)\s+(\d+)\s+(months?|years?)/i,
  );
  if (durationMatch) {
    out.push(
      makeField(
        "tenancy_duration",
        `${durationMatch[1]} ${durationMatch[2].toLowerCase()}`,
        0.85,
      ),
    );
  }

  // Demised premises / property description
  const premisesMatch = text.match(
    /(?:demised\s+premises|premises\s+described|rented\s+premises|property\s+being\s+let)[:\s]+(.{15,250}?)(?=[.]|\n\n|\bshall\b)/i,
  );
  if (premisesMatch && premisesMatch[1]) {
    out.push(makeField("property_reference", premisesMatch[1].trim(), 0.75));
  }

  // Increment clause (common Pakistani stamp paper phrase)
  const incrementMatch = text.match(
    /(?:increment|increase)\s+of\s+(\d+)\s*%\s*(?:per|after\s+each)\s+(year|annum)/i,
  );
  if (incrementMatch) {
    out.push(makeField("rent_increment_percentage", `${incrementMatch[1]}%`, 0.85));
  }

  // Purpose (residential / commercial)
  if (/\b(?:residential|residence|dwelling|habitation)\b/i.test(text)) {
    out.push(makeField("premises_purpose", "residential", 0.7));
  } else if (/\b(?:commercial|business|office|shop)\b/i.test(text)) {
    out.push(makeField("premises_purpose", "commercial", 0.7));
  }

  return out.filter((x): x is RawField => x !== null);
}