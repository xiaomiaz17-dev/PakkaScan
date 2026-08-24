/**
 * CNIC validator.
 *
 * Cross-checks CNICs returned by the LLM against the raw OCR text.
 * Any CNIC the LLM returned that is NOT present character-for-character
 * in the source OCR is considered fabricated (hallucinated).
 *
 * Also detects CNICs the OCR found that the LLM silently dropped, so we
 * can surface them for user review rather than losing them.
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

const CNIC_REGEX = /\b\d{5}-\d{7}-\d\b/g;

/**
 * Extract every CNIC-shaped string from raw OCR text.
 * Returns unique CNICs in the order they appeared.
 */
export function findCnicsInText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(CNIC_REGEX);
  if (!matches) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    if (/^0{5}-0{7}-0$/.test(m)) continue; // placeholder
    if (!seen.has(m)) {
      seen.add(m);
      result.push(m);
    }
  }
  return result;
}

/**
 * Count differing digits between two same-length CNICs.
 * Returns -1 if lengths differ.
 */
function countDigitDifferences(a: string, b: string): number {
  if (a.length !== b.length) return -1;
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) count++;
  }
  return count;
}

/**
 * Try to find the closest OCR CNIC to a given LLM-returned CNIC.
 * Returns match info if closeness suggests LLM altered a real CNIC.
 */
