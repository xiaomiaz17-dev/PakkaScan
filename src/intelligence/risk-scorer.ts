/**
 * Risk Scorer — Session 4 + Session 5 (weighted)
 *
 * Converts structured risk signals into a 1-10 Risk Score
 * with labelled contributing factors a non-lawyer can follow.
 *
 * WEIGHTED FORMULA (Session 5):
 *   riskScore = min(10, 1 + sum(|points| of all factors))
 *   Base 1 = "no issues found".
 *   Each factor's absolute points are added.
 *   Cap at 10.
 *
 * Factors remain explanatory AND now drive the numeric score.
 */

import { getCnicDistrict } from "./cnic-districts";
import { assessTenancyCompleteness } from "./tenancy-completeness";

export type RiskFactor = {
  label: string;
  points: number;
  category: "financial" | "identity" | "legal" | "document" | "completeness";
};

export type RiskScoreResult = {
  riskScore: number;
  riskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskFactors: RiskFactor[];
  scoreBreakdown: string;
};

function riskLabel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  // Bands aligned to product copy: 0–3.9 Low, 4–6.9 Medium, 7–8.9 High, 9–10 Critical
  if (score < 4) return "LOW";
  if (score < 7) return "MEDIUM";
  if (score < 9) return "HIGH";
  return "CRITICAL";
}

function getFinancialAmount(financials: any, ...keys: string[]): number | null {
  if (!financials) return null;
  let cur: any = financials;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return null;
    cur = cur[k];
  }
  if (typeof cur === "number" && isFinite(cur) && cur > 0) return cur;
  return null;
}

function checkFbrRatio(financials: any): RiskFactor | null {
  const declared = getFinancialAmount(financials, "total_price", "amount");
  const fbr = getFinancialAmount(financials, "fbr_valuation", "amount");
  if (!declared || !fbr) return null;
  const ratio = declared / fbr;
  if (ratio < 0.3) {
    return {
      label: `Declared price is ${Math.round((1 - ratio) * 100)}% below FBR valuation — severe under-declaration risk (Section 111 exposure)`,
      points: -3,
      category: "financial",
    };
  }
  if (ratio < 0.5) {
    return {
      label: `Declared price is ${Math.round((1 - ratio) * 100)}% below FBR valuation — potential under-declaration risk (Section 111 exposure)`,
      points: -2,
      category: "financial",
    };
  }
  if (ratio < 0.8) {
    return {
      label: `Declared price is ${Math.round((1 - ratio) * 100)}% below FBR valuation — mild under-declaration, verify with revenue authority`,
      points: -1,
      category: "financial",
    };
  }
  return null;
}

/**
 * Session 7: compare declared sale price to DC-rate benchmark from lookup engine.
 * Spec: ratio < 0.5 → -3.0; ratio < 0.8 → -1.5
 */
export function checkDeclaredVsBenchmark(
  declaredPrice: number | null | undefined,
  officialValuePkr: number | null | undefined
): RiskFactor | null {
  if (!declaredPrice || !officialValuePkr || declaredPrice <= 0 || officialValuePkr <= 0) {
    return null;
  }
  const ratio = declaredPrice / officialValuePkr;
  if (ratio < 0.5) {
    return {
      label: `Declared price (PKR ${Math.round(declaredPrice).toLocaleString("en-PK")}) is ${Math.round((1 - ratio) * 100)}% below official DC/FBR benchmark (PKR ${Math.round(officialValuePkr).toLocaleString("en-PK")}) — severe Section 111 tax exposure`,
      points: -3,
      category: "financial",
    };
  }
  if (ratio < 0.8) {
    return {
      label: `Declared price (PKR ${Math.round(declaredPrice).toLocaleString("en-PK")}) is ${Math.round((1 - ratio) * 100)}% below official DC/FBR benchmark (PKR ${Math.round(officialValuePkr).toLocaleString("en-PK")}) — mild under-declaration`,
      points: -1.5,
      category: "financial",
    };
  }
  return null;
}

