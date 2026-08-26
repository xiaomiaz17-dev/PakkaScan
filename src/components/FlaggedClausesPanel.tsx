"use client";

import type { FlaggedClause } from "@/intelligence/clause-concerns";
import { formatClauseWhatsAppText } from "@/intelligence/clause-concerns";

const SEV: Record<string, { bg: string; border: string; text: string; label: string }> = {
  critical: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", label: "CRITICAL" },
  high: { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412", label: "HIGH" },
  medium: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", label: "MEDIUM" },
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function FlaggedClausesPanel({
  flagged,
  missing,
  referenceCode,
  saleContext,
}: {
  flagged?: FlaggedClause[] | null;
  missing?: string[] | null;
  referenceCode?: string | null;
  /** True when pack has bayana/sale price/token — suppress tenancy-only missing items */
  saleContext?: boolean;
}) {
  const RENTAL_ONLY = /consideration amount|payment schedule|security deposit clause|rent (increase|enhancement)|notice period|inventory list/i;
  const filteredMissing = (Array.isArray(missing) ? missing : []).filter((m) => {
    if (!saleContext) return true;
    return !RENTAL_ONLY.test(String(m));
  });
  const hasFlagged = Array.isArray(flagged) && flagged.length > 0;
  const hasMissing = filteredMissing.length > 0;
  if (!hasFlagged && !hasMissing) return null;

  return (
    <div style={{ marginTop: 16, marginBottom: 12 }}>
      {hasFlagged && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fff",
            marginBottom: hasMissing ? 12 : 0,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#991b1b",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Flagged Clauses & Contract Concerns ({flagged!.length})
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.45 }}>
            These excerpts were flagged by AI as potentially unfair or risky. Confirm with a lawyer
            before paying or signing.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {flagged!.map((c, i) => {
              const colors = SEV[c.severity] || SEV.medium;
              return (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 13, color: colors.text }}>
                      {c.title || "Concerning clause"}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: colors.text }}>
                      {colors.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#0f172a",
                      fontStyle: "italic",
                      lineHeight: 1.45,
                      marginBottom: 6,
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.7)",
                      borderRadius: 6,
                      borderLeft: `3px solid ${colors.border}`,
                    }}
                  >
                    “{c.quote}”
                  </div>
                  <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.5, marginBottom: 8 }}>
                    <strong>Why it&apos;s concerning:</strong> {c.concern}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyText(
                        formatClauseWhatsAppText(c, referenceCode || undefined)
                      );
                      if (ok) {
                        const el = document.activeElement as HTMLButtonElement | null;
                        if (el) {
                          const prev = el.textContent;
                          el.textContent = "Copied!";
                          setTimeout(() => {
                            if (el) el.textContent = prev;
                          }, 1500);
                        }
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    Copy Concern for WhatsApp
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasMissing && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #fde68a",
            background: "#fffbeb",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#92400e",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Missing Standard Protections
          </div>
          <div style={{ fontSize: 12, color: "#78350f", marginBottom: 10, lineHeight: 1.45 }}>
            These common safeguards were not found in the document text. Their absence does not
            always mean danger — but you should ask for them or understand why they are missing.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#78350f", fontSize: 13, lineHeight: 1.65 }}>
            {filteredMissing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