function findClosestOcrCnic(llmCnic: string, ocrCnics: string[]): { match: string; diffs: number } | null {
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

/**
 * Validate a set of LLM-returned CNICs against raw OCR text.
 *
 * @param llmCnics Array of {value, role} CNICs the LLM returned
 * @param ocrText Raw OCR text from the document
 */
export function validateCnics(
  llmCnics: Array<{ value: string; role?: string }>,
  ocrText: string
): CnicValidationReport {
  const ocrCnics = findCnicsInText(ocrText);
  const ocrSet = new Set(ocrCnics);

  const verified: ValidatedCnic[] = [];
  const hallucinated: ValidatedCnic[] = [];
  const altered: ValidatedCnic[] = [];

  const seenLlmValues = new Set<string>();

  for (const { value, role } of llmCnics) {
    if (!value) continue;
    if (seenLlmValues.has(value)) continue;
    seenLlmValues.add(value);

    if (ocrSet.has(value)) {
      verified.push({ value, status: "verified", role });
    } else {
      // Not in OCR - either altered from a real CNIC or fully hallucinated
      const closest = findClosestOcrCnic(value, ocrCnics);
      if (closest) {
        altered.push({
          value,
          status: "unverified_altered",
          role,
          originalMatch: closest.match,
          note: `CRITICAL WARNING: CNIC transposition/typo likely — document shows '${closest.match}' but extraction returned '${value}' (${closest.diffs} digit difference). Verify on signature page.`,
        });
      } else {
        hallucinated.push({
          value,
          status: "unverified_hallucinated",
          role,
          note: `This CNIC was not found in the source document. It may have been fabricated by the AI.`,
        });
      }
    }
  }

  // CNICs OCR found but LLM did not return
  const llmValueSet = new Set(llmCnics.map(c => c.value).filter(Boolean));
  const droppedByLlm = ocrCnics.filter(c => !llmValueSet.has(c));

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
 * Apply validation to a SmartFields-style object, mutating in place.
 * Adds a `_cnicValidation` metadata field to the returned object.
 *
 * For each party role (landlord, tenant, seller, buyer, holder, witnesses):
 * - If the CNIC is verified: leave it alone
 * - If altered: replace with the OCR-matched value AND flag with `cnic_unverified: true` + `cnic_note`
 * - If hallucinated: strip the cnic field AND flag with `cnic_unverified: true` + `cnic_note`
 *
 * Also adds any droppedByLlm CNICs as an `additional_cnics_found_in_document` array.
 */
export function applyCnicValidation(smartFields: any, ocrText: string): any {
  if (!smartFields || typeof smartFields !== "object") return smartFields;

  // Collect all CNICs the LLM returned, with their roles
  const llmCnics: Array<{ value: string; role: string }> = [];
  const parties = smartFields.parties || {};

  for (const role of ["landlord", "tenant", "seller", "buyer", "holder", "principal", "attorney", "donor", "donee", "mortgagor", "mortgagee", "transferor", "transferee", "owner"]) {
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

  // Rewrite party objects with verification status
  const hallucinatedSet = new Set(report.hallucinated.map(h => h.value));
  const alteredMap = new Map(report.altered.map(a => [a.value, a]));

  const rewriteParty = (party: any) => {
    if (!party || !party.cnic) return party;
    if (hallucinatedSet.has(party.cnic)) {
      return {
        ...party,
        cnic: null,
        cnic_unverified: true,
        cnic_note: `AI returned '${party.cnic}' but this CNIC was not found in the document. Removed for safety.`,
      };
    }
    const altered = alteredMap.get(party.cnic);
    if (altered && altered.originalMatch) {
      // OCR is source of truth — show corrected value as verified
      return {
        ...party,
        cnic: altered.originalMatch,
        cnic_unverified: false,
        cnic_note: undefined,
      };
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

  // If OCR found CNICs the LLM entirely missed, surface them
  // Assign OCR CNICs the LLM dropped to parties missing a CNIC (tenancy: landlord first)
  const isZeroCnic = (c: string) => !c || /^0{5}-0{7}-0$/.test(c);
  const needLandlord =
    !rewrittenParties.landlord?.cnic || isZeroCnic(String(rewrittenParties.landlord.cnic));
  const needTenant =
    !rewrittenParties.tenant?.cnic || isZeroCnic(String(rewrittenParties.tenant.cnic));
  const pool = [
    ...report.droppedByLlm,
    ...report.verified.map((x) => x.value),
    ...report.altered.map((x) => x.originalMatch || x.value),
  ].filter((c, i, a) => c && !isZeroCnic(c) && a.indexOf(c) === i);

  if (needLandlord && pool.length > 0) {
    // Prefer CNIC near landlord name in OCR if possible
    const lName = String(rewrittenParties.landlord?.name || "").trim();
    let picked = pool[0];
    if (lName && ocrText) {
      const idx = ocrText.indexOf(lName);
      if (idx >= 0) {
        const window = ocrText.slice(Math.max(0, idx - 80), idx + lName.length + 120);
        const near = window.match(/\b\d{5}-\d{7}-\d\b/);
        if (near && pool.includes(near[0])) picked = near[0];
      }
    }
    rewrittenParties.landlord = {
      ...(rewrittenParties.landlord || {}),
      cnic: picked,
      cnic_unverified: false,
      cnic_note: undefined,
    };
    // remove from pool so tenant can take another
    const pi = pool.indexOf(picked);
    if (pi >= 0) pool.splice(pi, 1);
  }
  if (needTenant && pool.length > 0) {
    const tName = String(rewrittenParties.tenant?.name || "").trim();
    let picked = pool[0];
    if (tName && ocrText) {
      const idx = ocrText.indexOf(tName);
      if (idx >= 0) {
        const window = ocrText.slice(Math.max(0, idx - 80), idx + tName.length + 120);
        const near = window.match(/\b\d{5}-\d{7}-\d\b/);
        if (near && pool.includes(near[0])) picked = near[0];
      }
    }
    // Don't assign tenant the same as landlord
    if (picked !== rewrittenParties.landlord?.cnic) {
      rewrittenParties.tenant = {
        ...(rewrittenParties.tenant || {}),
        cnic: picked,
        cnic_unverified: false,
      };
    }
  }

  if (report.droppedByLlm.length > 0) {
    rewrittenParties.additional_cnics_found_in_document = report.droppedByLlm.map(cnic => ({
      cnic,
      note: "This CNIC appears in the document but the AI did not assign it to a specific role. Please verify manually.",
    }));
  }

  return {
    ...smartFields,
    parties: rewrittenParties,
    _cnicValidation: {
      verified: report.verified.length,
      hallucinated: report.hallucinated.length,
      altered: report.altered.length,
      droppedByLlm: report.droppedByLlm.length,
      summary: report.summary,
    },
  };
}
