/**
 * DC Rate / FBR Valuation Lookup Engine — Session 7
 *
 * Matches property location + size against official dc_rates benchmarks.
 * Silent fallback (null) when no confident match — never invents a rate.
 */

export type RateUnit =
  | "PKR_PER_MARLA" | "PKR_PER_SQYD" | "PKR_PER_KANAL" | "PKR_PER_SQFT"
  | "per_marla" | "per_sq_yd" | "per_sq_ft" | "per_kanal";

/** Canonical unit constants — 1 marla (urban standard used by FBR/DC tables) */
export const MARLA_TO_SQFT = 272.25;
export const MARLA_TO_SQYD = 30.25;
export const KANAL_TO_MARLA = 20;
export const SQYD_TO_SQFT = 9;

export function normalizeRateUnit(unit: string): RateUnit | null {
  const u = (unit || "").trim().toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, RateUnit> = {
    pkr_per_marla: "per_marla",
    per_marla: "per_marla",
    marla: "per_marla",
    pkr_per_sqyd: "per_sq_yd",
    per_sq_yd: "per_sq_yd",
    per_sqyd: "per_sq_yd",
    sq_yd: "per_sq_yd",
    sqyd: "per_sq_yd",
    pkr_per_sqft: "per_sq_ft",
    per_sq_ft: "per_sq_ft",
    per_sqft: "per_sq_ft",
    sq_ft: "per_sq_ft",
    sqft: "per_sq_ft",
    pkr_per_kanal: "per_kanal",
    per_kanal: "per_kanal",
    kanal: "per_kanal",
  };
  return map[u] ?? null;
}


export type ParsedArea = {
  value: number;
  unit: "marla" | "kanal" | "sqyd" | "sqft";
};

export type DcRateRow = {
  id: number;
  province: string;
  city: string;
  area: string;
  phase_or_block: string | null;
  sub_block: string | null;
  category: string;
  plot_type: string | null;
  rate_pkr: number;
  rate_unit: RateUnit;
  source_type: string;
  effective_date: string | null;
};

export type OfficialValuationResult = {
  matched: true;
  officialValuePkr: number;
  ratePkr: number;
  rateUnit: RateUnit;
  areaUsed: ParsedArea;
  areaInRateUnit: number;
  match: {
    city: string;
    area: string;
    phase_or_block: string | null;
    category: string;
    source_type: string;
    effective_date: string | null;
  };
  confidence: "high" | "medium";
  matchReason: string;
} | {
  matched: false;
  reason: string;
};

export function parseAreaString(raw: string | null | undefined): ParsedArea | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.toLowerCase().replace(/,/g, "").trim();
  // e.g. "10 marla", "1.5 kanal", "240 sq yd", "240 sq.yd", "1200 sq ft"
  let m = s.match(/([\d.]+)\s*(kanal|kanals)\b/);
  if (m) return { value: Number(m[1]), unit: "kanal" };
  m = s.match(/([\d.]+)\s*(marla|marlas)\b/);
  if (m) return { value: Number(m[1]), unit: "marla" };
  m = s.match(/([\d.]+)\s*(sq\.?\s*yds?|square\s*yards?)\b/);
  if (m) return { value: Number(m[1]), unit: "sqyd" };
  m = s.match(/([\d.]+)\s*(sq\.?\s*fts?|square\s*feets?|square\s*feet)\b/);
  if (m) return { value: Number(m[1]), unit: "sqft" };
  return null;
}

