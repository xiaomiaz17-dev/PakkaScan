/**
 * Bidirectional isolation for Latin IDs inside RTL (Urdu) text.
 * Hyphens in CNICs are bidi-neutral; without LTR isolate chunks reverse
 * (35202-9728102-9 renders as 9-9728102-35202).
 */
const LRI = "\u2066";
const PDI = "\u2069";

function wrap(m: string): string {
  if (!m || m.includes(LRI)) return m;
  return LRI + m + PDI;
}

export function isolateLtrRuns(text: string | null | undefined): string {
  if (!text) return "";
  let out = text;
  // CNIC XXXXX-XXXXXXX-X (ASCII or unicode dashes)
  out = out.replace(/\d{5}[\-\u2010\u2011\u2012\u2013\u2014\s]\d{7}[\-\u2010\u2011\u2012\u2013\u2014\s]\d/g, wrap);
  // ISO date
  out = out.replace(/\b\d{4}-\d{2}-\d{2}\b/g, wrap);
  // PKR / Rs amounts
  out = out.replace(/\b(?:PKR|Rs\.?)\s*\d[\d,]*(?:\.\d+)?/gi, wrap);
  return out;
}

export function isolateCnic(value: string | null | undefined): string {
  if (!value) return "";
  const v = String(value).trim();
  if (!v) return "";
  return wrap(v);
}
