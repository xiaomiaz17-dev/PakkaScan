import { describe, it, expect } from "vitest";
import { validateTemporalRules, temporalViolationsToRiskFactors } from "../temporal-validator";
import type { ChainDocumentInput } from "../chain-of-title";

describe("validateTemporalRules", () => {
  it("flags registration beyond 4 months", () => {
    const docs: ChainDocumentInput[] = [
      {
        documentId: "d1",
        documentType: "REGISTERED_SALE_DEED",
        fileName: "sale.pdf",
        smartFields: {
          dates: { execution_date: "2020-01-15", registration_date: "2020-08-20" },
        },
      },
    ];
    const v = validateTemporalRules([], docs);
    expect(v.some((x) => x.ruleId === "REG_ACT_1908_4MO")).toBe(true);
    expect(v.find((x) => x.ruleId === "REG_ACT_1908_4MO")?.severity).toBe("CRITICAL");
  });

  it("flags execution after registration", () => {
    const docs: ChainDocumentInput[] = [
      {
        documentId: "d1",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: {
          dates: { execution_date: "2020-06-01", registration_date: "2020-01-01" },
        },
      },
    ];
    const v = validateTemporalRules([], docs);
    expect(v.some((x) => x.ruleId === "EXEC_BEFORE_REG")).toBe(true);
  });

  it("flags Bayana after Sale Deed", () => {
    const docs: ChainDocumentInput[] = [
      {
        documentId: "sale",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: { dates: { execution_date: "2020-01-01" } },
      },
      {
        documentId: "bayana",
        documentType: "AGREEMENT_TO_SELL",
        smartFields: { dates: { execution_date: "2020-06-01" } },
      },
    ];
    const v = validateTemporalRules([], docs);
    expect(v.some((x) => x.ruleId === "BAYANA_BEFORE_SALE")).toBe(true);
  });

  it("flags outdated Fard", () => {
    const docs: ChainDocumentInput[] = [
      {
        documentId: "sale",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: { dates: { registration_date: "2022-01-01" } },
      },
      {
        documentId: "fard",
        documentType: "FARD_CURRENT_OWNERSHIP",
        smartFields: { dates: { issue_date: "2020-01-01" } },
      },
    ];
    const v = validateTemporalRules([], docs);
    expect(v.some((x) => x.ruleId === "FARD_AFTER_TRANSFER")).toBe(true);
  });

  it("maps violations to risk factors", () => {
    const docs: ChainDocumentInput[] = [
      {
        documentId: "d1",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: {
          dates: { execution_date: "2020-01-15", registration_date: "2020-08-20" },
        },
      },
    ];
    const v = validateTemporalRules([], docs);
    const factors = temporalViolationsToRiskFactors(v);
    expect(factors.length).toBeGreaterThan(0);
    expect(factors[0].category).toBe("legal");
    expect(factors[0].points).toBeLessThan(0);
  });

  it("returns empty for clean dates", () => {
    const docs: ChainDocumentInput[] = [
      {
        documentId: "d1",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: {
          dates: { execution_date: "2020-01-15", registration_date: "2020-02-01" },
        },
      },
    ];
    const v = validateTemporalRules([], docs);
    expect(v.filter((x) => x.ruleId === "REG_ACT_1908_4MO")).toHaveLength(0);
  });

  it("smoke: registration 8 months after execution is CRITICAL", () => {
    const docs = [
      {
        documentId: "late-reg",
        documentType: "REGISTERED_SALE_DEED",
        fileName: "late-sale.pdf",
        smartFields: {
          dates: {
            execution_date: "2019-01-10",
            registration_date: "2019-09-20",
          },
        },
      },
    ];
    const v = validateTemporalRules([], docs as any);
    const hit = v.find((x) => x.ruleId === "REG_ACT_1908_4MO");
    expect(hit).toBeTruthy();
    expect(hit!.severity).toBe("CRITICAL");
    expect(hit!.message).toMatch(/4-month/i);
  });
});
