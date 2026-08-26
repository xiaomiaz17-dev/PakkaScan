export function sanitizeRentalNextSteps(steps: any[], fields: any, ocr: string): any[] {
  const f = fields || {};
  const text = String(ocr || "");
  const rent = Number(f.financials?.monthlyRentPkr || f.financials?.monthly_rent?.amount || f.financials?.rentPkr || 0);
  const dep = Number(f.financials?.securityDepositPkr || f.financials?.security_deposit?.amount || f.financials?.depositPkr || 0);
  const addr = String(f.property?.address || f.property?.location || "");
  const cnicL = String(f.parties?.landlord?.cnic || "");
  const cnicT = String(f.parties?.tenant?.cnic || "");
  const cnicInText = (text.match(/\b\d{5}-\d{7}-\d\b/g) || []).length >= 1;
  const moneyInText = /40\s*,?\s*000|64\s*,?\s*000|Rs\s*=\s*\d|Rs\.?\s*\d{2,}/i.test(text);
  const hasLockStay = /break\s*lock|lock[\s-]?break|stay\s*order|repossess|قفل|stay\s+clause|cannot\s+vacate/i.test(text);

  let out = (steps || [])
    .map((s) => {
      const title = String(s?.title || "");
      const detail = String(s?.detail || s?.body || "");
      const blob = (title + " " + detail).toLowerCase();
      const moneyStep = /financial|rent|deposit|کرایہ|امانت|سیکیور/.test(blob) && /missing|add |not mentioned|clarif|write down/.test(blob);
      const cnicStep = /cnic|identity|شناخت/.test(blob) && /collect|missing|verify|copies/.test(blob);
      const addrStep = /address|پتہ/.test(blob) && /missing|add |include|not mentioned/.test(blob);
      const lockStep = /break lock|stay order|repossess|قفل|stay|lock-break|lock break/.test(blob);
      if (moneyStep && (rent || dep || moneyInText)) return null;
      if (cnicStep && (cnicL || cnicT || cnicInText)) return null;
      if (addrStep && (addr || /1799|central park/i.test(text))) return null;
      if (lockStep || (hasLockStay && /lock|stay|قفل|repossess/.test(blob))) {
        return {
          ...s,
          priority: "important",
          title: "Note the lock-break and stay clauses",
          detail:
            "These terms are common on Pakistani tenancy forms but they are one-sided. Get written confirmation you accept them, or strike them, before you rely on this paper.",
        };
      }
      return s;
    })
    .filter(Boolean) as any[];

  if (hasLockStay && !out.some((x) => /lock-break|stay clause/i.test(String(x?.title || "")))) {
    out = [
      {
        priority: "important",
        title: "Note the lock-break and stay clauses",
        detail:
          "These terms are common on Pakistani tenancy forms but they are one-sided. Get written confirmation you accept them, or strike them, before you rely on this paper.",
      },
      ...out,
    ];
  }
  // Sale packs: rewrite tenancy role words → sale parties
  const fin = f.financials || {};
  const isSale =
    Number(fin.total_price?.amount || fin.total_price || 0) > 0 ||
    Number(fin.token_amount?.amount || fin.token_amount || 0) > 0 ||
    !!(f.parties?.seller || f.parties?.buyer);
  if (isSale) {
    out = out.map((s) => {
      const rewrite = (t: string) =>
        String(t || "")
          .replace(/\blessor\b/gi, "seller")
          .replace(/\blessee\b/gi, "buyer")
          .replace(/\blandlord\b/gi, "seller")
          .replace(/\btenant\b/gi, "buyer");
      return {
        ...s,
        title: rewrite(s?.title),
        detail: rewrite(s?.detail || s?.body),
      };
    });
  }
  // Bump Sub-Registrar / registry checks when general PoA appears in pack text
  const hasGeneralPoa = /general\s+(power\s+of\s+attorney|poa)|power of attorney[\s\S]{0,80}(all\s+propert|unlimited|any\s+propert)/i.test(text);
  if (hasGeneralPoa) {
    out = out.map((s) => {
      const blob = `${s?.title || ""} ${s?.detail || ""}`;
      if (/sub-?registrar|registry|registration\s+office|revok/i.test(blob)) {
        return { ...s, priority: "high" };
      }
      return s;
    });
  }
  return out.slice(0, 6);
}
