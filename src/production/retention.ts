export type RetentionClass = "TEMPORARY_UPLOAD" | "CUSTOMER_DOCUMENT" | "AUDIT_RECORD" | "ANONYMISED_FIXTURE";
export type RetentionDecision = { retainUntil?: string; deleteNow: boolean; reason: string };

const DAYS: Record<RetentionClass, number | null> = {
  TEMPORARY_UPLOAD: 1,
  CUSTOMER_DOCUMENT: 2555,
  AUDIT_RECORD: 2555,
  ANONYMISED_FIXTURE: null,
};

export function retentionDecision(kind: RetentionClass, createdAt: Date, now = new Date()): RetentionDecision {
  const days = DAYS[kind];
  if (days === null) return { deleteNow: false, reason: "Retained as anonymised regression fixture" };
  const retainUntil = new Date(createdAt.getTime() + days * 86400000);
  return {
    retainUntil: retainUntil.toISOString(),
    deleteNow: now.getTime() >= retainUntil.getTime(),
    reason: now.getTime() >= retainUntil.getTime() ? "Retention period expired" : "Within retention period",
  };
}
