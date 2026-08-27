/**
 * Normalise LLM suspicious / missing clauses into UI rows + risk factors.
 * Missing protections are evidence-gated when OCR text is provided.
 */
function stripEngineFlags(s: string): string {
  return String(s || "")
    .replace(/\[FLAG:\s*[^\]]*\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type FlaggedClause = {
  quote: string;
  concern: string;
  severity: "critical" | "high" | "medium";
  title?: string;
};
export type ClauseConcerns = {
  flagged: FlaggedClause[];
  missing: string[];
};

function severityOf(raw: unknown, concern: string): FlaggedClause["severity"] {
  const s = String(raw || "").toLowerCase();
  if (s.includes("critical") || s.includes("severe")) return "critical";
  if (s.includes("high")) return "high";
  const c = concern.toLowerCase();
  if (/forfeit|unregistered|blank|fraud|irrevocable/.test(c)) return "critical";
  if (/poa|power of attorney|termination|possession|warranty/.test(c)) return "high";
  return "medium";
}

function pointsFor(sev: FlaggedClause["severity"]): number {
  if (sev === "critical") return -2;
  if (sev === "high") return -1.5;
  return -1;
}

/** Human label for snake_case / LLM codes */
export function humanizeMissingProtection(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/[_\s]+/g, "_");
  const map: Record<string, string> = {
    rent_escalation: "rent escalation",
    renewal: "renewal terms",
    renewal_terms: "renewal terms",
    notice_period: "notice period",
    notice_period_days: "notice period",
    termination_penalties: "termination penalties",
    property_inspection_rights: "property inspection rights",
    inspection: "property inspection rights",
    deposit_refund: "security deposit refund terms",
    deposit_refund_terms: "security deposit refund terms",
    security_deposit_refund: "security deposit refund terms",
    dispute_resolution: "dispute resolution",
    lock_in: "lock-in period",
    lock_in_period: "lock-in period",
    "lock-in-period": "lock-in period",
    subletting: "subletting restriction",
    maintenance: "maintenance responsibility",
  };
  if (map[k]) return map[k];
  return raw.replace(/_/g, " ").trim();
}

/**
 * If OCR/extracted text already contains strong keywords for a "missing" item, drop it.
 * Silent when we cannot search (no text) — still allow LLM list but prefer fewer false positives when text exists.
 */
const EVIDENCE_PATTERNS: Array<{ keys: RegExp; patterns: RegExp }> = [
  { keys: /rent.?escalat|rent.?increase|annual.?increase|escalation/i, patterns: /escalat|\d+\s*%|10\s*%|percent|per\s+annum|yearly|increase|افزائش|فیصد|سالانہ|اضافہ/i },
  { keys: /renewal/i, patterns: /renew|extend(ed|able)?\s+(for|by)|further\s+period|mutual\s+agreement/i },
  { keys: /notice.?period/i, patterns: /notice\s+(of\s+)?\d+\s*(days|months)|days['']?\s+notice|one\s+month['']?s?\s+notice|\d+\s*days['']?\s+prior/i },
  { keys: /termination|penalt/i, patterns: /terminat|forfeit|penalty|breach|vacate/i },
  { keys: /inspection/i, patterns: /inspect(ion|ed|ing)?|landlord\s+may\s+enter|visit\s+the\s+(premises|property)/i },
  { keys: /deposit|refund/i, patterns: /security\s+deposit|refundable|deposit\s+shall\s+be\s+(refunded|returned)/i },
  { keys: /dispute|arbitration|mediation/i, patterns: /dispute|arbitr|mediation|stay|court|\u0639\u062F\u0627\u0644\u062A|\u0627\u0633\u0679/i },
  { keys: /lock.?in/i, patterns: /lock[\s-]?in|minimum\s+stay|cannot\s+vacate\s+before/i },
  { keys: /sublet/i, patterns: /sub-?let|sub-?lease|assign(ment)?/i },
  { keys: /maintenance/i, patterns: /maint(enance|ain)|repair|landlord\s+shall\s+be\s+responsible/i },
  { keys: /monthly.?rent|rent.?amount/i, patterns: /monthly\s+rent|rs\.?\s*=?\s*[\d,]+|pkr\s*=?\s*[\d,]+|\u06A9\u0631\u0627\u06CC\u06C1/i },
  { keys: /security.?deposit.?amount|deposit.?amount/i, patterns: /security\s+deposit|rs\.?\s*=?\s*[\d,]+|\u0633\u06CC\u06A9\u06CC\u0648\u0631|\u0627\u0645\u0627\u0646\u062A|\u067E\u06CC\u0634\u06AF\u06CC/i },
  { keys: /utility|utilities|bills/i, patterns: /electric|water|gas|sewer|utility|\u0628\u062C\u0644\u06CC|\u06AF\u06CC\u0633|\u067E\u0627\u0646\u06CC/i },
  { keys: /rent.?payment.?due|due.?date/i, patterns: /1st|first of (each|every) month|\d{1,2}\s+of\s+(each|every)\s+month|\u06C1\u0631 \u0645\u0627\u06C1/i },
];

function filterMissingAgainstSmart(missing: string[], sf: any): string[] {
  if (!missing.length) return [];
  const fin = sf?.financials || {};
  const clauses = sf?.clauses || {};
  const amt = (v: any) => {
    if (v == null) return false;
    if (typeof v === "number") return v > 0;
    if (typeof v === "object") return Number(v.amount || v.value || 0) > 0;
    return /\d{3,}/.test(String(v));
  };
  const hasRent = amt(fin.monthly_rent) || amt(fin.rent);
  const hasDeposit = amt(fin.security_deposit) || amt(fin.deposit) || amt(fin.advance_rent);
  const hasUtil = Boolean(fin.utility_charges || clauses.maintenance_responsibility);
  const hasDue = Boolean(clauses.rent_payment_period);
  const hasSalePrice = amt(fin.total_price) || amt(fin.token_amount) || amt(fin.sale_price) || amt(fin.consideration) || amt(fin.bayana) || amt(fin.token);
  // P1-D: sale financials present → drop "consideration / payment schedule" noise
  return missing.filter((label) => {
    const k = label.toLowerCase();
    if (hasRent && /monthly.?rent|rent amount/.test(k)) return false;
    if (hasDeposit && /deposit amount|security deposit amount/.test(k)) return false;
    if (hasUtil && /utility/.test(k)) return false;
    if (hasDue && /due date|payment due/.test(k)) return false;
    if (hasSalePrice && /consideration|payment schedule|total price|token|bayana|sale price/.test(k)) return false;
      return false;
    return true;
  });
}
export function filterMissingAgainstText(missing: string[], ocrText?: string | null): string[] {
  if (!missing.length) return [];
  const text = (ocrText || "").toString();
  if (text.replace(/\s/g, "").length < 40) {
    // Too little text to falsify — keep list but humanize only
    return missing.map(humanizeMissingProtection);
  }
  const lower = text.toLowerCase();
  const kept: string[] = [];
  for (const raw of missing) {
    const label = humanizeMissingProtection(raw);
    const keyHay = `${raw} ${label}`.toLowerCase();
    let evidenced = false;
    for (const row of EVIDENCE_PATTERNS) {
      if (!row.keys.test(keyHay)) continue;
      if (row.patterns.test(lower)) {
        evidenced = true;
        break;
      }
    }
    if (!evidenced) kept.push(label);
  }
  return kept;
}

export function extractClauseConcerns(
  smartFields: any,
  ocrText?: string | null
): ClauseConcerns {
  if (!smartFields || typeof smartFields !== "object") {
    return { flagged: [], missing: [] };
  }
  const rawList =
    smartFields.suspicious_clauses ??
    smartFields.clauses?.suspicious_clauses ??
    smartFields.legal?.suspicious_clauses ??
    [];
  const flagged: FlaggedClause[] = [];
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (item == null) continue;
      if (typeof item === "string" && item.trim()) {
        flagged.push({
          quote: stripEngineFlags(item.trim()).slice(0, 280),
          concern: "This wording may put you at a disadvantage. Have a lawyer review before paying.",
          severity: severityOf(null, item),
        });
        continue;
      }
      if (typeof item === "object") {
        const quote = String(
          item.quote ?? item.text ?? item.clause ?? item.original ?? item.excerpt ?? ""
        ).trim();
        const concern = String(
          item.concern ?? item.reason ?? item.why ?? item.explanation ?? item.risk ?? ""
        ).trim();
        if (!quote && !concern) continue;
        flagged.push({
          quote: stripEngineFlags(quote || concern).slice(0, 280),
          concern:
            concern ||
            "This clause may reduce your protection. Confirm with a property lawyer before proceeding.",
          severity: severityOf(item.severity ?? item.level, concern || quote),
          title: item.title ? String(item.title).slice(0, 80) : undefined,
        });
      }
    }
  }
  const missingRaw =
    smartFields.clauses?.missing_standard_clauses ??
    smartFields.missing_standard_clauses ??
    smartFields.legal?.missing_standard_clauses ??
    [];
  const missing: string[] = [];
  if (Array.isArray(missingRaw)) {
    for (const m of missingRaw) {
      if (typeof m === "string" && m.trim()) missing.push(m.trim().slice(0, 200));
      else if (m && typeof m === "object" && (m.name || m.clause || m.label)) {
        missing.push(String(m.name || m.clause || m.label).trim().slice(0, 200));
      }
    }
  }
  const seen = new Set<string>();
  const uniqueFlagged = flagged.filter((f) => {
    const k = f.quote.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    flagged: uniqueFlagged,
    missing: filterMissingAgainstSmart(
      filterMissingAgainstText(missing, ocrText),
      smartFields
    ),
  };
}

