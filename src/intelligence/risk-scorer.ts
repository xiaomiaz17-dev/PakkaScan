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
  if (score <= 3) return "LOW";
  if (score <= 5) return "MEDIUM";
  if (score <= 7) return "HIGH";
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

function factorsFromDateAnomalies(smartFields: any): RiskFactor[] {
  const anomalies = smartFields?.date_anomalies;
  if (!Array.isArray(anomalies) || anomalies.length === 0) return [];
  const factors: RiskFactor[] = [];
  for (const item of anomalies) {
    if (!item || typeof item !== "object") continue;
    const anomaly = typeof item.anomaly === "string" ? item.anomaly.trim() : "";
    const explanation = typeof item.explanation === "string" ? item.explanation.trim() : "";
    if (!anomaly && !explanation) continue;
    const label = explanation ? `Date anomaly: ${explanation}` : `Date anomaly: ${anomaly}`;
    const lower = (anomaly + " " + explanation).toLowerCase();
    let points = -1;
    if (lower.includes("future") || lower.includes("impossible") || lower.includes("after the sale")) points = -2;
    factors.push({ label: label.slice(0, 180), points, category: "document" });
  }
  return factors;
}

function factorsFromPoaRisk(smartFields: any): RiskFactor[] {
  if (!smartFields) return [];
  const clauses = smartFields.clauses ?? {};
  const factors: RiskFactor[] = [];
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
  const factors: RiskFactor[] = [];
  for (const f of findings) {
    const lower = f.toLowerCase();
    if (lower.includes("stamp duty") || lower.includes("stamp paper")) {
      factors.push({ label: "Stamp duty anomaly detected", points: -2, category: "financial" });
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
    if (lower.includes("date") && (lower.includes("future") || lower.includes("anomaly") || lower.includes("invalid") || lower.includes("after"))) {
      factors.push({ label: "Date anomaly in document", points: -1, category: "document" });
      continue;
    }
  }
  return factors;
}

function factorsFromMissing(missing: string[]): RiskFactor[] {
  const factors: RiskFactor[] = [];
  for (const m of missing) {
    const lower = m.toLowerCase();
    if (lower.includes("cnic") || lower.includes("identity")) {
      factors.push({ label: `Missing: ${m}`, points: -1, category: "identity" });
    } else if (lower.includes("witness")) {
      factors.push({ label: `Missing: ${m}`, points: -1, category: "document" });
    } else if (lower.includes("registr") || lower.includes("fard") || lower.includes("mutation") || lower.includes("nec")) {
      factors.push({ label: `Missing key document: ${m}`, points: -2, category: "completeness" });
    } else {
      factors.push({ label: `Missing: ${m}`, points: -1, category: "completeness" });
    }
  }
  return factors;
}

function dedupe(factors: RiskFactor[]): RiskFactor[] {
  const seen = new Set<string>();
  return factors.filter((f) => {
    const key = f.label.slice(0, 40).toLowerCase();
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
}): RiskScoreResult {
  const factors: RiskFactor[] = [];
  const fbrFactor = checkFbrRatio(input.smartFields?.financials ?? null);
  if (fbrFactor) factors.push(fbrFactor);
  const cnicLocationFactor = checkCnicLocationMismatch(input.smartFields);
  if (cnicLocationFactor) factors.push(cnicLocationFactor);
  factors.push(...factorsFromDateAnomalies(input.smartFields));
  factors.push(...factorsFromPoaRisk(input.smartFields));
  factors.push(...factorsFromFindings(input.findings).slice(0, 6));
  factors.push(...factorsFromMissing(input.missing).slice(0, 4));
  const deduped = dedupe(factors).slice(0, 8);
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
