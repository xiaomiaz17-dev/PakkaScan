/**
 * Universal extractors — run on ALL documents regardless of type.
 * Complement the document-type-specific extractors in extractors.ts.
 *
 * Emits RawField[] with the same shape as the existing extractDocument().
 * Field names are chosen to match normalization.ts routing rules so that
 * evidence values are normalized correctly downstream.
 */

import type { RawField } from "./types";

// ---------- Utility helpers ----------

const URDU_DIGITS: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (c) => URDU_DIGITS[c] || c);
}

function makeField(field: string, value: string, confidence = 0.85, page = 1): RawField | null {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 1) return null;
  return { field, value: cleaned, confidence, page, rawText: cleaned };
}

function contextAround(text: string, index: number, radius = 80): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end);
}

// ---------- Amount extraction ----------

type AmountHit = {
  amount: string;   // digits only, comma-normalized
  numeric: number;
  currency: "PKR" | "INR";
  context: string;
  position: number;
};

/**
 * Find every monetary amount in the text with its surrounding context.
 * Handles: PKR/Rs/Rs./INR/₨/₹/rupees, commas, decimals, /-, /only, Urdu digits.
 */
function findAllAmounts(text: string): AmountHit[] {
  const normalized = normalizeDigits(text);
  const hits: AmountHit[] = [];

  // Pattern 1: currency-prefixed  e.g. "PKR 1,50,000/-" or "Rs. 25000 only"
  const prefixed =
    /(pkr|rs\.?|inr|rupees?|₨|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(\/-|only|\/\s*month|per\s*month|p\.m\.?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = prefixed.exec(normalized)) !== null) {
    const raw = m[2].replace(/,/g, "");
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 100) continue;

    const cur = m[1].toLowerCase();
    const currency: "PKR" | "INR" = cur === "inr" || cur === "₹" ? "INR" : "PKR";
    hits.push({
      amount: m[2],
      numeric,
      currency,
      context: contextAround(normalized, m.index).toLowerCase(),
      position: m.index,
    });
  }

  // Pattern 2: trailing rupees  e.g. "500,000 rupees" or "1,50,000/-"
  const trailing = /([\d,]+(?:\.\d{1,2})?)\s*(rupees?|\/-)(?!\d)/gi;
  while ((m = trailing.exec(normalized)) !== null) {
    const raw = m[1].replace(/,/g, "");
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 100) continue;
    // Deduplicate: skip if within 20 chars of an already-captured hit
    if (hits.some((h) => Math.abs(h.position - m!.index) < 25)) continue;
    hits.push({
      amount: m[1],
      numeric,
      currency: "PKR",
      context: contextAround(normalized, m.index).toLowerCase(),
      position: m.index,
    });
  }

  return hits;
}

function classifyAmountByContext(hit: AmountHit): string | null {
  const c = hit.context;
  if (/rent|monthly|per\s*month|p\.m\.?|کرایہ|kiraaya|kraaya/i.test(c)) return "monthly_rent";
  if (/security|refundable|deposit|advance\s*security|سیکورٹی/i.test(c)) return "security_deposit";
  if (/token|bayana|earnest|advance\s*token|بیعانہ/i.test(c)) return "token_amount";
  if (/sale\s*consideration|total\s*consideration|sale\s*price|sold\s*for|total\s*value|consideration\s*amount/i.test(c))
    return "total_consideration";
  if (/advance|paid\s*in\s*advance/i.test(c)) return "advance_payment";
  if (/stamp\s*duty|stamp\s*paper|registration\s*fee|stamp\s*value/i.test(c)) return "stamp_paper_value";
  if (/loan|mortgage|secured/i.test(c)) return "loan_amount";
  if (/balance\s*due|remaining|balance\s*amount/i.test(c)) return "balance_amount";
  return null;
}

function extractAmountFields(text: string): RawField[] {
  const hits = findAllAmounts(text);
  const out: RawField[] = [];
  const seenTypes = new Set<string>();

  for (const hit of hits) {
    const type = classifyAmountByContext(hit);
    const canonical = `${hit.currency} ${hit.amount}`;
    if (type && !seenTypes.has(type)) {
      const field = makeField(type, canonical, 0.9);
      if (field) {
        out.push(field);
        seenTypes.add(type);
      }
    }
  }

  // Also record every raw amount seen, indexed, so downstream reviewers can audit
  hits.forEach((hit, idx) => {
    const f = makeField(
      `amount_mention_${idx + 1}`,
      `${hit.currency} ${hit.amount}`,
      0.7,
    );
    if (f) out.push(f);
  });

  return out;
}

// ---------- Date extraction ----------

const MONTH_NAMES =
  "january|february|march|april|may|june|july|august|september|october|november|december";

