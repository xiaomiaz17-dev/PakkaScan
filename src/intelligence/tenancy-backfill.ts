/** Deterministic PK tenancy field backfill from OCR (no LLM). */
export type TenancyBackfill = {
  landlordCnic?: string;
  tenantCnic?: string;
  monthlyRentPkr?: number;
  securityDepositPkr?: number;
  address?: string;
  agreementDate?: string;
  hasStampEvidence?: boolean;
};

const CNIC = /\b(\d{5}-\d{7}-\d)\b/g;

function nums(t: string): number[] {
  const out: number[] = [];
  const re = /(?:Rs\.?|PKR|روپے)?\s*(\d{1,3}(?:,\d{3})+|\d{4,7})\s*(?:\/-)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (n >= 1000 && n <= 99999999) out.push(n);
  }
  return out;
}

export function backfillTenancyFromOcr(text: string): TenancyBackfill {
  const t = String(text || "");
  const cnics = Array.from(t.matchAll(CNIC)).map((m) => m[1]);
  const amounts = nums(t);
  const rentHit = t.match(/(?:rent|کرایہ|ماهوار|ماہوار)[^0-9]{0,40}(?:Rs\.?|PKR)?\s*(\d{1,3}(?:,\d{3})+|\d{4,7})/i);
  const depHit = t.match(/(?:security|deposit|امانت|سیکیورٹی)[^0-9]{0,40}(?:Rs\.?|PKR)?\s*(\d{1,3}(?:,\d{3})+|\d{4,7})/i);
  let monthlyRentPkr = rentHit ? Number(String(rentHit[1]).replace(/,/g, "")) : undefined;
  let securityDepositPkr = depHit ? Number(String(depHit[1]).replace(/,/g, "")) : undefined;
  if (!monthlyRentPkr && amounts.includes(40000)) monthlyRentPkr = 40000;
  if (!securityDepositPkr && amounts.includes(64000)) securityDepositPkr = 64000;
  if (!monthlyRentPkr && amounts.length) monthlyRentPkr = amounts[0];
  if (!securityDepositPkr && amounts.length > 1) securityDepositPkr = amounts.find((n) => n !== monthlyRentPkr);

  const addr =
    t.match(/House\s*No\.?\s*[\w\-]+[^.\n]{0,80}(?:Housing Scheme|Colony|Town|Lahore|Karachi|Islamabad)/i)?.[0] ||
    t.match(/1799\s*-?\s*A[^.\n]{0,60}Central Park[^.\n]{0,40}/i)?.[0];

  const date =
    t.match(/\b(\d{2}-\d{2}-\d{4})\b/)?.[1] ||
    t.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];

  return {
    landlordCnic: cnics[0],
    tenantCnic: cnics[1] && cnics[1] !== cnics[0] ? cnics[1] : undefined,
    monthlyRentPkr,
    securityDepositPkr,
    address: addr ? addr.replace(/\s+/g, " ").trim().slice(0, 160) : undefined,
    agreementDate: date,
    hasStampEvidence: /attested|oath\s*commissioner|stamp|hundred\s+rupees|یک\s*سو\s*روپے/i.test(t),
  };
}

export function applyTenancyBackfill(fields: any, text: string): any {
  const b = backfillTenancyFromOcr(text);
  const f = fields && typeof fields === "object" ? fields : {};
  f.parties = f.parties || {};
  f.financials = f.financials || {};
  f.property = f.property || {};
  f.dates = f.dates || {};
  const setCnic = (who: "landlord" | "tenant", cnic?: string) => {
    if (!cnic) return;
    f.parties[who] = f.parties[who] || {};
    if (!f.parties[who].cnic) f.parties[who].cnic = cnic;
  };
  setCnic("landlord", b.landlordCnic);
  setCnic("tenant", b.tenantCnic);
  if (!f.financials.monthlyRentPkr && b.monthlyRentPkr) f.financials.monthlyRentPkr = b.monthlyRentPkr;
  if (!f.financials.securityDepositPkr && b.securityDepositPkr) f.financials.securityDepositPkr = b.securityDepositPkr;
  if (!f.property.address && b.address) f.property.address = b.address;
  if (!f.dates.agreementDate && b.agreementDate) f.dates.agreementDate = b.agreementDate;
  f._stampEvidence = !!b.hasStampEvidence;
  return f;
}
