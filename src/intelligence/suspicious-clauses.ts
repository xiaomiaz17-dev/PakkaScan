/**
 * Session 9 — rule-based suspicious clause detector (OCR + smartFields).
 */
export type ClauseSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

export type SuspiciousClause = {
  id: string;
  severity: ClauseSeverity;
  title: string;
  message: string;
  points: number;
  evidence?: string;
};

export type SuspiciousClausesResult = {
  clauses: SuspiciousClause[];
  summary: string;
};

type Rule = {
  id: string;
  severity: ClauseSeverity;
  title: string;
  message: string;
  points: number;
  test: (text: string, smart: any) => string | null;
};

function snippet(text: string, idx: number, radius = 60): string {
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

const RULES: Rule[] = [
  {
    id: "FORFEITURE_ONE_SIDED",
    severity: "CRITICAL",
    title: "One-sided forfeiture",
    message:
      "The agreement allows the seller to keep the buyer's deposit if the deal falls through, without matching protection for the buyer.",
    points: 3,
    test: (t) => {
      const patterns = [
        /earnest\s+money.{0,40}(forfeit|forfeited|shall\s+be\s+forfeited)/i,
        /bayana.{0,40}(forfeit|confiscat)/i,
      /(?:100\s*%|full|entire|whole)\s+(?:of\s+)?(?:the\s+)?(?:token|bayana|earnest)/i,
      /(?:token|bayana|earnest).{0,40}(?:100\s*%|full|entire|non[-\s]?refundable)/i,
      /(?:100\s*%|full|entire|whole)\s+(?:of\s+)?(?:the\s+)?(?:token|bayana|earnest)/i,
      /(?:token|bayana|earnest).{0,40}(?:100\s*%|full|entire|non[-\s]?refundable)/i,
        /(advance|token).{0,30}(non[-\s]?refundable|shall\s+not\s+be\s+refunded)/i,
        /buyer.{0,40}(lose|forfeit).{0,30}(deposit|earnest|bayana|token)/i,
      ];
      for (const p of patterns) {
        const m = t.match(p);
        if (m && m.index != null) return snippet(t, m.index);
      }
      return null;
    },
  },
  {
    id: "POA_GENERAL_SCOPE",
    severity: "HIGH",
    title: "General / unlimited Power of Attorney",
    message:
      "A general Power of Attorney can let the attorney sell or mortgage without further consent. Prefer a special POA limited to this deal with a clear expiry.",
    points: 2,
    test: (t, smart) => {
      const flags = smart?.clauses?.poa_risk_flags;
      if (Array.isArray(flags) && flags.some((f: string) => /general|unlimited|irrevocable/i.test(String(f)))) {
        return String(flags.join(", "));
      }
      const scope = String(smart?.clauses?.scope || "").toUpperCase();
      if (scope.includes("GENERAL") || scope === "UNLIMITED") return `scope=${scope}`;
      if (/general\s+power\s+of\s+attorney|general\s+attorney/i.test(t)) {
        const m = t.match(/general\s+power\s+of\s+attorney|general\s+attorney/i);
        return m && m.index != null ? snippet(t, m.index) : "general POA language";
      }
      return null;
    },
  },
  {
    id: "POA_NO_EXPIRY",
    severity: "HIGH",
    title: "Power of Attorney with no expiry",
    message:
      "This POA does not state an end date. Open-ended POAs remain a fraud risk. Ask for a fixed expiry (e.g. 90 days).",
    points: 2,
    test: (t, smart) => {
      const flags = smart?.clauses?.poa_risk_flags;
      if (Array.isArray(flags) && flags.some((f: string) => /no.?expir|open.?ended|without.?expir/i.test(String(f)))) {
        return String(flags.join(", "));
      }
      const isPoa =
        /power\s+of\s+attorney|\bpoa\b/i.test(t) ||
        String(smart?.document_type || "").toUpperCase().includes("POA");
      if (!isPoa) return null;
      if (/expir(y|es|ation)|valid\s+(until|till)|for\s+a\s+period\s+of/i.test(t)) return null;
      return "POA text with no detectable expiry language";
    },
  },
  {
    id: "POA_UNREGISTERED",
    severity: "CRITICAL",
    title: "Unregistered Power of Attorney",
    message:
      "An unregistered POA is weak authority to sell in Pakistan. Insist on a registered POA or confirm registration with the Sub-Registrar.",
    points: 3,
    test: (t, smart) => {
      const flags = smart?.clauses?.poa_risk_flags;
      if (Array.isArray(flags) && flags.some((f: string) => /unregistered|not\s+registered/i.test(String(f)))) {
        return String(flags.join(", "));
      }
      if (/unregistered\s+(power\s+of\s+attorney|poa)|poa.{0,20}not\s+registered/i.test(t)) {
        const m = t.match(/unregistered\s+(power\s+of\s+attorney|poa)/i);
        return m && m.index != null ? snippet(t, m.index) : "unregistered POA";
      }
      return null;
    },
  },
  {
    id: "AS_IS_NO_WARRANTY",
    severity: "MEDIUM",
    title: '"As is" / no warranty on title',
    message:
      "The seller disclaims responsibility for title defects or encumbrances. You may have limited recourse if a third-party claim appears later.",
    points: 1,
    test: (t) => {
      const patterns = [
        /as\s*is\s*where\s*is/i,
        /without\s+any\s+warranty/i,
        /no\s+warranty\s+(as\s+to\s+)?title/i,
        /seller\s+shall\s+not\s+be\s+(liable|responsible).{0,40}(title|encumbrance)/i,
      ];
      for (const p of patterns) {
        const m = t.match(p);
        if (m && m.index != null) return snippet(t, m.index);
      }
      return null;
    },
  },
  {
    id: "INDEFINITE_POSSESSION",
    severity: "HIGH",
    title: "Vague or missing possession date",
    message:
      "Possession handover is not tied to a clear date or event. Lock a calendar date or fixed days after registration.",
    points: 2,
    test: (t) => {
      if (!/possession/i.test(t)) return null;
      if (/possession.{0,40}(within\s+\d+|on\s+or\s+before|dated?\s+\d)/i.test(t)) return null;
      if (/possession.{0,30}(as\s+and\s+when|mutually\s+agreed|to\s+be\s+decided)/i.test(t)) {
        const m = t.match(/possession.{0,30}(as\s+and\s+when|mutually\s+agreed|to\s+be\s+decided)/i);
        return m && m.index != null ? snippet(t, m.index) : "vague possession";
      }
      return null;
    },
  },
  {
    id: "BLANK_CONSIDERATION",
    severity: "CRITICAL",
    title: "Blank or missing sale price",
    message:
      "The consideration (sale price) appears blank or incomplete. Never sign or pay against a document with an empty price field.",
    points: 3,
    test: (t, smart) => {
      const fin = smart?.financials || {};
      const price = fin.total_price ?? fin.sale_price ?? fin.consideration ?? fin.amount;
      const n =
        typeof price === "number" ? price : price && typeof price === "object" ? price.amount : null;
      if (n === 0) return "consideration amount is 0";
      if (/consideration.{0,20}(rs\.?\s*[-—_]+|rupees\s*[-—_]+)/i.test(t)) {
        return "blank consideration field in text";
      }
      return null;
    },
  },
  {
    id: "ARBITRARY_TERMINATION",
    severity: "HIGH",
    title: "Seller-only termination right",
    message:
      "Only the seller can cancel the agreement. The buyer has little protection if the seller walks away after taking money.",
    points: 2,
    test: (t) => {
      const patterns = [
        /seller\s+(may|shall\s+have\s+the\s+right\s+to)\s+(terminate|cancel|rescind)/i,
        /vendor.{0,20}(absolute\s+right|sole\s+discretion).{0,30}(cancel|terminate)/i,
      ];
      for (const p of patterns) {
        const m = t.match(p);
        if (m && m.index != null) {
          if (/buyer.{0,40}(terminate|cancel)|either\s+party.{0,20}terminate/i.test(t)) return null;
          return snippet(t, m.index);
        }
      }
      return null;
    },
  },
];

export function detectSuspiciousClauses(input: {
  ocrText?: string | null;
  smartFields?: any;
}): SuspiciousClausesResult {
  const text = (input.ocrText || "").toLowerCase();
  const smart = input.smartFields || {};
  const clauses: SuspiciousClause[] = [];

  for (const rule of RULES) {
    try {
      const evidence = rule.test(text, smart);
      if (evidence) {
        clauses.push({
          id: rule.id,
          severity: rule.severity,
          title: rule.title,
          message: rule.message,
          points: rule.points,
          evidence: evidence.slice(0, 200),
        });
      }
    } catch {
      /* never break scan */
    }
  }

  const seen = new Set<string>();
  const unique = clauses.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const critical = unique.filter((c) => c.severity === "CRITICAL").length;
  const high = unique.filter((c) => c.severity === "HIGH").length;
  let summary = "No high-risk contract clauses detected in the uploaded text.";
  if (unique.length > 0) {
    summary = `Found ${unique.length} clause issue(s): ${critical} critical, ${high} high. Review each before paying or signing.`;
  }

  return { clauses: unique, summary };
}

export function suspiciousClausesToRiskFactors(
  result: SuspiciousClausesResult | null | undefined
): Array<{ label: string; points: number; category: "legal" }> {
  if (!result?.clauses?.length) return [];
  return result.clauses.map((c) => ({
    label: `${c.title}: ${c.message}`,
    points: -Math.abs(c.points),
    category: "legal" as const,
  }));
}