function extractDateFields(text: string): RawField[] {
  const results: { date: string; position: number }[] = [];
  const patterns: RegExp[] = [
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})[,\\s]+(\\d{4})\\b`, "gi"),
    new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?[,\\s]+(\\d{4})\\b`, "gi"),
  ];
  const src = normalizeDigits(text);

  for (const rx of patterns) {
    let m: RegExpExecArray | null;
    while ((m = rx.exec(src)) !== null) {
      results.push({ date: m[0], position: m.index });
    }
  }

  const contextRules: { field: string; cues: RegExp }[] = [
    { field: "execution_date", cues: /executed\s+on|dated|this\s+deed|this\s+day\s+of|on\s+this/i },
    { field: "tenancy_start_date", cues: /commencing|starting|effective\s+from|w\.e\.f|with\s+effect|from\s+the\s+date/i },
    { field: "tenancy_end_date", cues: /ending|expiring|until|till|up\s+to|expires|valid\s+till/i },
    { field: "registration_date", cues: /registered\s+on|registration\s+date|date\s+of\s+registration/i },
    { field: "mutation_date", cues: /mutation\s+date|date\s+of\s+mutation|attestation/i },
    { field: "balance_due_date", cues: /balance\s+due|balance\s+payable|remaining\s+amount/i },
  ];

  const out: RawField[] = [];
  const claimed = new Set<string>();

  for (const hit of results) {
    const before = contextAround(src, hit.position, 100).toLowerCase();
    for (const rule of contextRules) {
      if (claimed.has(rule.field)) continue;
      if (rule.cues.test(before)) {
        const f = makeField(rule.field, hit.date, 0.85);
        if (f) {
          out.push(f);
          claimed.add(rule.field);
        }
        break;
      }
    }
  }

  // Fallback: first date is often the execution date
  if (!claimed.has("execution_date") && results.length > 0) {
    const f = makeField("execution_date", results[0].date, 0.6);
    if (f) out.push(f);
  }

  return out;
}

// ---------- Identity number extraction ----------

function extractIdentityFields(text: string): RawField[] {
  const out: RawField[] = [];
  const src = normalizeDigits(text);

  // CNIC / NICOP: 12345-1234567-1
  const cnic = src.match(/\b(\d{5}-\d{7}-\d)\b/);
  if (cnic) {
    const f = makeField("identity_number", cnic[1], 0.95);
    if (f) out.push(f);
  }

  // Phones — Pakistani mobile
  const phone = src.match(/\b(?:\+?92|0)?3\d{2}[-\s]?\d{7}\b/);
  if (phone) {
    const f = makeField("contact_phone", phone[0], 0.85);
    if (f) out.push(f);
  }

  return out;
}

// ---------- Party name extraction ----------

/**
 * Attempts to find named parties with s/o (son of), d/o (daughter of), w/o (wife of).
 * Captures common honorifics: Mr, Mrs, Ms, Ch, Chaudhry, Sheikh, Khan, Khawaja,
 * Mian, Haji, Malik, Syed, Mst.
 */
function extractPartyFields(text: string): RawField[] {
  const out: RawField[] = [];

  const namePattern =
    /(?:mr|mrs|ms|miss|syed|mst|malik|ch|chaudhry|sheikh|khan|khawaja|mian|haji)\.?\s+([a-z][a-z\s.'-]{2,50}?)\s+(?:s\/o|d\/o|w\/o|son\s+of|daughter\s+of|wife\s+of)\s+(?:mr|mrs|syed|mst|malik|ch|chaudhry|sheikh|khan|khawaja|mian|haji)?\.?\s*([a-z][a-z\s.'-]{2,50}?)(?=\s*[,.\n]|\s+aged|\s+cnic|\s+r\/o|\s+resident|\s+resid)/gi;

  const roleRules: { field: string; cues: RegExp; unique: boolean }[] = [
    { field: "landlord_name", cues: /landlord|owner|lessor|first\s+party|malik|مالک/i, unique: true },
    { field: "tenant_name", cues: /tenant|lessee|second\s+party|mustajir|مستاجر/i, unique: true },
    { field: "seller", cues: /seller|vendor|transferor|first\s+party/i, unique: true },
    { field: "buyer", cues: /buyer|vendee|transferee|second\s+party/i, unique: true },
    { field: "principal", cues: /principal|executant/i, unique: true },
    { field: "attorney", cues: /attorney|mukhtar/i, unique: true },
    { field: "mortgagor", cues: /mortgagor|borrower/i, unique: true },
    { field: "mortgagee", cues: /mortgagee|lender|bank/i, unique: true },
    { field: "witness_name", cues: /witness|gawah/i, unique: false },
  ];

  const claimed = new Set<string>();
  const seenFullNames = new Set<string>();

  let m: RegExpExecArray | null;
  while ((m = namePattern.exec(text)) !== null) {
    const person = m[1]?.trim();
    const father = m[2]?.trim();
    if (!person || !father) continue;

    const full = `${person} s/o ${father}`;
    if (seenFullNames.has(full.toLowerCase())) continue;
    seenFullNames.add(full.toLowerCase());

    const before = contextAround(text, m.index, 150).toLowerCase();

    for (const rule of roleRules) {
      if (rule.unique && claimed.has(rule.field)) continue;
      if (rule.cues.test(before)) {
        const f = makeField(rule.field, full, 0.8);
        if (f) {
          out.push(f);
          if (rule.unique) claimed.add(rule.field);
        }
        break;
      }
    }
  }

  return out;
}

