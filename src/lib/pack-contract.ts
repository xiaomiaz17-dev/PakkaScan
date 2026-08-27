import { reportTitleFor } from "./report-title";

export type PackKind = "lahore_tenancy" | "karachi_sale" | "islamabad_sale";

export function classifyPack(types: string[], fileNames: string[] = []): PackKind | "unknown" {
  const blob = [...types, ...fileNames].join(" ").toUpperCase();
  if (/TENANCY|KIRAYA|RENTAL/.test(blob) && !/AGREEMENT_TO_SELL|SALE_DEED|\bBAYANA\b/.test(blob)) return "lahore_tenancy";
  if (/ISLAMABAD|F-11|CDA|FARD/.test(blob)) return "islamabad_sale";
  if (/AGREEMENT_TO_SELL|SALE_DEED|\bBAYANA\b|DHA|KARACHI/.test(blob)) return "karachi_sale";
  return "unknown";
}

export function assertPackReport(
  kind: PackKind,
  payload: {
    title?: string;
    verdict?: string;
    riskLabel?: string;
    riskScore?: number;
    docTypes?: string[];
    fileNames?: string[];
    factors?: string[];
    urdu?: string;
  },
): string[] {
  const errs: string[] = [];
  const title = payload.title || reportTitleFor(
    kind === "lahore_tenancy" ? "bayana" : "full_dd",
    payload.docTypes?.[0],
    [...(payload.docTypes || []), ...(payload.fileNames || [])],
  );
  const verdict = String(payload.verdict || "").toUpperCase().replace(/_/g, " ");
  const risk = String(payload.riskLabel || "").toUpperCase();
  const score = Number(payload.riskScore || 0);
  const urdu = String(payload.urdu || "");

  if (kind === "lahore_tenancy") {
    if (!/Rental Safety Check/i.test(title)) errs.push("lahore: title must be Rental Safety Check, got " + title);
    if (!/CAUTION/.test(verdict)) errs.push("lahore: verdict must be CAUTION, got " + verdict);
    if (/DO NOT PROCEED/.test(verdict)) errs.push("lahore: must not STOP");
    if (score > 7) errs.push("lahore: riskScore too high " + score);
  }
  if (kind === "karachi_sale" || kind === "islamabad_sale") {
    if (/Rental Safety Check/i.test(title)) errs.push(kind + ": must not be Rental");
    if (!/DO NOT PROCEED|STOP/.test(verdict)) errs.push(kind + ": verdict must STOP, got " + verdict);
    if (risk && risk !== "CRITICAL" && score < 9) errs.push(kind + ": expected CRITICAL");
  }
  if (kind === "islamabad_sale") {
    const blob = (payload.factors || []).join(" ");
    if (/Page 2 contains the property address/.test(blob)) errs.push("islamabad: tenancy page-split badge leaked into sale");
  }
  if (/[ØÙ]/.test(urdu)) errs.push("utf8: latin1 mojibake in Urdu");
  return errs;
}