function inferProvinceFromText(...texts: Array<string | null | undefined>): string | null {
  const combined = texts
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .join(" ")
    .toLowerCase();
  if (!combined) return null;
  if (/\b(karachi|sindh|hyderabad|sukkur|larkana|mirpurkhas|thatta|badin|jamshoro)\b/.test(combined)) return "Sindh";
  if (/\b(lahore|faisalabad|rawalpindi|multan|gujranwala|sialkot|bahawalpur|sargodha|sheikhupura|punjab)\b/.test(combined)) return "Punjab";
  if (/\b(peshawar|mardan|abbottabad|swat|nowshera|charsadda|kohat|khyber|pakhtunkhwa|kpk|nwfp)\b/.test(combined)) return "Khyber Pakhtunkhwa";
  if (/\b(islamabad|ict|capital territory|cda)\b/.test(combined)) return "Islamabad";
  return null;
}

function extractPrimaryPartyCnic(smartFields: any): string | null {
  if (!smartFields?.parties) return null;
  const parties = smartFields.parties;
  const candidates = [
    parties.seller?.cnic,
    parties.landlord?.cnic,
    parties.owner?.cnic,
    parties.principal?.cnic,
    parties.holder?.cnic,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.replace(/[^0-9]/g, "").length >= 13) return c;
  }
  return null;
}

function checkCnicLocationMismatch(smartFields: any): RiskFactor | null {
  if (!smartFields) return null;
  const cnic = extractPrimaryPartyCnic(smartFields);
  if (!cnic) return null;
  const district = getCnicDistrict(cnic);
  if (!district) return null;
  const property = smartFields.property ?? {};
  const legal = smartFields.legal ?? {};
  const propertyProvince = inferProvinceFromText(
    property.address,
    property.mauza_village,
    legal.jurisdiction_district,
    legal.jurisdiction_city,
    legal.sub_registrar_office
  );
  if (!propertyProvince) return null;
  if (district.province === propertyProvince) return null;
  return {
    label: `Seller/landlord CNIC issued in ${district.district}, ${district.province} but property appears to be in ${propertyProvince} — verify identity and ownership carefully`,
    points: -2,
    category: "identity",
  };
}

/** Today's calendar date in Pakistan (Asia/Karachi). Same-day is never "future". */
function pakistanTodayIso(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()); // en-CA => YYYY-MM-DD
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function extractIsoDates(text: string): string[] {
  const out: string[] = [];
  const re = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out;
}

function partyHasIdentity(p: any): boolean {
  if (!p || typeof p !== "object") return false;
  const name = String(p.name || p.full_name || p.fullName || "").trim();
  const cnic = String(p.cnic || p.cnic_number || p.nic || "").replace(/[^0-9]/g, "");
  return name.length >= 3 || cnic.length >= 13;
}
function smartFieldsHasTerm(sf: any): boolean {
  if (!sf) return false;
  const d = sf.dates || {};
  if (d.start_date || d.end_date || d.execution_date) return true;
  if (d.duration_months && Number(d.duration_months) > 0) return true;
  if (sf.financials?.term_months) return true;
  return false;
}
function smartFieldsHasDeposit(sf: any): boolean {
  const f = sf?.financials || {};
  const keys = ["security_deposit", "deposit", "advance_rent", "advance"];
  for (const k of keys) {
    const v = f[k];
    if (v == null) continue;
    if (typeof v === "object" && (v.amount || v.value)) return true;
    if (typeof v === "number" && v > 0) return true;
    if (typeof v === "string" && /\d/.test(v)) return true;
  }
  return false;
}
function smartFieldsHasRent(sf: any): boolean {
  const v = sf?.financials?.monthly_rent ?? sf?.financials?.rent;
  if (v == null) return false;
  if (typeof v === "object" && (v.amount || v.value)) return true;
  if (typeof v === "number" && v > 0) return true;
  if (typeof v === "string" && /\d/.test(v)) return true;
  return false;
}

