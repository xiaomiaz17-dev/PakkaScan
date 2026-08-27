import { describe, it, expect } from "vitest";
import { reportTitleFor } from "./report-title";
import { assertPackReport } from "./pack-contract";
import { coerceToScanFact } from "./scan-fact";
import { dedupeByRuleId, decodeUtf8, clipSentence, ruleIdFromText } from "./scan-rules";

describe("goldens: titles", () => {
  it("lahore tenancy stays Rental even on bayana credit", () => {
    expect(reportTitleFor("bayana", "TENANCY_AGREEMENT", ["TENANCY_AGREEMENT", "BV tenancy urdu 1 - PG1.jpg"])).toBe("Rental Safety Check");
  });
  it("karachi sale is not Rental", () => {
    const t = reportTitleFor("bayana", "LEASE_DEED", ["LEASE_DEED", "AGREEMENT_TO_SELL", "CLEARANCE"]);
    expect(t).not.toMatch(/Rental/);
    expect(t).toMatch(/Sale|Bayana|Due Diligence/);
  });
});

describe("goldens: pack contracts", () => {
  it("lahore", () => {
    expect(assertPackReport("lahore_tenancy", { verdict: "PROCEED WITH CAUTION", riskScore: 5, riskLabel: "MEDIUM", title: "Rental Safety Check" })).toEqual([]);
  });
  it("karachi", () => {
    expect(assertPackReport("karachi_sale", { verdict: "DO NOT PROCEED", riskScore: 10, riskLabel: "CRITICAL", title: "Property Sale Safety Check", docTypes: ["AGREEMENT_TO_SELL"] })).toEqual([]);
  });
  it("islamabad rejects tenancy address leak", () => {
    const errs = assertPackReport("islamabad_sale", {
      verdict: "DO NOT PROCEED",
      riskScore: 10,
      title: "Property Sale Safety Check",
      factors: ["Page 2 contains the property address, whereas Page 1 omits the address"],
    });
    expect(errs.some((e) => /tenancy page-split/.test(e))).toBe(true);
  });
});

describe("schema + rules", () => {
  it("ScanFact marks missing money not_found", () => {
    const f = coerceToScanFact({ documentType: "TENANCY_AGREEMENT", smartFields: {}, ocrText: "" });
    expect(f.financials.monthly_rent.status).toBe("not_found");
    expect(f.schema_ok).toBe(true);
  });
  it("dues from OCR TOTAL OUTSTANDING", () => {
    const f = coerceToScanFact({ documentType: "CLEARANCE", ocrText: "TOTAL OUTSTANDING DUES: Rs. 480,000/-", smartFields: {} });
    expect(f.financials.outstanding_dues.amount).toBe(480000);
  });
  it("dedupes forfeiture", () => {
    const rows = dedupeByRuleId([
      { label: "One-sided forfeiture A" },
      { label: "One-sided forfeiture B" },
    ]);
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).rule_id).toBe("RISK_PREDATORY_FORFEITURE");
  });
  it("utf8 decodes latin1 mojibake", () => {
    const broken = Buffer.from("Ø§Ø­ØªÛŒØ§Ø·", "utf8").toString("latin1");
    expect(decodeUtf8(broken)).toBe("Ø§Ø­ØªÛŒØ§Ø·");
  });
  it("clip does not cut 100%", () => {
    const s = "If the Buyer fails, the entire token shall stand 100% immediately forfeited.";
    expect(clipSentence(s, 280)).toContain("100%");
  });
  it("stamp rule id", () => {
    expect(ruleIdFromText("stamp paper purchased after execution")).toBe("RISK_STAMP_AFTER_EXEC");
  });
});
