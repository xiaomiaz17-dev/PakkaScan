const honorifics = /\b(mr|mrs|ms|dr|haji|late)\.?\b/gi;

export function normalizeWhitespace(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function normalizeIdentityNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 13) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function normalizePersonName(value: string): string {
  return normalizeWhitespace(value)
    .replace(honorifics, "")
    .replace(/\b(s\/o|d\/o|w\/o)\b.*$/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .toLocaleLowerCase("en")
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

export function normalizePropertyReference(value: string): string {
  return normalizeWhitespace(value)
    .toLocaleUpperCase("en")
    .replace(/KHASRA\s*(NO\.?|NUMBER)?\s*/g, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ");
}

export function normalizeBoolean(value: string): string {
  const v = normalizeWhitespace(value).toLocaleLowerCase("en");
  return ["yes", "true", "active", "present", "approved", "sanctioned"].some((token) => v.includes(token)) ? "true" : "false";
}

export function normalizeArea(value: string): string {
  const v = normalizeWhitespace(value).toLocaleLowerCase("en");
  const kanal = Number(v.match(/(\d+(?:\.\d+)?)\s*kanal/)?.[1] ?? 0);
  const marla = Number(v.match(/(\d+(?:\.\d+)?)\s*marla/)?.[1] ?? 0);
  const sqYards = Number(v.match(/(\d+(?:\.\d+)?)\s*sq\.?\s*yards?/)?.[1] ?? 0);
  const sqFeet = Number(v.match(/(\d+(?:\.\d+)?)\s*sq\.?\s*ft/)?.[1] ?? 0);
  if (kanal || marla) return `${(kanal * 20 + marla).toFixed(3)} marla`;
  if (sqYards) return `${(sqYards * 9).toFixed(3)} sqft`;
  if (sqFeet) return `${sqFeet.toFixed(3)} sqft`;
  return v;
}

export function normalizeDate(value: string): string {
  const match = value.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (!match) return normalizeWhitespace(value);
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * Normalize monetary values.
 * Converts "PKR 1,50,000", "Rs. 25000/-", "₨ 5,00,000 only" → "PKR 150000".
 * Preserves currency (PKR or INR). Handles Urdu digits.
 */
export function normalizeAmount(value: string): string {
  const urduDigits: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };
  const anglicised = value.replace(/[۰-۹]/g, (c) => urduDigits[c] || c);
  const lower = normalizeWhitespace(anglicised).toLocaleLowerCase("en");
  const currency = /inr|₹/.test(lower) ? "INR" : "PKR";
  const digitsMatch = lower.match(/([\d,]+(?:\.\d{1,2})?)/);
  if (!digitsMatch) return normalizeWhitespace(anglicised);
  const numeric = digitsMatch[1].replace(/,/g, "");
  return `${currency} ${numeric}`;
}

export function normalizeField(field: string, value: string): string {
  if (/identity|cnic|nicop/i.test(field)) return normalizeIdentityNumber(value);
  if (/rent|deposit|consideration|token|advance|price|amount|loan|balance|stamp/i.test(field)) return normalizeAmount(value);
  if (/owner|seller|buyer|principal|attorney|mortgagor|mortgagee|landlord|tenant|name/i.test(field)) return normalizePersonName(value);
  if (/khasra|khewat|khatoni|khatooni|murabba|property_reference/i.test(field)) return normalizePropertyReference(value);
  if (/area/i.test(field)) return normalizeArea(value);
  if (/date|expiry|period_(start|end)/i.test(field)) return normalizeDate(value);
  if (/active|template_detected/i.test(field)) return normalizeBoolean(value);
  return normalizeWhitespace(value);
}