/** Prefer structured extract over OCR-regex false blanks (Urdu deeds). */
function factorsFromTenancyText(
  text: string | null | undefined,
  docType?: string | null,
  smartFields?: any
): RiskFactor[] {
  if (!text || text.length < 80) return [];
  const dt = (docType || "").toUpperCase();
  const looksTenancy =
    dt.includes("TENANCY") ||
    dt.includes("RENTAL") ||
    /tenancy|landlord|tenant|monthly\s+rent|lessor|lessee|کرایہ|مستاجر|مالک/i.test(
      text.slice(0, 2500)
    );
  if (!looksTenancy && !dt.includes("TENANCY")) return [];

  const { findings } = assessTenancyCompleteness(text, null, smartFields);
  const sf = smartFields || {};
  const parties = sf.parties || {};
  const hasLandlord = partyHasIdentity(parties.landlord || parties.lessor || parties.owner);
  const hasTenant = partyHasIdentity(parties.tenant || parties.lessee);
  const hasAnyCnic =
    partyHasIdentity(parties.landlord) ||
    partyHasIdentity(parties.tenant) ||
    /\d{5}-?\d{7}-?\d/.test(
      String(parties.landlord?.cnic || "") + String(parties.tenant?.cnic || "")
    );

  let filtered = findings.filter((f) => {
    if (f.code === "TENANCY_PARTY_IDENTITY_WEAK" && (hasLandlord || hasTenant)) return false;
    if (f.code === "TENANCY_LANDLORD_CNIC_WEAK" && hasLandlord) return false;
    if (f.code === "TENANCY_RENT_MISSING" && smartFieldsHasRent(sf)) return false;
    if (f.code === "TENANCY_TERM_MISSING" && smartFieldsHasTerm(sf)) return false;
    if (f.code === "TENANCY_DEPOSIT_MISSING" && smartFieldsHasDeposit(sf)) return false;
    if (f.code === "TENANCY_FORMALITIES_THIN" && /stamp|attested|oath|commissioner|hundred\s+rupees|wasil|rs\.?\s*100|100\s*rupees/i.test(text || "")) return false;
    return true;
  });

  // Drop generic "missing CNIC" noise when extract already has them
  const cnicInExtract = (() => {
    try {
      const blob = JSON.stringify(sf || {});
      return /\b\d{5}-\d{7}-\d\b/.test(blob);
    } catch { return false; }
  })();
  if (cnicInExtract) {
    filtered = filtered.filter((f: any) => !/cnic|nicop|IDENTITY_DOCUMENT|identity document/i.test(String(f?.code || "") + " " + String(f?.title || "") + " " + String(f?.message || "") + " " + String(f?.label || "")));
  }

  const sevPoints: Record<string, number> = {
    CRITICAL: -3,
    HIGH: -2,
    MEDIUM: -2,
    LOW: -1,
  };
  return filtered.slice(0, 6).map((f) => ({
    label: `${f.title}: ${f.message}`.slice(0, 180),
    points: sevPoints[f.severity] ?? -1,
    category: "completeness" as const,
  }));
}

function factorsFromDateAnomalies(smartFields: any): RiskFactor[] {
  const anomalies = smartFields?.date_anomalies;
  if (!Array.isArray(anomalies) || anomalies.length === 0) return [];
  let factors: RiskFactor[] = [];
  const todayPk = pakistanTodayIso();
  for (const item of anomalies) {
    if (!item || typeof item !== "object") continue;
    const anomaly = typeof item.anomaly === "string" ? item.anomaly.trim() : "";
    const explanation = typeof item.explanation === "string" ? item.explanation.trim() : "";
    if (!anomaly && !explanation) continue;
    const combined = anomaly + " " + explanation;
    const lower = combined.toLowerCase();
    // F7: same-calendar-day (Pakistan) is not a future-date anomaly
    if (lower.includes("future")) {
      const dates = extractIsoDates(combined);
      const onlyTodayOrPast = dates.length > 0 && dates.every((d) => d <= todayPk);
      if (onlyTodayOrPast) continue;
      const fieldDates = extractIsoDates(JSON.stringify(smartFields?.dates || {}));
      if (fieldDates.length > 0 && fieldDates.every((d) => d <= todayPk)) continue;
      // LLM sometimes flags 2026 as "future" when model training cutoff is older — trust calendar
      if (dates.length === 0 && fieldDates.length === 0) {
        // no concrete future date -> ignore vague "future" noise
        continue;
      }
      const exec = smartFields?.dates?.execution_date;
      if (typeof exec === "string" && exec.slice(0, 10) <= todayPk) continue;
      const issue = smartFields?.dates?.issue_date || smartFields?.dates?.issued_date;
      if (typeof issue === "string" && issue.slice(0, 10) <= todayPk) continue;
    }
    const label = explanation ? `Date anomaly: ${explanation}` : `Date anomaly: ${anomaly}`;
    let points = -1;
    // Follow-up: chronological impossibilities (stamp after execution / backdating) are severe in PK practice
    if (
      /stamp/.test(lower) && /after/.test(lower) ||
      /purchase/.test(lower) && /after/.test(lower) && /execut/.test(lower) ||
      /chronolog/.test(lower) ||
      /backdat/.test(lower) ||
      /impossible/.test(lower)
    ) {
      points = -3;
    } else if (lower.includes("future") || lower.includes("after the sale")) {
      points = -2;
    }
    factors.push({ label: label.slice(0, 180), points, category: "document" });
  }
  return factors;
}