// ---------- Property identifier extraction ----------

function extractPropertyFields(text: string): RawField[] {
  const out: RawField[] = [];
  const src = normalizeDigits(text);

  const patterns: { field: string; rx: RegExp; conf?: number }[] = [
    { field: "plot_number", rx: /(?:plot|house|flat|shop|apartment)\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Za-z0-9\-\/]{1,15})/i, conf: 0.9 },
    { field: "khasra", rx: /khasra\s*(?:no\.?|number|#)?\s*[:\-]?\s*([0-9\-\/,]+)/i, conf: 0.9 },
    { field: "khewat", rx: /khewat\s*(?:no\.?|number|#)?\s*[:\-]?\s*([0-9\-\/,]+)/i, conf: 0.9 },
    { field: "khatoni", rx: /khato[on]i\s*(?:no\.?|number|#)?\s*[:\-]?\s*([0-9\-\/,]+)/i, conf: 0.9 },
    { field: "khatooni", rx: /khatooni\s*(?:no\.?|number|#)?\s*[:\-]?\s*([0-9\-\/,]+)/i, conf: 0.9 },
    { field: "murabba", rx: /murabba\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9\-\/]+)/i, conf: 0.85 },
    { field: "survey_number", rx: /survey\s*(?:no\.?|number|#)?\s*[:\-]?\s*([0-9\-\/,]+)/i, conf: 0.9 },
    { field: "block_number", rx: /\bblock\s*[:\-]?\s*([A-Za-z0-9\-]{1,10})/i, conf: 0.85 },
    { field: "sector_number", rx: /\bsector\s*[:\-]?\s*([A-Za-z0-9\-]{1,10})/i, conf: 0.85 },
    { field: "phase", rx: /\bphase\s*[:\-]?\s*([A-Za-z0-9\-\s]{1,15}?)(?=[,.\n])/i, conf: 0.8 },
    { field: "street_number", rx: /(?:street|st\.?)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9\-]{1,10})/i, conf: 0.8 },
    { field: "district", rx: /\bdistrict[:\s]+([A-Za-z][A-Za-z\s]{2,40}?)(?=[,.\n]|\btehsil\b|\bmauza\b)/i, conf: 0.8 },
    { field: "tehsil", rx: /\btehsil[:\s]+([A-Za-z][A-Za-z\s]{2,40}?)(?=[,.\n]|\bmauza\b|\bdistrict\b)/i, conf: 0.8 },
    { field: "mauza", rx: /\bmauza[:\s]+([A-Za-z][A-Za-z\s]{2,40}?)(?=[,.\n]|\btehsil\b|\bdistrict\b)/i, conf: 0.8 },
  ];

  for (const p of patterns) {
    const mm = src.match(p.rx);
    if (mm && mm[1]) {
      const f = makeField(p.field, mm[1].trim(), p.conf ?? 0.85);
      if (f) out.push(f);
    }
  }

  // Area (Marla / Kanal / Sq Ft / Sq Yd / Acre / Bigha / Guntha)
  const areaMatch = src.match(
    /(\d+(?:\.\d+)?)\s*(marla|kanal|kanaal|square\s*feet|sq\.?\s*ft\.?|square\s*yards?|sq\.?\s*yd\.?|acres?|bigha|guntha)/i,
  );
  if (areaMatch) {
    const f = makeField("area", `${areaMatch[1]} ${areaMatch[2]}`, 0.85);
    if (f) out.push(f);
  }

  // Free-text address (various lead-ins). Non-greedy, capped at 200 chars.
  const addrPatterns: RegExp[] = [
    /(?:situated\s+at|property\s+(?:situated|located)\s+at)\s+(.{15,200}?)(?=[,.]|\bmeasuring\b|\bbounded\b|\bcnic\b|\n)/i,
    /(?:r\/o|resident\s+of)\s+(.{15,200}?)(?=[,.]|\bcnic\b|\baged\b|\n)/i,
    /(?:premises|demised\s+premises)[:\s]+(.{15,200}?)(?=[,.]|\n)/i,
  ];
  for (const rx of addrPatterns) {
    const mm = text.match(rx);
    if (mm && mm[1]) {
      const f = makeField("full_address", mm[1].trim(), 0.75);
      if (f) {
        out.push(f);
        break;
      }
    }
  }

  return out;
}

// ---------- Public entry point ----------

/**
 * Run every universal extractor and return the merged list.
 * Downstream code (extractors.ts) is responsible for merging these
 * with the schema-specific fields.
 */
export function extractUniversalFields(text: string): RawField[] {
  if (!text || text.length < 20) return [];
  return [
    ...extractAmountFields(text),
    ...extractDateFields(text),
    ...extractIdentityFields(text),
    ...extractPartyFields(text),
    ...extractPropertyFields(text),
  ];
}