/**
 * MVP tenancy completeness checks on extracted text (English + Urdu cues).
 * Decision-support only — not a substitute for legal review.
 */

export type CompletenessFinding = {
  code: string;
  title: string;
  message: string;
  effect: "DEDUCTION" | "BLOCKER" | "INCONCLUSIVE";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  scoreImpact: number;
};

/** True only for classic unfilled party blocks — not signature underlines. */
function blankHeavy(text: string): boolean {
  const partyFillIn =
    /BETWEEN:[\s\S]{0,400}Mr\.\/Ms\.\s*_+/i.test(text) ||
    (/Hereinafter referred to as the\s*["']LANDLORD/i.test(text) &&
      /Mr\.\/Ms\.\s*_+/i.test(text));

  const blankMr = (text.match(/Mr\.\/Ms\.\s*_+/gi) || []).length;
  const blankPartyCnic = (text.match(/(?:Holding\s+)?CNIC\s*(No\.?)?\s*:?\s*_+/gi) || []).length;

  if (partyFillIn || blankMr >= 1) {
    return blankMr + blankPartyCnic >= 2;
  }
  return false;
}

function hasFilledPartyNames(text: string): boolean {
  if (/Mr\.\/Ms\.\s*_+/i.test(text)) return false;
  if (/LANDLORD[^\n]*CNIC:\s*_+/i.test(text) && /TENANT[^\n]*CNIC:\s*_+/i.test(text)) {
    return false;
  }
  const named =
    /(?:landlord|tenant|lessor|lessee|mr\.?|mrs\.?|ms\.?)[^\n]{0,60}[A-Z][a-z]+\s+[A-Z][a-z]+/i.test(
      text,
    );
  const landlord = /(?:landlord|lessor|first party|مالک|مالک\s*مکان)[^\n]{0,100}/i.test(text);
  const tenant = /(?:tenant|lessee|second party|مستاجر|کرایہ\s*دار)[^\n]{0,100}/i.test(text);
  // CNIC pattern near party language
  const cnicNearParty =
    /(?:CNIC|شناختی|۵\d{4}-\d{7}-\d|5\d{4}-\d{7}-\d|\d{5}-\d{7}-\d)/i.test(text) &&
    (landlord || tenant || /طرف\s*اول|طرف\s*دوم|party/i.test(text));
  // Two proper-looking Latin names anywhere (common on bilingual forms)
  const twoLatinNames = (/[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}/.test(text) &&
    (text.match(/[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}/g) || []).length >= 2);
  return named || (landlord && tenant) || landlord || tenant || cnicNearParty || twoLatinNames;
}

function hasRentAmount(text: string): boolean {
  return (
    /(?:monthly\s+rent|rent\s*(?:of|is|:)|rs\.?\s*[\d,]+|pkr\s*[\d,]+|روپے|روپیہ|کرایہ)/i.test(
      text,
    ) &&
    (/(?:\d{3,}|\d,\d{3}|[\u06F0-\u06F9]{3,})/.test(text) ||
      /کرایہ/.test(text))
  );
}

function hasTerm(text: string): boolean {
  return (
    /(?:period|term|duration|for a (?:period )?of)\s*(?:of\s*)?\d+\s*(?:months?|years?)/i.test(
      text,
    ) ||
    /\d+\s*(?:months?|years?)\s+(?:from|commencing|starting|beginning)/i.test(text) ||
    /(?:eleven|twelve|one|two|three|six|24|12|11)\s*(?:months?|years?)/i.test(text) ||
    /tenancy\s+(?:period|term)/i.test(text) ||
    /مدت/.test(text) ||
    /(?:ماہ|مہینہ|سال)/.test(text) ||
    /\d{1,2}[-./]\w{3,}[-./]\d{2,4}/.test(text) // dated term markers
  );
}

function hasWitnessBlock(text: string): boolean {
  return (
    /\bwitness(?:es)?\b/i.test(text) ||
    /گواہ/.test(text) ||
    /شہادت/.test(text)
  );
}

function hasGoverningLaw(text: string): boolean {
  return (
    /(?:governed|under the provisions?|rented premises|rent ordinance|rent act)/i.test(
      text,
    ) ||
    /معاہدہ/.test(text) ||
    /کرایہ\s*داری/.test(text) ||
    /stamp\s*vendor|stamp\s*paper|rupees\s*\d+/i.test(text)
  );
}

function jurisdictionHints(text: string): string[] {
  const hints: string[] = [];
  if (/lahore|punjab|plra|punjab rented/i.test(text)) hints.push("PUNJAB");
  if (/karachi|sindh|کراچی|سندھ/i.test(text)) hints.push("SINDH");
  if (/islamabad|cda|rawalpindi/i.test(text)) hints.push("ISLAMABAD_CDA");
  if (/peshawar|khyber|kpk|kp\b/i.test(text)) hints.push("KHYBER_PAKHTUNKHWA");
  return hints;
}

function hasSecurityDeposit(text: string): boolean {
  return (
    /(?:security\s*deposit|security\s*money|advance\s*rent|refundable\s*deposit|Ø§Ù…Ø§Ù†Øª|Ø±ÛÙ†|ÚˆÙ¾Ø§Ø²Ù¹)/i.test(text) &&
    (/(?:\d{3,}|rs\.?|pkr|Ø±ÙˆÙ¾)/i.test(text) || /deposit/i.test(text))
  );
}
function hasNoticePeriod(text: string): boolean {
  return (
    /(?:\d+\s*(?:days?|months?)\s*(?:prior\s*)?notice|notice\s*(?:period|of)|written\s*notice|Ø§Ø·Ù„Ø§Ø¹)/i.test(text)
  );
}
function hasLandlordCnicCue(text: string): boolean {
  return (
    /(?:landlord|lessor|first\s*party)[\s\S]{0,120}(?:CNIC|NICOP|Ø´Ù†Ø§Ø®ØªÛŒ)/i.test(text) ||
    /(?:CNIC|NICOP)[\s\S]{0,80}(?:landlord|lessor)/i.test(text) ||
    (/\d{5}-\d{7}-\d/.test(text) && /(?:landlord|lessor|Ù…Ø§Ù„Ú©)/i.test(text))
  );
}
function hasOneSidedEviction(text: string): boolean {
  if (!text || text.length < 40) return false;
  // Normal PK practice: terminate for unpaid rent — do not flag
  const nonPayment =
    /(?:non[-\s]?payment|default\s+in\s+(?:the\s+)?rent|unpaid\s+rent|rent\s+in\s+arrears|fails?\s+to\s+pay|does\s+not\s+pay\s+(?:the\s+)?rent|کرایہ\s*ادا\s*نہ)/i.test(
      text
    );
  const noNotice =
    /(?:without\s+(?:any\s+)?(?:prior\s+)?notice|no\s+prior\s+notice|evict(?:s|ion)?\s+without\s+notice)/i.test(
      text
    );
  const vagueBreach =
    /(?:prohibited\s+(?:item|use)|unauthori[sz]ed\s+use|any\s+breach|violation\s+of\s+any\s+condition)/i.test(
      text
    );
  const lockBreak =
    /(?:break(?:ing)?\s+(?:the\s+)?lock|force\s+open|remove\s+(?:the\s+)?tenant'?s?\s+belongings)/i.test(
      text
    );
  const stayBan =
    /(?:stay\s+order|injunction).{0,50}(?:not\s+obtain|shall\s+not|cannot|barred)/i.test(text) ||
    /(?:shall\s+not|cannot|barred).{0,50}(?:stay\s+order|injunction)/i.test(text);
  if (lockBreak || stayBan) return true;
  if (noNotice && vagueBreach) return true;
  // "evict without notice" only if NOT clearly about unpaid rent
  if (noNotice && !nonPayment) return true;
  // Old broad "landlord may terminate" alone is NOT enough (normal for rent default)
  return false;
}

export function assessTenancyCompleteness(
  text: string,
  selectedJurisdiction?: string | null,
): { findings: CompletenessFinding[]; scoreAdjustment: number } {
  const findings: CompletenessFinding[] = [];

  if (blankHeavy(text) || !hasFilledPartyNames(text)) {
    findings.push({
      code: "TENANCY_PARTY_IDENTITY_WEAK",
      title: "Landlord / tenant identity not clearly filled",
      message:
        "Party names look blank or generic. Confirm both parties and CNICs before relying on this deed.",
      effect: "DEDUCTION",
      severity: "HIGH",
      scoreImpact: -20,
    });
  }

  if (!hasRentAmount(text)) {
    findings.push({
      code: "TENANCY_RENT_MISSING",
      title: "Monthly rent amount not detected",
      message: "No clear rent figure found in the text extract.",
      effect: "DEDUCTION",
      severity: "HIGH",
      scoreImpact: -15,
    });
  }

  if (!hasTerm(text)) {
    findings.push({
      code: "TENANCY_TERM_MISSING",
      title: "Tenancy term / duration not detected",
      message: "No clear fixed term (months/years) found.",
      effect: "DEDUCTION",
      severity: "MEDIUM",
      scoreImpact: -12,
    });
  }

  if (!hasWitnessBlock(text)) {
    findings.push({
      code: "TENANCY_WITNESS_MISSING",
      title: "Witness block not detected",
      message:
        "Witness details improve enforceability evidence — none clearly found.",
      effect: "DEDUCTION",
      severity: "LOW",
      scoreImpact: -8,
    });
  }

  if (
    !hasGoverningLaw(text) &&
    !/stamp|registered|sub[- ]?registrar|WASIL|STAMP VENDOR/i.test(text) &&
    text.length < 1200
  ) {
    findings.push({
      code: "TENANCY_FORMALITIES_THIN",
      title: "Governing law / formalities thin",
      message:
        "Little signal of governing rent law, stamp, or registration in the extract.",
      effect: "DEDUCTION",
      severity: "LOW",
      scoreImpact: -6,
    });
  }

  const hints = jurisdictionHints(text);
  if (
    hints.length &&
    selectedJurisdiction &&
    selectedJurisdiction !== "UNKNOWN" &&
    selectedJurisdiction !== "PAKISTAN_FEDERAL" &&
    !hints.includes(selectedJurisdiction)
  ) {
    findings.push({
      code: "TENANCY_JURISDICTION_MISMATCH",
      title: "Text suggests a different province than selected",
      message: `Document text hints at ${hints.join(", ")} but analysis jurisdiction is ${selectedJurisdiction}. Re-run with the matching jurisdiction.`,
      effect: "DEDUCTION",
      severity: "MEDIUM",
      scoreImpact: -10,
    });
  }

  if (/executed at lahore/i.test(text) && selectedJurisdiction === "SINDH") {
    if (!findings.some((f) => f.code === "TENANCY_JURISDICTION_MISMATCH")) {
      findings.push({
        code: "TENANCY_JURISDICTION_MISMATCH",
        title: "Executed at Lahore but Sindh jurisdiction selected",
        message: "Re-run under Punjab for a fairer rule set.",
        effect: "DEDUCTION",
        severity: "MEDIUM",
        scoreImpact: -10,
      });
    }
  }

if (!hasSecurityDeposit(text) && text.length > 400) {
    findings.push({
      code: "TENANCY_DEPOSIT_MISSING",
      title: "Security deposit / advance not clearly stated",
      message:
        "No clear security deposit or advance-rent amount found. Confirm deposit amount and return conditions in writing before paying.",
      effect: "DEDUCTION",
      severity: "MEDIUM",
      scoreImpact: -10,
    });
  }
  if (!hasNoticePeriod(text) && text.length > 400) {
    findings.push({
      code: "TENANCY_NOTICE_MISSING",
      title: "Termination notice period not detected",
      message:
        "No clear notice period for termination found. One-sided or silent notice terms are a common tenant risk.",
      effect: "DEDUCTION",
      severity: "MEDIUM",
      scoreImpact: -10,
    });
  }
  if (!hasLandlordCnicCue(text) && text.length > 300) {
    findings.push({
      code: "TENANCY_LANDLORD_CNIC_WEAK",
      title: "Landlord CNIC / ID not clearly linked",
      message:
        "Landlord identity document (CNIC/NICOP) is not clearly present near landlord language. Verify identity against title documents.",
      effect: "DEDUCTION",
      severity: "HIGH",
      scoreImpact: -12,
    });
  }
  if (hasOneSidedEviction(text)) {
    findings.push({
      code: "TENANCY_EVICTION_ONE_SIDED",
      title: "Possible abusive eviction / ejectment language",
      message:
        "Abusive termination language (e.g. eviction without notice for vague breach, lock-breaking, or stay-order bans). Normal non-payment remedies are not flagged. Have this clause reviewed before signing.",
      effect: "DEDUCTION",
      severity: "HIGH",
      scoreImpact: -15,
    });
  }
  const scoreAdjustment = findings.reduce((s, f) => s + f.scoreImpact, 0);
  return { findings, scoreAdjustment };
}

export function applyCompletenessToScore(
  baseScore: number | null | undefined,
  adjustment: number,
): number {
  const start = baseScore == null ? 100 : baseScore;
  return Math.max(0, Math.min(100, start + adjustment));
}

export function decisionFromScore(score: number, blockers: number): string {
  if (blockers > 0) return "DO_NOT_PROCEED";
  if (score < 40) return "DO_NOT_PROCEED";
  if (score < 60) return "LEGAL_REVIEW_REQUIRED";
  if (score < 80) return "PROCEED_WITH_CAUTION";
  return "PROCEED";
}
