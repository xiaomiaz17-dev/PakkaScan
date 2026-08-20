import { describe, it, expect, beforeEach } from "vitest";
import { buildOwnershipTimeline, chainFindingsToRiskFactors } from "../chain-of-title";
import { resetEntityCounter } from "../entity-resolver";

beforeEach(() => {
  resetEntityCounter();
});

describe("buildOwnershipTimeline", () => {
  it("handles empty input", () => {
    const r = buildOwnershipTimeline([]);
    expect(r.timeline).toEqual([]);
    expect(r.isComplete).toBe(false);
  });

  it("handles single document without error", () => {
    const r = buildOwnershipTimeline([
      {
        documentId: "d1",
        documentType: "REGISTERED_SALE_DEED",
        fileName: "sale.pdf",
        smartFields: {
          parties: {
            seller: { name: "Ali Khan", cnic: "42201-1111111-1" },
            buyer: { name: "Omar Sheikh", cnic: "42201-2222222-2" },
          },
          dates: { execution_date: "2020-03-15", registration_date: "2020-04-01" },
        },
      },
    ]);
    expect(r.timeline).toHaveLength(1);
    expect(r.timeline[0].eventType).toBe("SALE");
    expect(r.timeline[0].transferor?.canonicalName).toContain("Ali");
    expect(r.timeline[0].transferee?.canonicalName).toContain("Omar");
  });

  it("detects unexplained owner (Fard vs last transfer)", () => {
    const r = buildOwnershipTimeline([
      {
        documentId: "sale1",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: {
          parties: {
            seller: { name: "Ali Khan", cnic: "42201-1111111-1" },
            buyer: { name: "Omar Sheikh", cnic: "42201-2222222-2" },
          },
          dates: { registration_date: "2019-06-01" },
        },
      },
      {
        documentId: "fard1",
        documentType: "FARD_CURRENT_OWNERSHIP",
        smartFields: {
          parties: {
            owner: { name: "Zaid Ahmed", cnic: "42201-3333333-3" },
          },
          dates: { issue_date: "2024-01-15" },
        },
      },
    ]);
    expect(r.gaps.some((g) => g.kind === "UNEXPLAINED_OWNER")).toBe(true);
    expect(r.gaps.some((g) => g.severity === "CRITICAL")).toBe(true);
    expect(r.findings.length).toBeGreaterThan(0);
  });

  it("detects party mismatch across consecutive transfers", () => {
    const r = buildOwnershipTimeline([
      {
        documentId: "m1",
        documentType: "MUTATION_SALE",
        smartFields: {
          parties: {
            transferor: { name: "Ali Khan", cnic: "42201-1111111-1" },
            transferee: { name: "Omar Sheikh", cnic: "42201-2222222-2" },
          },
          dates: { mutation_date: "2015-01-01" },
        },
      },
      {
        documentId: "m2",
        documentType: "MUTATION_SALE",
        smartFields: {
          parties: {
            // Different person selling — chain break
            transferor: { name: "Someone Else", cnic: "42201-9999999-9" },
            transferee: { name: "Buyer Two", cnic: "42201-8888888-8" },
          },
          dates: { mutation_date: "2018-01-01" },
        },
      },
    ]);
    expect(r.conflicts.some((c) => c.kind === "PARTY_MISMATCH")).toBe(true);
  });

  it("detects chronological gap > 2 years", () => {
    const r = buildOwnershipTimeline([
      {
        documentId: "d1",
        documentType: "MUTATION_SALE",
        smartFields: {
          parties: {
            transferor: { name: "A", cnic: "42201-1111111-1" },
            transferee: { name: "B", cnic: "42201-2222222-2" },
          },
          dates: { mutation_date: "2010-01-01" },
        },
      },
      {
        documentId: "d2",
        documentType: "MUTATION_SALE",
        smartFields: {
          parties: {
            transferor: { name: "B", cnic: "42201-2222222-2" },
            transferee: { name: "C", cnic: "42201-3333333-3" },
          },
          dates: { mutation_date: "2018-01-01" },
        },
      },
    ]);
    expect(r.gaps.some((g) => g.kind === "CHRONOLOGICAL_GAP")).toBe(true);
  });

  it("detects Bayana after Sale Deed", () => {
    const r = buildOwnershipTimeline([
      {
        documentId: "sale",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: {
          parties: {
            seller: { name: "A", cnic: "42201-1111111-1" },
            buyer: { name: "B", cnic: "42201-2222222-2" },
          },
          dates: { execution_date: "2020-01-01" },
        },
      },
      {
        documentId: "bayana",
        documentType: "AGREEMENT_TO_SELL",
        smartFields: {
          parties: {
            seller: { name: "A", cnic: "42201-1111111-1" },
            buyer: { name: "B", cnic: "42201-2222222-2" },
          },
          dates: { execution_date: "2020-06-01" },
        },
      },
    ]);
    expect(r.conflicts.some((c) => c.kind === "DATE_ORDER" && c.message.includes("Bayana"))).toBe(true);
  });

  it("flags sale without mutation as missing link", () => {
    const r = buildOwnershipTimeline([
      {
        documentId: "sale",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: {
          parties: {
            seller: { name: "A", cnic: "42201-1111111-1" },
            buyer: { name: "B", cnic: "42201-2222222-2" },
          },
          dates: { registration_date: "2021-05-01" },
        },
      },
    ]);
    expect(r.gaps.some((g) => g.kind === "MISSING_LINK")).toBe(true);
  });

  it("produces risk factors from findings", () => {
    const r = buildOwnershipTimeline([
      {
        documentId: "sale",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: {
          parties: {
            seller: { name: "A", cnic: "42201-1111111-1" },
            buyer: { name: "B", cnic: "42201-2222222-2" },
          },
          dates: { registration_date: "2021-05-01" },
        },
      },
      {
        documentId: "fard",
        documentType: "FARD_CURRENT_OWNERSHIP",
        smartFields: {
          parties: { owner: { name: "Z", cnic: "42201-9999999-9" } },
          dates: { issue_date: "2024-01-01" },
        },
      },
    ]);
    const factors = chainFindingsToRiskFactors(r);
    expect(factors.length).toBeGreaterThan(0);
    expect(factors.every((f) => f.category === "legal")).toBe(true);
    expect(factors.some((f) => f.points <= -2)).toBe(true);
  });

  it("resolves same person across docs via CNIC", () => {
    const r = buildOwnershipTimeline([
      {
        documentId: "sale",
        documentType: "REGISTERED_SALE_DEED",
        smartFields: {
          parties: {
            seller: { name: "Muhammad Tariq", cnic: "42201-1234567-1" },
            buyer: { name: "Omar", cnic: "42201-2222222-2" },
          },
          dates: { registration_date: "2018-01-01" },
        },
      },
      {
        documentId: "mut",
        documentType: "MUTATION_SALE",
        smartFields: {
          parties: {
            transferor: { name: "M. Tariq", cnic: "42201-1234567-1" },
            transferee: { name: "Omar Sheikh", cnic: "42201-2222222-2" },
          },
          dates: { mutation_date: "2018-02-01" },
        },
      },
    ]);
    // Seller/transferor should be same entity
    const sale = r.timeline.find((e) => e.documentId === "sale");
    const mut = r.timeline.find((e) => e.documentId === "mut");
    expect(sale?.transferor?.entityId).toBe(mut?.transferor?.entityId);
    expect(sale?.transferee?.entityId).toBe(mut?.transferee?.entityId);
  });
});