export function harvestTenancyClauseFlags(blob: string): FlaggedClause[] {
  const t = String(blob || "");
  if (t.replace(/\s/g, "").length < 20) return [];
  const out: FlaggedClause[] = [];
  const urduLine = (re: RegExp) => {
    const line = t.split(/[\n\u06D4.]+/).map((l) => l.trim()).find((l) => {
      const ar = (l.match(/[\u0600-\u06FF]/g) || []).length;
      return ar >= 12 && re.test(l);
    });
    return line ? line.slice(0, 240) : "";
  };
  if (/one month|ایک ماہ قبل|تحریری نوٹس|notice/i.test(t) && /خالی|vacat|terminat/i.test(t)) {
    out.push({
      title: "Termination / notice terms",
      quote: urduLine(/ایک ماہ قبل|تحریری نوٹس|خالی کروانا/i) || "One-month written notice clause",
      concern: "Standard notice to vacate. Confirm both parties must give the same one-month written notice.",
      severity: "medium",
    });
  }
  if (/self-?help|break(?:ing)?\s+(?:the\s+)?lock|lock-?break|repossess|\u0642\u0641\u0644|\u062A\u0627\u0644\u0627|\u0642\u0641\u0644 \u0634\u06A9\u0646/i.test(t)) {
    out.push({
      title: "Self-help eviction / lock-break",
      quote: urduLine(/\u0642\u0641\u0644|\u062A\u0627\u0644\u0627|\u0642\u0641\u0644 \u0634\u06A9\u0646|lock-?break/i) || "Printed lock-break / belongings clause on the tenancy form",
      concern:
        "Allows the landlord to evict or seize belongings without a court process. Common on Pakistani printed forms but one-sided — strike or accept in writing before relying on this paper.",
      severity: "high",
    });
  }
  if (/court-?waiver|stay\s*order|barred from (?:the\s+)?court|cannot\s+approach\s+(?:the\s+)?court|stay clause/i.test(t)) {
    out.push({
      title: "Court-waiver / stay-order ban",
      quote: urduLine(/\u0627\u0633\u0679\u06D2|\u0639\u062F\u0627\u0644\u062A|stay[\s-]*order/i) || "Printed stay-order / court-waiver clause on the tenancy form",
      concern:
        "Restricts the tenant from seeking a stay order or court protection. Heavily one-sided. Get written confirmation you accept this, or strike it.",
      severity: "high",
    });
  }
  return out;
}

