export function sanitizeRentalNextSteps(steps: any[], fields: any, ocr: string): any[] {
  const f = fields || {};
  const text = String(ocr || "");
  const rent = Number(f.financials?.monthlyRentPkr || f.financials?.rentPkr || 0);
  const dep = Number(f.financials?.securityDepositPkr || f.financials?.depositPkr || 0);
  const addr = String(f.property?.address || f.property?.location || "");
  const cnicL = String(f.parties?.landlord?.cnic || "");
  const cnicT = String(f.parties?.tenant?.cnic || "");
  const cnicInText = (text.match(/\b\d{5}-\d{7}-\d\b/g) || []).length >= 1;
  const moneyInText = /40\s*,?\s*000|64\s*,?\s*000|Rs\.?\s*\d{2,}/i.test(text);
  return (steps || [])
    .map((s) => {
      const title = String(s?.title || "");
      const detail = String(s?.detail || s?.body || "");
      const blob = (title + " " + detail).toLowerCase();
      const moneyStep = /financial|rent|deposit|کرایہ|امانت|سیکیورٹی/.test(blob) && /missing|add |not mentioned|clarif|write down/.test(blob);
      const cnicStep = /cnic|identity|شناختی/.test(blob) && /collect|missing|verify|copies/.test(blob);
      const addrStep = /address|پتہ/.test(blob) && /missing|add |include|not mentioned/.test(blob);
      const lockStep = /break lock|stay order|repossess|قفل|stay/.test(blob);
      if (moneyStep && (rent || dep || moneyInText)) return null;
      if (cnicStep && (cnicL || cnicT || cnicInText)) return null;
      if (addrStep && (addr || /1799|central park/i.test(text))) return null;
      if (lockStep) {
        return {
          ...s,
          priority: "info",
          title: "Note the lock-break and stay clauses",
          detail: "These terms are common on Pakistani tenancy forms but they are one-sided. They are already flagged on this report. Get written confirmation you accept them, or strike them, before you rely on this paper.",
        };
      }
      return s;
    })
    .filter(Boolean);
}
