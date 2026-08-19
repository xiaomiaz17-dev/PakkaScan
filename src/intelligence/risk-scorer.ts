/**
 * Risk Scorer — Session 4
 *
 * Converts PakkaScore + structured signals into a 1-10 Risk Score
 * with labelled contributing factors a non-lawyer can follow.
 *
 * Design:
 *   riskScore = Math.ceil((100 - pakkaScore) / 10), clamped 1-10
 *   Then explicit deductions from findings/missing/FBR ratio are
 *   recorded as RiskFactor entries (they already moved the pakkaScore,
 *   so factors are EXPLANATORY not additive to the numeric score).
 *
 * The numeric score comes from pakkaScore (deterministic engine).
 * The factor list explains WHY in plain English.
 */

export type RiskFactor = {
  label: string;       // Plain-English one-liner shown to user
  points: number;      // Negative = risk contribution (display only, not re-added)
  category: "financial" | "identity" | "legal" | "document" | "completeness";
};

export type RiskScoreResult = {
  riskScore: number;          // 1 (safe) to 10 (critical)
  riskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskFactors: RiskFactor[];
};

/** Map a 0-100 PakkaScore (high=good) to a 1-10 Risk Score (high=bad). */
function pakkaScoreToRisk(pakkaScore: number): number {
  const raw = Math.ceil((100 - Math.max(0, Math.min(100, pakkaScore))) / 10);
  return Math.max(1, Math.min(10, raw));
}

function riskLabel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score <= 3) return "LOW";
  if (score <= 5) return "MEDIUM";
  if (score <= 7) return "HIGH";
  return "CRITICAL";
}

/**
 * Safely read a nested numeric field from smartFields.financials.
 * Returns null if absent or non-numeric.
 */
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

/**
 * Check FBR/DC valuation ratio.
 * Returns a RiskFactor if under-declaration is detected, else null.
 */
function checkFbrRatio(financials: any): RiskFactor | null {
  const declared = getFinancialAmount(financials, "total_price", "amount");
  const fbr      = getFinancialAmount(financials, "fbr_valuation", "amount");

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
 * Extract risk factors from findings strings.
 * Findings already drove the pakkaScore down — we surface them as explanations.
 */
function factorsFromFindings(findings: string[]): RiskFactor[] {
  const factors: RiskFactor[] = [];
  for (const f of findings) {
    const lower = f.toLowerCase();
    // Stamp duty anomaly
    if (lower.includes("stamp duty") || lower.includes("stamp paper")) {
      factors.push({ label: "Stamp duty anomaly detected", points: -2, category: "financial" });
      continue;
    }
    // Power of attorney risk
    if (lower.includes("power of attorney") || lower.includes("poa")) {
      factors.push({ label: "Power of Attorney used — verify registration and scope", points: -2, category: "legal" });
      continue;
    }
    // CNIC mismatch / missing
    if (lower.includes("cnic") && (lower.includes("missing") || lower.includes("mismatch") || lower.includes("not found"))) {
      factors.push({ label: "CNIC verification issue detected", points: -1, category: "identity" });
      continue;
    }
    // Registration gap
    if (lower.includes("registr") && (lower.includes("not") || lower.includes("missing") || lower.includes("unregistered"))) {
      factors.push({ label: "Document registration gap — verify with Sub-Registrar", points: -2, category: "legal" });
      continue;
    }
    // Encumbrance
    if (lower.includes("encumbrance") || lower.includes("mortgage") || lower.includes("charge") || lower.includes("lien")) {
      factors.push({ label: "Encumbrance or charge on property detected", points: -3, category: "legal" });
      continue;
    }
    // Date anomaly
    if (lower.includes("date") && (lower.includes("future") || lower.includes("anomaly") || lower.includes("invalid") || lower.includes("after"))) {
      factors.push({ label: "Date anomaly in document", points: -1, category: "document" });
      continue;
    }
  }
  return factors;
}

/**
 * Extract risk factors from missing evidence strings.
 */
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

/**
 * Deduplicate factors by label prefix (first 40 chars).
 * Prevents the same signal from appearing twice when both findings
 * and missing evidence surface the same issue.
 */
function dedupe(factors: RiskFactor[]): RiskFactor[] {
  const seen = new Set<string>();
  return factors.filter((f) => {
    const key = f.label.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main entry point.
 *
 * @param pakkaScore   0-100 from phase2.analysis.pakkaScore (high=good). Pass 0 if null.
 * @param findings     Stringified findings from stringifyFindings()
 * @param missing      Stringified missing evidence from stringifyMissing()
 * @param smartFields  First successful doc's smartFields (for FBR ratio check)
 */
export function computeRiskFactors(input: {
  pakkaScore: number;
  findings: string[];
  missing: string[];
  smartFields: any;
}): RiskScoreResult {
  const score = pakkaScoreToRisk(input.pakkaScore);

  const factors: RiskFactor[] = [];

  // 1. FBR ratio (financial, highest priority signal)
  const firstDocFinancials = input.smartFields?.financials ?? null;
  const fbrFactor = checkFbrRatio(firstDocFinancials);
  if (fbrFactor) factors.push(fbrFactor);

  // 2. Findings-derived factors (capped at 6 to keep card readable)
  const findingFactors = factorsFromFindings(input.findings).slice(0, 6);
  factors.push(...findingFactors);

  // 3. Missing evidence factors (capped at 4)
  const missingFactors = factorsFromMissing(input.missing).slice(0, 4);
  factors.push(...missingFactors);

  // 4. Deduplicate
  const deduped = dedupe(factors);

  // 5. Cap total factors at 8 for UI readability
  const capped = deduped.slice(0, 8);

  return {
    riskScore: score,
    riskLabel: riskLabel(score),
    riskFactors: capped,
  };
}