export function clauseConcernsToRiskFactors(
  concerns: ClauseConcerns
): Array<{ label: string; points: number; category: "legal" }> {
  concerns = { ...concerns, flagged: dedupeFlaggedConcerns(concerns.flagged || []) };
  if (!concerns.flagged.length && !concerns.missing.length) return [];
  const factors: Array<{ label: string; points: number; category: "legal" }> = [];
  let budget = 3.0;
  for (const f of concerns.flagged) {
    if (budget <= 0) break;
    let pts = Math.abs(pointsFor(f.severity));
    pts = Math.min(pts, budget);
    budget -= pts;
    const label = f.title
      ? `Suspicious clause — ${f.title}: ${f.concern}`
      : `Suspicious clause: ${f.concern}`;
    factors.push({
      label: label.slice(0, 200),
      points: -pts,
      category: "legal",
    });
  }
  if (concerns.missing.length > 0 && budget > 0) {
    const pts = Math.min(1.0, budget);
    factors.push({
      label: `Common safeguards not clearly found in the extract: ${concerns.missing.slice(0, 3).join("; ")} — confirm on the paper${
        concerns.missing.length > 3 ? "…" : ""
      }`,
      points: -pts,
      category: "legal",
    });
  }
  return factors;
}

export function formatClauseWhatsAppText(clause: FlaggedClause, referenceCode?: string): string {
  const title = clause.title || "Flagged clause";
  const lines = [
    "PAKKASCAN LEGAL RISK ALERT",
    referenceCode ? `Ref: ${referenceCode}` : null,
    "",
    `Issue: ${title}`,
    clause.quote ? `Quote: "${clause.quote}"` : null,
    `Risk: ${clause.concern}`,
    "",
    "AI assistive flag only — confirm with a property lawyer before paying or signing.",
    "Verified via pakkascan.com",
  ];
  return lines.filter((l) => l != null && String(l).length > 0).join("\n");
}


function dedupeFlaggedConcerns(flagged: FlaggedClause[]): FlaggedClause[] {
  if (!flagged?.length) return flagged || [];
  const seen = new Set<string>();
  return flagged.filter((f) => {
    const key = `${String(f.title || "").toLowerCase().slice(0, 40)}|${String(f.concern || "").toLowerCase().slice(0, 60)}`
      .replace(/\s+/g, " ");
    // Collapse general PoA / unlimited attorney duplicates
    const poaKey = /power of attorney|lawful attorney|general\s*\/?\s*unlimited|poa\b/i.test(key) ? "poa_cluster" : key;
    if (seen.has(poaKey)) return false;
    seen.add(poaKey);
    return true;
  });
}