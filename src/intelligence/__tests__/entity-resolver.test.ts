import { describe, it, expect, beforeEach } from "vitest";
import {
  normaliseName,
  normaliseCnic,
  matchNames,
  resolveEntities,
  resetEntityCounter,
  partiesFromSmartFields,
  type PartyInput,
} from "../entity-resolver";

beforeEach(() => {
  resetEntityCounter();
});

describe("normaliseName", () => {
  it("normalises Muhammad variants", () => {
    expect(normaliseName("Muhammad Tariq")).toBe("muhammad tariq");
    expect(normaliseName("Mohammad Tariq")).toBe("muhammad tariq");
    expect(normaliseName("Mohd Tariq")).toBe("muhammad tariq");
    expect(normaliseName("M. Tariq")).toBe("muhammad tariq");
  });

  it("strips S/O clauses", () => {
    expect(normaliseName("Muhammad Tariq S/O Ahmed")).toBe("muhammad tariq");
    expect(normaliseName("M. Tariq s/o Ahmad")).toBe("muhammad tariq");
  });

  it("normalises Ahmed/Ahmad and Rahman variants", () => {
    expect(normaliseName("Ahmed")).toBe("ahmad");
    expect(normaliseName("Ahmad")).toBe("ahmad");
    expect(normaliseName("Abdul Ur Rahman")).toBe("abdul ur rahman");
    expect(normaliseName("Abdul Ur-Rehman")).toBe("abdul ur rahman");
  });

  it("strips honorifics and CNIC fragments", () => {
    expect(normaliseName("Mr. Muhammad Tariq")).toBe("muhammad tariq");
    expect(normaliseName("Muhammad Tariq (CNIC 42201-1234567-1)")).toBe("muhammad tariq");
  });
});

describe("matchNames", () => {
  it("exact match after normalisation", () => {
    const r = matchNames("Muhammad Tariq S/O Ahmed", "M. Tariq s/o Ahmad");
    expect(r.match).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("does NOT match Tariq vs Tariqeen", () => {
    const r = matchNames("Muhammad Tariq", "Muhammad Tariqeen");
    expect(r.match).toBe(false);
  });

  it("token-set match (order independent)", () => {
    const r = matchNames("Tariq Muhammad", "Muhammad Tariq");
    expect(r.match).toBe(true);
  });

  it("subset match for abbreviated form", () => {
    const r = matchNames("Muhammad Tariq Khan", "Tariq Khan");
    expect(r.match).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("father name boosts fuzzy match", () => {
    const r = matchNames("Muhamad Tariq", "Muhammad Tareeq", {
      fatherNameA: "Ahmed Ali",
      fatherNameB: "Ahmad Ali",
    });
    expect(r.match).toBe(true);
  });
});

describe("normaliseCnic", () => {
  it("accepts dashed and plain forms", () => {
    expect(normaliseCnic("42201-1234567-1")).toBe("4220112345671");
    expect(normaliseCnic("4220112345671")).toBe("4220112345671");
  });

  it("rejects invalid lengths", () => {
    expect(normaliseCnic("12345")).toBeNull();
    expect(normaliseCnic(null)).toBeNull();
  });
});

describe("resolveEntities", () => {
  it("groups by identical CNIC even when names differ", () => {
    const parties: PartyInput[] = [
      { name: "Muhammad Tariq", cnic: "42201-1234567-1", role: "seller" },
      { name: "M. Tariq", cnic: "42201-1234567-1", role: "owner" },
    ];
    const groups = resolveEntities(parties);
    expect(groups).toHaveLength(1);
    expect(groups[0].cnic).toBe("4220112345671");
    expect(groups[0].members).toHaveLength(2);
    expect(groups[0].confidence).toBe(1);
  });

  it("does NOT merge different CNICs even with same name", () => {
    const parties: PartyInput[] = [
      { name: "Muhammad Tariq", cnic: "42201-1111111-1", role: "seller" },
      { name: "Muhammad Tariq", cnic: "42201-2222222-2", role: "buyer" },
    ];
    const groups = resolveEntities(parties);
    expect(groups).toHaveLength(2);
  });

  it("fuzzy-merges when no CNIC and names match", () => {
    const parties: PartyInput[] = [
      { name: "Muhammad Tariq S/O Ahmed", role: "seller", documentId: "doc1" },
      { name: "M. Tariq s/o Ahmad", role: "owner", documentId: "doc2" },
    ];
    const groups = resolveEntities(parties);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(2);
  });

  it("keeps Tariq and Tariqeen separate", () => {
    const parties: PartyInput[] = [
      { name: "Muhammad Tariq", role: "seller" },
      { name: "Muhammad Tariqeen", role: "buyer" },
    ];
    const groups = resolveEntities(parties);
    expect(groups).toHaveLength(2);
  });

  it("handles empty / malformed input", () => {
    expect(resolveEntities([])).toEqual([]);
    expect(resolveEntities([{ name: "" } as any])).toEqual([]);
    expect(resolveEntities(null as any)).toEqual([]);
  });

  it("warns when same CNIC has divergent names", () => {
    const parties: PartyInput[] = [
      { name: "Ali Khan", cnic: "35201-9999999-9", role: "seller" },
      { name: "Completely Different", cnic: "35201-9999999-9", role: "owner" },
    ];
    const groups = resolveEntities(parties);
    expect(groups).toHaveLength(1);
    expect(groups[0].warnings.length).toBeGreaterThan(0);
  });

  it("attaches CNIC-less party to CNIC group via name match", () => {
    const parties: PartyInput[] = [
      { name: "Muhammad Tariq", cnic: "42201-1234567-1", role: "seller" },
      { name: "M. Tariq", role: "witness" }, // no CNIC
    ];
    const groups = resolveEntities(parties);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toHaveLength(2);
    expect(groups[0].cnic).toBe("4220112345671");
  });
});

describe("partiesFromSmartFields", () => {
  it("extracts seller and buyer", () => {
    const sf = {
      parties: {
        seller: { name: "Ali", cnic: "42201-1111111-1", father_name: "Hassan" },
        buyer: { name: "Omar", cnic: "42201-2222222-2" },
        witnesses: [{ name: "Zaid" }],
      },
    };
    const parties = partiesFromSmartFields(sf, { documentId: "d1", documentType: "SALE" });
    expect(parties.length).toBe(3);
    expect(parties.find((p) => p.role === "seller")?.fatherName).toBe("Hassan");
  });
});