function factorsFromPoaRisk(smartFields: any): RiskFactor[] {
  if (!smartFields) return [];
  const clauses = smartFields.clauses ?? {};
  let factors: RiskFactor[] = [];
  const flags = clauses.poa_risk_flags;
  if (Array.isArray(flags)) {
    for (const flag of flags) {
      if (typeof flag !== "string" || !flag.trim()) continue;
      const lower = flag.toLowerCase();
      let points = -2;
      if (lower.includes("sell") && lower.includes("receive")) points = -3;
      if (lower.includes("overseas") || lower.includes("no expiry") || lower.includes("indefinitely")) points = -2;
      if (lower.includes("not attested") || lower.includes("notary only")) points = -2;
      factors.push({
        label: `Power of Attorney risk: ${flag.trim().slice(0, 140)}`,
        points,
        category: "legal",
      });
    }
  }
  const scope = typeof clauses.scope === "string" ? clauses.scope.toUpperCase() : "";
  const dates = smartFields.dates ?? {};
  const hasExpiry = typeof dates.expiry_date === "string" && dates.expiry_date.length >= 8;
  const attestation = typeof clauses.attestation === "string" ? clauses.attestation.toLowerCase() : "";
  if (scope === "GENERAL" || scope === "GENERAL / UNLIMITED") {
    if (!factors.some((f) => f.label.toLowerCase().includes("general"))) {
      factors.push({
        label: "Power of Attorney is GENERAL (not limited to a specific property) — high misuse risk",
        points: -2,
        category: "legal",
      });
    }
  }
  if (scope && !hasExpiry) {
    if (!factors.some((f) => f.label.toLowerCase().includes("expir"))) {
      factors.push({
        label: "Power of Attorney has no expiry date — can be used indefinitely",
        points: -2,
        category: "legal",
      });
    }
  }
  if (attestation && attestation.includes("notary") && !attestation.includes("sub-registrar") && !attestation.includes("registrar")) {
    if (!factors.some((f) => f.label.toLowerCase().includes("attest") || f.label.toLowerCase().includes("notary"))) {
      factors.push({
        label: "Power of Attorney appears notarised only (not Sub-Registrar) — may not be enforceable for property transfer",
        points: -2,
        category: "legal",
      });
    }
  }
  return factors;
}

function factorsFromFindings(findings: string[]): RiskFactor[] {
  let factors: RiskFactor[] = [];
  for (const f of findings) {
    const lower = f.toLowerCase();
    if (lower.includes("stamp duty") || lower.includes("stamp paper")) {
      const stampPts = (/after/.test(lower) || /chronolog/.test(lower) || /impossible/.test(lower)) ? -3 : -2;
      factors.push({ label: "Stamp duty anomaly detected", points: stampPts, category: "financial" });
      continue;
    }
    if (lower.includes("power of attorney") || lower.includes("poa")) {
      factors.push({ label: "Power of Attorney used — verify registration and scope", points: -2, category: "legal" });
      continue;
    }
    if (lower.includes("cnic") && (lower.includes("missing") || lower.includes("mismatch") || lower.includes("not found"))) {
      factors.push({ label: "CNIC verification issue detected", points: -1, category: "identity" });
      continue;
    }
    if (lower.includes("registr") && (lower.includes("not") || lower.includes("missing") || lower.includes("unregistered"))) {
      factors.push({ label: "Document registration gap — verify with Sub-Registrar", points: -2, category: "legal" });
      continue;
    }
    if (lower.includes("encumbrance") || lower.includes("mortgage") || lower.includes("charge") || lower.includes("lien")) {
      factors.push({ label: "Encumbrance or charge on property detected", points: -3, category: "legal" });
      continue;
    }
    if (lower.includes("date") && (lower.includes("future") || lower.includes("anomaly") || lower.includes("invalid") || lower.includes("after") || lower.includes("chronolog"))) {
      const datePts = (/chronolog/.test(lower) || /impossible/.test(lower) || (/stamp/.test(lower) && /after/.test(lower))) ? -3 : -2;
      factors.push({ label: "Date anomaly in document", points: datePts, category: "document" });
      continue;
    }
  }
  return factors;
}

