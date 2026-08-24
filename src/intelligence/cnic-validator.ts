/**
 * CNIC validator.
 *
 * Cross-checks CNICs returned by the LLM against the raw OCR text.
 * Matching is digit-normalized (Arabic-Indic → ASCII, ignore dashes/spaces)
 * so Urdu OCR noise does not strip real CNICs as "hallucinated".
 *
 * Pure function, no external dependencies beyond types.
 */
export type ValidatedCnic = {
  value: string;
  status: "verified" | "unverified_hallucinated" | "unverified_altered";
  role?: string;
  originalMatch?: string;
  note?: string;
};
export type CnicValidationReport = {
  verified: ValidatedCnic[];
  hallucinated: ValidatedCnic[];
  altered: ValidatedCnic[];
  droppedByLlm: string[];
  summary: string;
};

/** Map Arabic-Indic and Eastern Arabic digits to ASCII 0-9 */
export function normalizeDigits(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660)) // Arabic-Indic ٠-٩
    .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0)); // Extended Persian ۰-۹
}

/** 13 digits only (CNIC payload without separators) */
export function cnicDigitsOnly(value: string): string {
  return normalizeDigits(value).replace(/\D/g, "");
}

/** Canonical display form XXXXX-XXXXXXX-X when we have 13 digits */
export function formatCnic(digits: string): string {
  const d = cnicDigitsOnly(digits);
  if (d.length !== 13) return digits;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/**
 * Extract CNIC-shaped strings from OCR (flexible separators).
 */
export function findCnicsInText(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeDigits(text);
  const result: string[] = [];
  const seen = new Set<string>();

  // Standard dashed form
  const dashed = normalized.match(/\b\d{5}[\s\-–—]?\d{7}[\s\-–—]?\d\b/g) || [];
  for (const m of dashed) {
    const dig = cnicDigitsOnly(m);
    if (dig.length === 13 && !/^0{13}$/.test(dig) && !seen.has(dig)) {
      seen.add(dig);
      result.push(formatCnic(dig));
    }
  }

  // Bare 13 consecutive digits (common when OCR drops dashes)
  const bare = normalized.match(/\d{13}/g) || [];
  for (const m of bare) {
    if (!/^0{13}$/.test(m) && !seen.has(m)) {
      seen.add(m);
      result.push(formatCnic(m));
    }
  }

  return result;
}

function countDigitDifferences(a: string, b: string): number {
  const da = cnicDigitsOnly(a);
  const db = cnicDigitsOnly(b);
  if (da.length !== 13 || db.length !== 13) return -1;
  let count = 0;
  for (let i = 0; i < 13; i++) {
    if (da[i] !== db[i]) count++;
  }
  return count;
}

function findClosestOcrCnic(
  llmCnic: string,
  ocrCnics: string[]
): { match: string; diffs: number } | null {
  let best: { match: string; diffs: number } | null = null;
  for (const ocr of ocrCnics) {
    const diffs = countDigitDifferences(llmCnic, ocr);
    if (diffs > 0 && diffs <= 2) {
      if (!best || diffs < best.diffs) {
        best = { match: ocr, diffs };
      }
    }
  }
  return best;
}

export function validateCnics(
  llmCnics: Array<{ value: string; role?: string }>,
  ocrText: string
): CnicValidationReport {
  const ocrCnics = findCnicsInText(ocrText);
  const ocrDigitSet = new Set(ocrCnics.map(cnicDigitsOnly));
  const verified: ValidatedCnic[] = [];
  const hallucinated: ValidatedCnic[] = [];
  const altered: ValidatedCnic[] = [];
  const seenLlmValues = new Set<string>();

  for (const { value, role } of llmCnics) {
    if (!value) continue;
    const dig = cnicDigitsOnly(value);
    if (dig.length !== 13) continue;
    if (seenLlmValues.has(dig)) continue;
    seenLlmValues.add(dig);

    if (ocrDigitSet.has(dig)) {
      verified.push({ value: formatCnic(dig), status: "verified", role });
    } else {
      const closest = findClosestOcrCnic(value, ocrCnics);
      if (closest) {
        altered.push({
          value: formatCnic(dig),
          status: "unverified_altered",
          role,
          originalMatch: closest.match,
          note: `CRITICAL WARNING: CNIC transposition/typo likely — document shows '${closest.match}' but extraction returned '${formatCnic(dig)}' (${closest.diffs} digit difference). Verify on signature page.`,
        });
      } else {
        // Last chance: 13 digits appear in OCR blob even if not captured as structured CNIC
        const blob = cnicDigitsOnly(ocrText);
        if (blob.includes(dig)) {
          verified.push({ value: formatCnic(dig), status: "verified", role });
        } else {
          hallucinated.push({
            value: formatCnic(dig),
            status: "unverified_hallucinated",
            role,
            note: `This CNIC was not found in the source document. It may have been fabricated by the AI.`,
          });
        }
      }
    }
  }

  const llmDigitSet = new Set(
    llmCnics.map((c) => cnicDigitsOnly(c.value)).filter((d) => d.length === 13)
  );
  const droppedByLlm = ocrCnics.filter((c) => !llmDigitSet.has(cnicDigitsOnly(c)));

  const summary = buildSummary({
    total: llmCnics.length,
    verified: verified.length,
    hallucinated: hallucinated.length,
    altered: altered.length,
    droppedByLlm: droppedByLlm.length,
  });
  return { verified, hallucinated, altered, droppedByLlm, summary };
}

function buildSummary(counts: {
  total: number;
  verified: number;
  hallucinated: number;
  altered: number;
  droppedByLlm: number;
}): string {
  const parts: string[] = [];
  parts.push(`${counts.verified}/${counts.total} verified`);
  if (counts.hallucinated > 0) parts.push(`${counts.hallucinated} hallucinated`);
  if (counts.altered > 0) parts.push(`${counts.altered} altered`);
  if (counts.droppedByLlm > 0) parts.push(`${counts.droppedByLlm} dropped by LLM`);
  return parts.join(", ");
}

/**
 * Apply validation to SmartFields-style object, mutating parties in place.
 */
export function applyCnicValidation(smartFields: any, ocrText: string): any {
  if (!smartFields || typeof smartFields !== "object") return smartFields;
  const llmCnics: Array<{ value: string; role: string }> = [];
  const parties = smartFields.parties || {};
  for (const role of [
    "landlord",
    "tenant",
    "seller",
    "buyer",
    "holder",
    "principal",
    "attorney",
    "donor",
    "donee",
    "mortgagor",
    "mortgagee",
    "transferor",
    "transferee",
    "owner",
  ]) {
    if (parties[role]?.cnic) {
      llmCnics.push({ value: parties[role].cnic, role });
    }
  }
  if (Array.isArray(parties.witnesses)) {
    parties.witnesses.forEach((w: any, i: number) => {
      if (w?.cnic) llmCnics.push({ value: w.cnic, role: `witness_${i + 1}` });
    });
  }
  if (Array.isArray(parties.additional_parties)) {
    parties.additional_parties.forEach((p: any, i: number) => {
      if (p?.cnic) llmCnics.push({ value: p.cnic, role: `additional_party_${i + 1}` });
    });
  }
  const report = validateCnics(llmCnics, ocrText);
  const hallucinatedSet = new Set(report.hallucinated.map((h) => cnicDigitsOnly(h.value)));
  const alteredMap = new Map(
    report.altered.map((a) => [cnicDigitsOnly(a.value), a] as const)
  );
  const rewriteParty = (party: any) => {
    if (!party || !party.cnic) return party;
    const dig = cnicDigitsOnly(party.cnic);
    if (hallucinatedSet.has(dig)) {
      return {
        ...party,
        cnic: null,
        cnic_unverified: true,
        cnic_note: `AI returned '${party.cnic}' but this CNIC was not found in the document. Removed for safety.`,
      };
    }
    const altered = alteredMap.get(dig);
    if (altered && altered.originalMatch) {
      return {
        ...party,
        cnic: altered.originalMatch,
        cnic_unverified: false,
        cnic_note: undefined,
      };
    }
    // Prefer canonical form if verified
    if (dig.length === 13) {
      return { ...party, cnic: formatCnic(dig) };
    }
    return party;
  };
  const rewrittenParties: any = {};
  for (const key of Object.keys(parties)) {
    if (key === "witnesses" || key === "additional_parties") {
      const arr = parties[key];
      if (Array.isArray(arr)) {
        rewrittenParties[key] = arr.map(rewriteParty);
      } else {
        rewrittenParties[key] = arr;
      }
    } else {
      rewrittenParties[key] = rewriteParty(parties[key]);
    }
  }
  return {
    ...smartFields,
    parties: rewrittenParties,
    _cnicValidation: report,
    additional_cnics_found_in_document:
      report.droppedByLlm.length > 0 ? report.droppedByLlm : undefined,
  };
}