export function convertArea(area: ParsedArea, to: RateUnit): number | null {
  const marla =
    area.unit === "marla"
      ? area.value
      : area.unit === "kanal"
        ? area.value * KANAL_TO_MARLA
        : area.unit === "sqyd"
          ? area.value / MARLA_TO_SQYD
          : area.unit === "sqft"
            ? area.value / MARLA_TO_SQFT
            : null;
  if (marla == null || !Number.isFinite(marla) || marla <= 0) return null;

  const target = normalizeRateUnit(String(to)) || String(to);
  switch (target) {
    case "PKR_PER_MARLA":
    case "per_marla":
      return marla;
    case "PKR_PER_KANAL":
    case "per_kanal":
      return marla / KANAL_TO_MARLA;
    case "PKR_PER_SQYD":
    case "per_sq_yd":
      return marla * MARLA_TO_SQYD;
    case "PKR_PER_SQFT":
    case "per_sq_ft":
      return marla * MARLA_TO_SQFT;
    default:
      return null;
  }
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract location hints from smartFields */
export function extractLocationHints(smartFields: any): {
  city?: string;
  area?: string;
  phase?: string;
  category?: string;
  addressText?: string;
} {
  const prop = smartFields?.property ?? smartFields?.property_details ?? {};
  const address =
    prop.address ||
    prop.property_address ||
    prop.location ||
    smartFields?.property_address ||
    smartFields?.address ||
    "";
  // Society/colony only — skip values that look like plot sizes (e.g. "500 Square Yards")
  const rawAreaName = prop.society || prop.colony || prop.scheme || prop.area || "";
  const areaName = /\d/.test(String(rawAreaName)) && /yard|marla|kanal|sq/i.test(String(rawAreaName))
    ? ""
    : String(rawAreaName);
  const city = prop.city || prop.district || smartFields?.city || "";
  const phase = prop.phase || prop.block || prop.phase_or_block || "";
  const categoryRaw = (prop.property_type || prop.category || prop.use || "").toLowerCase();
  const category = categoryRaw.includes("commercial")
    ? "commercial"
    : categoryRaw.includes("industrial")
      ? "industrial"
      : "residential";

  // Also scrape free text for known societies
  const blob = `${address} ${areaName} ${city} ${phase}`;
  return {
    city: city || undefined,
    area: areaName || undefined,
    phase: phase || undefined,
    category,
    addressText: blob,
  };
}

function inferCityAreaFromText(text: string): { city?: string; area?: string; phase?: string } {
  const t = norm(text);
  const out: { city?: string; area?: string; phase?: string } = {};

  if (/\bkarachi\b/.test(t)) out.city = "Karachi";
  else if (/\blahore\b/.test(t)) out.city = "Lahore";
  else if (/\bislamabad\b|\bisb\b/.test(t)) out.city = "Islamabad";
  else if (/\brawalpindi\b|\bpindi\b/.test(t)) out.city = "Rawalpindi";

  if (/\bdha\b|defence housing/.test(t)) out.area = "DHA";
  else if (/\bbahria\b/.test(t)) out.area = "Bahria Town";
  else if (/\bgulberg\b/.test(t)) out.area = "Gulberg";
  else if (/\bclifton\b/.test(t)) out.area = "Clifton";
  else if (/\bjohar town\b/.test(t)) out.area = "Johar Town";
  else if (/\bmodel town\b/.test(t)) out.area = "Model Town";
  else if (/\bgulshan\b/.test(t)) out.area = "Gulshan-e-Iqbal";
  else if (/\bf[\s-]?6\b/.test(t)) {
    out.city = out.city || "Islamabad";
    out.area = "F-6";
  } else if (/\bf[\s-]?7\b/.test(t)) {
    out.city = out.city || "Islamabad";
    out.area = "F-7";
  } else if (/\bf[\s-]?8\b/.test(t)) {
    out.city = out.city || "Islamabad";
    out.area = "F-8";
  } else if (/\bf[\s-]?10\b/.test(t)) {
    out.city = out.city || "Islamabad";
    out.area = "F-10";
  } else if (/\bf[\s-]?11\b/.test(t)) {
    out.city = out.city || "Islamabad";
    out.area = "F-11";
  }

  const phaseMatch = t.match(/\bphase\s*([0-9ivx]+)\b/) || t.match(/\bph\.?\s*([0-9]+)\b/);
  if (phaseMatch) out.phase = `Phase ${phaseMatch[1]}`;
  // Gulberg III style
  const g3 = t.match(/\bgulberg\s*(iii|3|ii|2|i|1)\b/);
  if (g3 && out.area === "Gulberg") {
    const map: Record<string, string> = { i: "I", ii: "II", iii: "III", "1": "I", "2": "II", "3": "III" };
    out.phase = map[g3[1]] || g3[1].toUpperCase();
  }

  return out;
}

function scoreMatch(
  row: DcRateRow,
  city?: string,
  area?: string,
  phase?: string,
  category?: string
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  if (city && norm(row.city) === norm(city)) {
    score += 40;
    reasons.push("city");
  }
  if (area && norm(row.area) === norm(area)) {
    score += 40;
    reasons.push("area");
  } else if (area && norm(row.area).includes(norm(area))) {
    score += 25;
    reasons.push("area~");
  }
  if (phase && row.phase_or_block && norm(row.phase_or_block) === norm(phase)) {
    score += 15;
    reasons.push("phase");
  } else if (phase && row.phase_or_block && norm(row.phase_or_block).includes(norm(phase))) {
    score += 8;
    reasons.push("phase~");
  }
  if (category && norm(row.category) === norm(category)) {
    score += 10;
    reasons.push("category");
  }
  return { score, reason: reasons.join("+") || "weak" };
}

/**
 * Look up official benchmark valuation for a property described in smartFields.
 * Returns matched:false when confidence is too low (silent no-op for risk).
 */
export async function getOfficialValuation(
  smartFields: any
): Promise<OfficialValuationResult> {
  try {
    const { sql } = await import("@/lib/db");
    if (!smartFields || typeof smartFields !== "object") {
      return { matched: false, reason: "no smartFields" };
    }

    const hints = extractLocationHints(smartFields);
    const inferred = inferCityAreaFromText(hints.addressText || "");
    const city = hints.city || inferred.city;
    const area = hints.area || inferred.area;
    const phase = hints.phase || inferred.phase;
    const category = hints.category || "residential";

    if (!city && !area) {
      return { matched: false, reason: "insufficient location (no city/area)" };
    }

    // Pull candidate rows for city or area
    const rows = (await sql`
      SELECT id, province, city, area, phase_or_block, sub_block, category, plot_type,
             rate_pkr::float8 AS rate_pkr, rate_unit, source_type,
             effective_date::text AS effective_date
      FROM dc_rates
      WHERE
        (${city ?? null}::text IS NOT NULL AND lower(city) = lower(${city ?? null}))
        OR (${area ?? null}::text IS NOT NULL AND lower(area) = lower(${area ?? null}))
      ORDER BY effective_date DESC NULLS LAST
      LIMIT 80
    `) as unknown as DcRateRow[];

    if (!rows || rows.length === 0) {
      return { matched: false, reason: `no dc_rates rows for city=${city} area=${area}` };
    }

    let best: { row: DcRateRow; score: number; reason: string } | null = null;
    for (const row of rows) {
      const { score, reason } = scoreMatch(row, city, area, phase, category);
      if (!best || score > best.score) best = { row, score, reason };
    }

    // Require city+area level confidence (score >= 70) to avoid false positives
    if (!best || best.score < 70) {
      return {
        matched: false,
        reason: `low match confidence score=${best?.score ?? 0} (${best?.reason ?? "none"})`,
      };
    }

    const prop = smartFields?.property ?? smartFields?.property_details ?? {};
    // Prefer size fields; prop.area is often a society name (DHA), not "500 sq yd"
    const areaCandidates = [
      prop.size,
      prop.plot_size,
      prop.total_area,
      prop.area_size,
      prop.land_area,
      smartFields?.plot_size,
      smartFields?.total_area,
      // only use prop.area / smartFields.area if they look like a measurement
      prop.area,
      smartFields?.area,
    ];
    let parsedArea: ParsedArea | null = null;
    for (const c of areaCandidates) {
      if (c == null || c === "") continue;
      const p = parseAreaString(String(c));
      if (p) {
        parsedArea = p;
        break;
      }
    }
    // Last resort: scrape any "N square yards/marla" from address blob
    if (!parsedArea) {
      const blob = [
        prop.address,
        prop.property_address,
        smartFields?.property_address,
        hints.addressText,
      ]
        .filter(Boolean)
        .join(" ");
      parsedArea = parseAreaString(blob);
    }
    if (!parsedArea) {
      return { matched: false, reason: "could not parse plot area from smartFields" };
    }

    const rateUnit = (normalizeRateUnit(String(best.row.rate_unit)) || best.row.rate_unit) as RateUnit;
    const areaInRateUnit = convertArea(parsedArea, rateUnit);
    if (areaInRateUnit == null) {
      return { matched: false, reason: "area unit conversion failed" };
    }

    const officialValuePkr = Math.round(Number(best.row.rate_pkr) * areaInRateUnit);
    if (!Number.isFinite(officialValuePkr) || officialValuePkr <= 0) {
      return { matched: false, reason: "invalid computed valuation" };
    }

    return {
      matched: true,
      officialValuePkr,
      ratePkr: Number(best.row.rate_pkr),
      rateUnit,
      areaUsed: parsedArea,
      areaInRateUnit,
      match: {
        city: best.row.city,
        area: best.row.area,
        phase_or_block: best.row.phase_or_block,
        category: best.row.category,
        source_type: best.row.source_type,
        effective_date: best.row.effective_date,
      },
      confidence: best.score >= 90 ? "high" : "medium",
      matchReason: best.reason,
    };
  } catch (err: any) {
    console.warn("[dc-rate-lookup] failed:", err?.message || err);
    return { matched: false, reason: `lookup error: ${err?.message || "unknown"}` };
  }
}

export function getDeclaredPrice(smartFields: any): number | null {
  const financials = smartFields?.financials;
  if (!financials) return null;
  const keys = ["total_price", "sale_price", "consideration", "sale_consideration", "amount"];
  for (const k of keys) {
    const v = financials[k];
    if (typeof v === "number" && v > 0) return v;
    if (v && typeof v === "object" && typeof v.amount === "number" && v.amount > 0) return v.amount;
  }
  return null;
}