function factorsFromMissing(missing: string[], smartFields?: any): RiskFactor[] {
  const parties = smartFields?.parties || {};
  const hasCnic = (() => {
    const fromParties = [
      parties.landlord?.cnic, parties.tenant?.cnic,
      parties.seller?.cnic, parties.buyer?.cnic,
      parties.principal?.cnic, parties.attorney?.cnic,
      parties.owner?.cnic,
    ].map((x) => String(x || "").replace(/[^0-9]/g, "")).some((d) => d.length >= 13);
    if (fromParties) return true;
    try {
      return /\b\d{5}-\d{7}-\d\b/.test(JSON.stringify(smartFields || {}));
    } catch { return false; }
  })();
  const hasNames = !!(parties.landlord?.name || parties.tenant?.name);
  const hasTerm = !!(
    smartFields?.dates?.start_date ||
    smartFields?.dates?.end_date ||
    smartFields?.dates?.duration_months
  );
  let factors: RiskFactor[] = [];
  const _dtM = String(smartFields?.document_type || smartFields?.docType || "").toUpperCase();
  const _tenancyM =
    _dtM.includes("TENANCY") || _dtM.includes("RENTAL") || _dtM.includes("LEASE");
  for (const m of missing) {
    const lower0 = (m || "").toLowerCase();
    if (hasCnic && lower0.includes("cnic")) continue;
    if (hasNames && (lower0.includes("identity") || lower0.includes("party"))) continue;
    if (hasTerm && (lower0.includes("term") || lower0.includes("duration"))) continue;
    const lower = m.toLowerCase();
    if (lower.includes("cnic") || lower.includes("identity")) {
      factors.push({ label: `Missing: ${m}`, points: -1, category: "identity" });
    } else if (lower.includes("witness")) {
      factors.push({ label: `Missing: ${m}`, points: -1, category: "document" });
    } else if (lower.includes("registr") || lower.includes("fard") || lower.includes("mutation") || lower.includes("nec")) {
      if (
        _tenancyM ||
        String(smartFields?.document_type || "").toUpperCase().includes("TENANCY")
      ) {
        continue; // P0: no Fard/ownership penalty on tenancy
      }
      factors.push({ label: `Missing key document: ${m}`, points: -2, category: "completeness" });
    } else {
      factors.push({ label: `Missing: ${m}`, points: -1, category: "completeness" });
    }
  }
  return factors;
}

