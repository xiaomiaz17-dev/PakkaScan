import { z } from "zod";

export const Foundness = z.enum(["found", "not_found"]);

export const MoneyFact = z.object({
  amount: z.number().nullable(),
  currency: z.string().default("PKR"),
  status: Foundness,
});

export const PartyFact = z.object({
  name: z.string().nullable(),
  cnic: z.string().nullable(),
  status: Foundness,
});

export const ClearanceFact = z.object({
  kind: z.enum(["NDC", "NEC", "NOC", "MAINTENANCE", "OTHER"]),
  issuer: z.string().nullable(),
  ref: z.string().nullable(),
  outstanding_dues: z.number().nullable(),
  status: Foundness,
});

export const RiskFlagFact = z.object({
  rule_id: z.string(),
  excerpt: z.string().nullable(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
});

export const ScanFact = z.object({
  document_type: z.string(),
  parties: z.object({
    landlord: PartyFact.optional(),
    tenant: PartyFact.optional(),
    seller: PartyFact.optional(),
    buyer: PartyFact.optional(),
    owner: PartyFact.optional(),
    principal: PartyFact.optional(),
    attorney: PartyFact.optional(),
  }),
  financials: z.object({
    monthly_rent: MoneyFact,
    security_deposit: MoneyFact,
    token_bayana: MoneyFact,
    total_price: MoneyFact,
    outstanding_dues: MoneyFact,
  }),
  dates: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
    signed: z.string().nullable(),
  }),
  property: z.object({
    address: z.string().nullable(),
    area: z.string().nullable(),
    plot: z.string().nullable(),
  }),
  clearances: z.array(ClearanceFact),
  risk_flags: z.array(RiskFlagFact),
  schema_ok: z.boolean(),
});

export type ScanFactT = z.infer<typeof ScanFact>;

function amt(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v?.amount ?? v?.value ?? String(v).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
function party(v: any): { name: string | null; cnic: string | null; status: "found" | "not_found" } {
  const name = v && typeof v === "object" ? String(v.name || v.full_name || "").trim() || null : (v ? String(v).trim() : null);
  const cnic = v && typeof v === "object" ? String(v.cnic || v.nic || "").trim() || null : null;
  return { name, cnic, status: name || cnic ? "found" : "not_found" };
}
function money(v: any) {
  const a = amt(v);
  return { amount: a, currency: "PKR", status: a != null ? "found" as const : "not_found" as const };
}

export function coerceToScanFact(input: {
  documentType?: string;
  smartFields?: any;
  ocrText?: string;
}): ScanFactT {
  const sf = input.smartFields || {};
  const fin = sf.financials || {};
  const par = sf.parties || {};
  const dt = sf.dates || {};
  const prop = sf.property || {};
  const text = String(input.ocrText || sf.summary || "");

  let dues = amt(fin.outstanding_dues ?? fin.total_outstanding_dues);
  const duesLine = text.match(/TOTAL\s+OUTSTANDING\s+DUES[:\s]*Rs\.?\s*([0-9,]+)/i);
  if (duesLine) {
    const n = Number(String(duesLine[1]).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) dues = n;
  }

  const token = amt(fin.token_bayana ?? fin.token ?? fin.bayana ?? fin.advance);
  const price = amt(fin.total_price ?? fin.consideration ?? fin.sale_price);

  const clearances: z.infer<typeof ClearanceFact>[] = [];
  if (/no demand certificate|\bNDC\b/i.test(text)) {
    clearances.push({
      kind: "NDC",
      issuer: /CDA/i.test(text) ? "CDA" : /DHA/i.test(text) ? "DHA" : null,
      ref: (text.match(/CDA\/NDC\/[0-9/]+/i) || [null])[0],
      outstanding_dues: /dues cleared|tax paid/i.test(text) ? 0 : dues,
      status: "found",
    });
  }
  if (/non-?encumbrance|\bNEC\b/i.test(text)) {
    clearances.push({
      kind: "NEC",
      issuer: /Sub-?Registrar/i.test(text) ? "Sub-Registrar" : null,
      ref: null,
      outstanding_dues: null,
      status: "found",
    });
  }

  const raw = {
    document_type: String(input.documentType || sf.documentType || "UNKNOWN"),
    parties: {
      landlord: party(par.landlord),
      tenant: party(par.tenant),
      seller: party(par.seller),
      buyer: party(par.buyer),
      owner: party(par.owner),
      principal: party(par.principal),
      attorney: party(par.attorney),
    },
    financials: {
      monthly_rent: money(fin.monthly_rent ?? fin.rent),
      security_deposit: money(fin.security_deposit),
      token_bayana: money(token),
      total_price: money(price),
      outstanding_dues: { amount: dues, currency: "PKR", status: (dues != null ? "found" : "not_found") as "found" | "not_found" },
    },
    dates: {
      start: dt.start_date || dt.startDate || null,
      end: dt.end_date || dt.endDate || null,
      signed: dt.signed_on || dt.signedOn || dt.execution_date || null,
    },
    property: {
      address: prop.address || prop.full_address || null,
      area: prop.area || prop.size || null,
      plot: prop.plot_number || prop.plot || null,
    },
    clearances,
    risk_flags: [],
    schema_ok: true,
  };

  const parsed = ScanFact.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { ...raw, financials: { ...raw.financials, outstanding_dues: { amount: dues, currency: "PKR", status: (dues != null ? "found" : "not_found") as "found" | "not_found" } }, schema_ok: false, risk_flags: [] };
}