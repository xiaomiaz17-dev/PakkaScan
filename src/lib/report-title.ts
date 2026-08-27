export function reportTitleFor(
  reportType?: string | null,
  docLabel?: string | null,
  allDocTypes?: string[] | null,
): string {
  const t = (reportType || "").toLowerCase();
  const types = (allDocTypes || []).map((x) => String(x || "").toUpperCase());
  const blob = types.join(" ") + " " + String(docLabel || "");
  const hasSell = /AGREEMENT_TO_SELL|SALE_DEED|REGISTERED_SALE|\bBAYANA\b/.test(blob);
  const hasTenancy = /TENANCY|KIRAYA|KIRAAYA|RENTAL/.test(blob);
  if (hasSell) {
    if (t === "full_dd" || t === "full" || t === "full-dd") return "Full Property Due Diligence";
    return "Property Sale Safety Check";
  }
  if (hasTenancy) return "Rental Safety Check";
  if (t === "rental" || t === "rental_safety") return "Rental Safety Check";
  if (t === "bayana") return "Bayana Safety Check";
  if (t === "full_dd" || t === "full" || t === "full-dd") return "Full Property Due Diligence";
  return "PakkaScan Report";
}