/**
 * Chain of Title — Session 5: Temporal Validation
 *
 * Encodes Pakistani legal timing rules as validation checks.
 */

import type { ChainDocumentInput, OwnershipEvent } from "./chain-of-title";

export type TemporalSeverity = "CRITICAL" | "HIGH" | "MEDIUM";

export type TemporalViolation = {
  ruleId: string;
  severity: TemporalSeverity;
  documentIds: string[];
  message: string;
  recommendation: string;
};

function iso(d: unknown): string | null {
  if (typeof d !== "string") return null;
  const m = d.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function monthsBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return (db.getTime() - da.getTime()) / (30.44 * 24 * 3600 * 1000);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return (db.getTime() - da.getTime()) / (24 * 3600 * 1000);
}

export function validateTemporalRules(
  timeline: OwnershipEvent[],
  documents: ChainDocumentInput[]
): TemporalViolation[] {
  const violations: TemporalViolation[] = [];

  for (const doc of documents) {
    const dates = doc.smartFields?.dates ?? {};
    const exec = iso(dates.execution_date);
    const reg = iso(dates.registration_date);
    const stamp = iso(dates.stamp_date || dates.stamp_paper_date);
    const mutation = iso(dates.mutation_date);
    const label = doc.fileName || doc.documentId;

    // Rule 2: Execution must precede registration
    if (exec && reg && exec > reg) {
      violations.push({
        ruleId: "EXEC_BEFORE_REG",
        severity: "HIGH",
        documentIds: [doc.documentId],
        message: `${label}: execution date (${exec}) is after registration date (${reg}) — chronologically impossible`,
        recommendation: "Verify dates on the original instrument with the Sub-Registrar.",
      });
    }

    // Rule 1: Registration Act 1908 — within 4 months
    if (exec && reg && exec <= reg) {
      const months = monthsBetween(exec, reg);
      if (months > 4) {
        violations.push({
          ruleId: "REG_ACT_1908_4MO",
          severity: "CRITICAL",
          documentIds: [doc.documentId],
          message: `${label}: executed ${exec} but registered ${reg} — exceeds the 4-month registration window under Registration Act 1908 (${months.toFixed(1)} months)`,
          recommendation: "Confirm whether a delay condonation order exists; otherwise the registration may be challengeable.",
        });
      }
    }

    // Rule 3: Stamp paper before execution
    if (stamp && exec) {
      if (stamp > exec) {
        violations.push({
          ruleId: "STAMP_BEFORE_EXEC",
          severity: "HIGH",
          documentIds: [doc.documentId],
          message: `${label}: stamp paper dated ${stamp} is after execution (${exec})`,
          recommendation: "Check stamp paper authenticity and issue date with the issuing treasury.",
        });
      } else if (monthsBetween(stamp, exec) > 6) {
        violations.push({
          ruleId: "STAMP_STALE",
          severity: "MEDIUM",
          documentIds: [doc.documentId],
          message: `${label}: stamp paper issued ${stamp}, executed ${exec} — gap of ${monthsBetween(stamp, exec).toFixed(1)} months (typical validity ~6 months)`,
          recommendation: "Confirm local stamp rules; some provinces treat long gaps as irregular.",
        });
      }
    }

    // Rule 4: Mutation after underlying transfer
    if (mutation && exec && mutation < exec) {
      violations.push({
        ruleId: "MUTATION_AFTER_TRANSFER",
        severity: "HIGH",
        documentIds: [doc.documentId],
        message: `${label}: mutation date (${mutation}) is before execution (${exec})`,
        recommendation: "Verify mutation entry against the registered instrument.",
      });
    }
  }

  // Rule 7: Bayana before Sale Deed
  const bayanas = documents.filter((d) => /AGREEMENT_TO_SELL|BAYANA/i.test(d.documentType));
  const sales = documents.filter((d) => /SALE_DEED|REGISTERED_SALE/i.test(d.documentType));
  for (const b of bayanas) {
    const bDate = iso(b.smartFields?.dates?.execution_date);
    if (!bDate) continue;
    for (const s of sales) {
      const sDate = iso(s.smartFields?.dates?.execution_date) || iso(s.smartFields?.dates?.registration_date);
      if (!sDate) continue;
      if (bDate > sDate) {
        violations.push({
          ruleId: "BAYANA_BEFORE_SALE",
          severity: "CRITICAL",
          documentIds: [b.documentId, s.documentId],
          message: `Bayana/Agreement dated ${bDate} is after Sale Deed dated ${sDate} — chronologically impossible for the same transaction`,
          recommendation: "Confirm both documents relate to the same property and check for date errors.",
        });
      }
    }
  }

  // Rule 8: Fard should post-date last transfer
  const fards = documents.filter((d) => /FARD|OWNERSHIP/i.test(d.documentType));
  const transferDocs = documents.filter((d) =>
    /SALE_DEED|MUTATION|GIFT|HIBA|INHERIT/i.test(d.documentType)
  );
  for (const f of fards) {
    const fDate = iso(f.smartFields?.dates?.issue_date) || iso(f.smartFields?.dates?.execution_date);
    if (!fDate) continue;
    for (const t of transferDocs) {
      const tDate =
        iso(t.smartFields?.dates?.registration_date) ||
        iso(t.smartFields?.dates?.mutation_date) ||
        iso(t.smartFields?.dates?.execution_date);
      if (!tDate) continue;
      if (fDate < tDate) {
        violations.push({
          ruleId: "FARD_AFTER_TRANSFER",
          severity: "MEDIUM",
          documentIds: [f.documentId, t.documentId],
          message: `Fard dated ${fDate} is earlier than transfer document dated ${tDate} — Fard may be outdated`,
          recommendation: "Request a fresh Fard issued after the latest mutation/sale.",
        });
      }
    }
  }

  // Rule 5: NEC period
  for (const doc of documents) {
    if (!/NON_ENCUMBRANCE|NEC/i.test(doc.documentType)) continue;
    const dates = doc.smartFields?.dates ?? {};
    const periodStart = iso(dates.period_start || dates.from_date);
    const periodEnd = iso(dates.period_end || dates.to_date);
    const issue = iso(dates.issue_date);
    if (periodStart && periodEnd && periodEnd < periodStart) {
      violations.push({
        ruleId: "NEC_PERIOD_ORDER",
        severity: "HIGH",
        documentIds: [doc.documentId],
        message: `NEC period end (${periodEnd}) is before period start (${periodStart})`,
        recommendation: "Verify the encumbrance search period on the original certificate.",
      });
    }
    if (issue && periodEnd && issue < periodEnd && daysBetween(issue, periodEnd) > 30) {
      violations.push({
        ruleId: "NEC_ISSUE_VS_PERIOD",
        severity: "MEDIUM",
        documentIds: [doc.documentId],
        message: `NEC issued ${issue} but covers period ending ${periodEnd} — confirm search is current`,
        recommendation: "Request an updated NEC covering up to the transaction date.",
      });
    }
  }

  // Mutation vs sale ordering on timeline
  const salesEv = timeline.filter((e) => e.eventType === "SALE");
  const mutEv = timeline.filter((e) => e.eventType === "MUTATION" || e.eventType === "GIFT");
  for (const s of salesEv) {
    if (!s.date) continue;
    for (const m of mutEv) {
      if (!m.date) continue;
      if (
        m.date < s.date &&
        s.transferee &&
        m.transferee &&
        s.transferee.entityId === m.transferee.entityId &&
        monthsBetween(m.date, s.date) > 1
      ) {
        violations.push({
          ruleId: "MUTATION_BEFORE_SALE",
          severity: "HIGH",
          documentIds: [s.documentId, m.documentId],
          message: `Mutation dated ${m.date} precedes Sale Deed dated ${s.date} for the same transferee`,
          recommendation: "Confirm document dating and whether mutation refers to an earlier transaction.",
        });
      }
    }
  }

  return violations;
}

export function temporalViolationsToRiskFactors(
  violations: TemporalViolation[]
): Array<{ label: string; points: number; category: "legal" }> {
  return violations.map((v) => ({
    label: v.message.slice(0, 180),
    points: v.severity === "CRITICAL" ? -3 : v.severity === "HIGH" ? -2 : -1,
    category: "legal" as const,
  }));
}
