/**
 * Session 9 — normalise LLM-extracted suspicious / missing clauses
 * into UI rows + risk factors.
 *
 * Expected shapes (flexible):
 *   smartFields.suspicious_clauses: Array<
 *     string | { quote?: string; text?: string; concern?: string; reason?: string;
 *                why?: string; severity?: string; title?: string }
 *   >
 *   smartFields.clauses.missing_standard_clauses: string[]
 *   smartFields.missing_standard_clauses: string[]
 */

export type FlaggedClause = {
  quote: string;
  concern: string;
  severity: "critical" | "high" | "medium";
  title?: string;
};

export type ClauseConcerns = {
  flagged: FlaggedClause[];
  missing: string[];
};

function severityOf(raw: unknown, concern: string): FlaggedClause["severity"] {
  const s = String(raw || "").toLowerCase();
  if (s.includes("critical") || s.includes("severe")) return "critical";
  if (s.includes("high")) return "high";
  // heuristic from concern text
  const c = concern.toLowerCase();
  if (/forfeit|unregistered|blank|fraud|irrevocable/.test(c)) return "critical";
  if (/poa|power of attorney|termination|possession|warranty/.test(c)) return "high";
  return "medium";
}

function pointsFor(sev: FlaggedClause["severity"]): number {
  if (sev === "critical") return -2;
  if (sev === "high") return -1.5;
  return -1;
}

export function extractClauseConcerns(smartFields: any): ClauseConcerns {
  if (!smartFields || typeof smartFields !== "object") {
    return { flagged: [], missing: [] };
  }

  const rawList =
    smartFields.suspicious_clauses ??
    smartFields.clauses?.suspicious_clauses ??
    smartFields.legal?.suspicious_clauses ??
    [];

  const flagged: FlaggedClause[] = [];
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (item == null) continue;
      if (typeof item === "string" && item.trim()) {
        flagged.push({
          quote: item.trim().slice(0, 280),
          concern: "This wording may put the buyer at a disadvantage. Have a lawyer review before paying.",
          severity: severityOf(null, item),
        });
        continue;
      }
      if (typeof item === "object") {
        const quote = String(
          item.quote ?? item.text ?? item.clause ?? item.original ?? item.excerpt ?? ""
        ).trim();
        const concern = String(
          item.concern ?? item.reason ?? item.why ?? item.explanation ?? item.risk ?? ""
        ).trim();
        if (!quote && !concern) continue;
        flagged.push({
          quote: (quote || concern).slice(0, 280),
          concern:
            concern ||
            "This clause may reduce your protection. Confirm with a property lawyer before proceeding.",
          severity: severityOf(item.severity ?? item.level, concern || quote),
          title: item.title ? String(item.title).slice(0, 80) : undefined,
        });
      }
    }
  }

  const missingRaw =
    smartFields.clauses?.missing_standard_clauses ??
    smartFields.missing_standard_clauses ??
    smartFields.legal?.missing_standard_clauses ??
    [];
  const missing: string[] = [];
  if (Array.isArray(missingRaw)) {
    for (const m of missingRaw) {
      if (typeof m === "string" && m.trim()) missing.push(m.trim().slice(0, 200));
      else if (m && typeof m === "object" && (m.name || m.clause || m.label)) {
        missing.push(String(m.name || m.clause || m.label).trim().slice(0, 200));
      }
    }
  }

  // de-dupe flagged by quote
  const seen = new Set<string>();
  const uniqueFlagged = flagged.filter((f) => {
    const k = f.quote.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { flagged: uniqueFlagged, missing };
}

/**
 * Risk factors from suspicious clauses.
 * Cap total clause deductions at -3.0 (as absolute points contributed).
 */
export function clauseConcernsToRiskFactors(
  concerns: ClauseConcerns
): Array<{ label: string; points: number; category: string }> {
  if (!concerns.flagged.length && !concerns.missing.length) return [];

  const factors: Array<{ label: string; points: number; category: string }> = [];
  let budget = 3.0; // max absolute deduction from clauses

  for (const f of concerns.flagged) {
    if (budget <= 0) break;
    let pts = Math.abs(pointsFor(f.severity));
    pts = Math.min(pts, budget);
    budget -= pts;
    const label = f.title
      ? `Suspicious clause — ${f.title}: ${f.concern}`
      : `Suspicious clause: ${f.concern}`;
    factors.push({
      label: label.slice(0, 200),
      points: -pts,
      category: "legal",
    });
  }

  // Missing standard protections: mild, still under remaining budget
  if (concerns.missing.length > 0 && budget > 0) {
    const pts = Math.min(1.0, budget);
    factors.push({
      label: `Missing standard protections: ${concerns.missing.slice(0, 3).join("; ")}${
        concerns.missing.length > 3 ? "…" : ""
      }`,
      points: -pts,
      category: "legal",
    });
  }

  return factors;
}

export function formatClauseWhatsAppText(clause: FlaggedClause, referenceCode?: string): string {
  const lines = [
    "PakkaScan — Contract concern",
    referenceCode ? `Ref: ${referenceCode}` : null,
    "",
    clause.title ? `*${clause.title}*` : "*Flagged clause*",
    "",
    `Quote: "${clause.quote}"`,
    "",
    `Why it matters: ${clause.concern}`,
    "",
    "This is an AI assistive flag — confirm with a property lawyer before paying or signing.",
  ];
  return lines.filter((l) => l != null).join("\n");
}