function dedupeKey(label: string): string {
  const s = label.toLowerCase();
  if (/power of attorney|poa\b|mofa|attorney/.test(s)) return "poa_cluster";
  if (/missing.*cnic|cnic.*seller|nicop/.test(s)) return "missing_cnic";
  if (/stamp\s*\/\s*registration|formalities\s*unclear/.test(s)) return "stamp_formalities";
  return s.slice(0, 48);
}
function dedupe(factors: RiskFactor[]): RiskFactor[] {
  const seen = new Set<string>();
  return factors.filter((f) => {
    const key = dedupeKey(f.label || "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeWeightedScore(factors: RiskFactor[]): { score: number; breakdown: string } {
  if (factors.length === 0) {
    return { score: 1, breakdown: "Base 1 (no risk factors detected) = 1/10" };
  }
  let total = 0;
  const parts: string[] = ["Base 1"];
  for (const f of factors) {
    const abs = Math.abs(f.points);
    total += abs;
    parts.push(`${abs} (${f.category})`);
  }
  const score = Math.min(10, 1 + total);
  const breakdown = `${parts.join(" + ")} = ${1 + total}${1 + total > 10 ? " → capped at 10" : ""}/10`;
  return { score, breakdown };
}

export function computeRiskFactors(input: {
  pakkaScore: number;
  findings: string[];
  missing: string[];
  smartFields: any;
  /** OCR / full extract text for tenancy rule pack */
  rawText?: string | null;
  /** Session 7: official DC/FBR benchmark PKR from dc-rate-lookup (optional) */
  officialValuationPkr?: number | null;
  declaredPricePkr?: number | null;
}): RiskScoreResult {
  let factors: RiskFactor[] = [];
  const fbrFactor = checkFbrRatio(input.smartFields?.financials ?? null);
  if (fbrFactor) factors.push(fbrFactor);

  // Session 7: DC rate table benchmark (preferred when available)
  const dcFactor = checkDeclaredVsBenchmark(
    input.declaredPricePkr ?? null,
    input.officialValuationPkr ?? null
  );
  if (dcFactor) factors.push(dcFactor);
  const cnicLocationFactor = checkCnicLocationMismatch(input.smartFields);
  if (cnicLocationFactor) factors.push(cnicLocationFactor);
  factors.push(...factorsFromDateAnomalies(input.smartFields));
  const tenancyText =
    (typeof (input as any).rawText === "string" && (input as any).rawText) ||
    (typeof input.smartFields?.raw_text === "string" && input.smartFields.raw_text) ||
    (typeof input.smartFields?.ocr_text === "string" && input.smartFields.ocr_text) ||
    [input.smartFields?.summary, Array.isArray(input.findings) ? input.findings.join(" ") : ""]
      .filter(Boolean)
      .join("\n") ||
    "";
  factors.push(
    ...factorsFromTenancyText(
      tenancyText,
      input.smartFields?.document_type || input.smartFields?.docType || (input as any).documentType,
      input.smartFields
    )
  );
  factors.push(...factorsFromPoaRisk(input.smartFields));
  factors.push(...factorsFromFindings(input.findings).slice(0, 6));
  factors.push(...factorsFromMissing(input.missing, input.smartFields).slice(0, 4));
  const _dt = String(
    input.smartFields?.document_type ||
      input.smartFields?.docType ||
      (input as any).documentType ||
      ""
  ).toUpperCase();
  const _textHint = (tenancyText || "").toLowerCase();
  const _isTenancy =
    _dt.includes("TENANCY") ||
    _dt.includes("RENTAL") ||
    _dt.includes("LEASE") ||
    (input as any).tier === "rental" ||
    /\b(tenancy|landlord|tenant|monthly\s+rent|kiraaya|kiraya)\b/i.test(_textHint);
  // Hard gate: never score land-title / Fard / mutation gaps on tenancy-like packs
  let factorsForScore = factors;
  if (_isTenancy) {
    factorsForScore = factors.filter((f) => {
      const L = (f.label || "").toLowerCase();
      if (/\b(fard|mutation|inteqal|intiqal|registry search|non-encumbrance|\bnec\b|ownership record|chain of title|sale deed present but no mutation)\b/i.test(L))
        return false;
      if (L.includes("missing key document") && /fard|mutation|ownership|registry|encumbrance/i.test(L))
        return false;
      if (L.includes("section 111") || L.includes("dc/fbr") || L.includes("under-declaration"))
        return false; // valuation pack is for purchases, not rent
      return true;
    });
  }
  const _txt = String(input.rawText || "") + (input.smartFields?._stampEvidence ? " attested" : "");
  if (/attested|oath\s*commissioner|hundred\s+rupees/i.test(_txt)) {
    factorsForScore = factorsForScore.filter((x) => !/stamp \/ registration|formalities unclear/i.test(x.label || ""));
  }
  const deduped = dedupe(factorsForScore).slice(0, 8);
  const { score, breakdown } = computeWeightedScore(deduped);
  return {
    riskScore: score,
    riskLabel: riskLabel(score),
    riskFactors: deduped,
    scoreBreakdown: breakdown,
  };
}


/**
 * Merge additional factors (e.g. chain-of-title / temporal) into a RiskScoreResult
 * and recompute the weighted score.
 */
export function mergeRiskFactors(
  base: RiskScoreResult,
  extra: RiskFactor[]
): RiskScoreResult {
  if (!extra || extra.length === 0) return base;
  const combined = dedupe([...base.riskFactors, ...extra]).slice(0, 10);
  const { score, breakdown } = computeWeightedScore(combined);
  return {
    riskScore: score,
    riskLabel: riskLabel(score),
    riskFactors: combined,
    scoreBreakdown: breakdown,
  };
}
