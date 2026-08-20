import { describe, it, expect } from "vitest";
import {
  extractClauseConcerns,
  clauseConcernsToRiskFactors,
} from "../clause-concerns";

describe("extractClauseConcerns", () => {
  it("parses object suspicious_clauses", () => {
    const c = extractClauseConcerns({
      suspicious_clauses: [
        {
          quote: "earnest money shall be forfeited",
          concern: "One-sided forfeiture of deposit",
          severity: "critical",
        },
      ],
      clauses: { missing_standard_clauses: ["Possession date", "Indemnity"] },
    });
    expect(c.flagged).toHaveLength(1);
    expect(c.flagged[0].quote).toContain("forfeited");
    expect(c.missing).toEqual(["Possession date", "Indemnity"]);
  });

  it("parses string list", () => {
    const c = extractClauseConcerns({
      suspicious_clauses: ["Seller may terminate at sole discretion"],
    });
    expect(c.flagged.length).toBe(1);
  });

  it("caps risk deductions at 3.0 absolute", () => {
    const c = extractClauseConcerns({
      suspicious_clauses: [
        { quote: "a", concern: "forfeit deposit", severity: "critical" },
        { quote: "b", concern: "forfeit again", severity: "critical" },
        { quote: "c", concern: "forfeit third", severity: "critical" },
      ],
    });
    const factors = clauseConcernsToRiskFactors(c);
    const total = factors.reduce((s, f) => s + Math.abs(f.points), 0);
    expect(total).toBeLessThanOrEqual(3.0 + 1e-9);
    expect(factors.every((f) => f.category === "legal")).toBe(true);
  });
});
