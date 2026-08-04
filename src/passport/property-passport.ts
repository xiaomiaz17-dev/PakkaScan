import { createHash, randomUUID } from "node:crypto";
import type { ExecutiveReport } from "../reporting/executive-report";
import type { ReturnTypeAnalysePropertyPack } from "../reporting/types";

export type PassportReportEntry = {
  reportId: string;
  version: number;
  verificationId: string;
  decision: string;
  pakkaScore: number | null;
  trustScore: number;
  createdAt: string;
  reportHash: string;
};

export type PropertyPassport = {
  id: string;
  publicId: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
  currentDecision: string;
  currentPakkaScore: number | null;
  currentTrustScore: number;
  verificationStatus: "INCOMPLETE" | "ATTENTION_REQUIRED" | "REVIEW_REQUIRED" | "ELIGIBLE_FOR_VERIFICATION";
  reports: PassportReportEntry[];
  timeline: ReturnTypeAnalysePropertyPack["timeline"];
  missingEvidenceCodes: string[];
  passportHash: string;
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function status(report: ExecutiveReport): PropertyPassport["verificationStatus"] {
  if (report.decision === "DO_NOT_PROCEED") return "ATTENTION_REQUIRED";
  if (report.decision === "INCONCLUSIVE" || report.missingEvidence.length) return "INCOMPLETE";
  if (report.trustScore < 80) return "REVIEW_REQUIRED";
  return "ELIGIBLE_FOR_VERIFICATION";
}

export function createPropertyPassport(input: { propertyId: string; report: ExecutiveReport; analysis: ReturnTypeAnalysePropertyPack; createdAt?: string; passportId?: string }): PropertyPassport {
  const id = input.passportId ?? randomUUID();
  const createdAt = input.createdAt ?? input.report.createdAt;
  const base = {
    id,
    publicId: `PP-${createdAt.slice(0, 4)}-${id.replace(/-/g, "").slice(0, 10).toUpperCase()}`,
    propertyId: input.propertyId,
    createdAt,
    updatedAt: createdAt,
    currentDecision: input.report.decision,
    currentPakkaScore: input.report.pakkaScore,
    currentTrustScore: input.report.trustScore,
    verificationStatus: status(input.report),
    reports: [{ reportId: input.report.id, version: input.report.version, verificationId: input.report.verificationId, decision: input.report.decision, pakkaScore: input.report.pakkaScore, trustScore: input.report.trustScore, createdAt: input.report.createdAt, reportHash: input.report.reportHash }],
    timeline: input.analysis.timeline,
    missingEvidenceCodes: input.report.missingEvidence.map((item) => item.code),
  };
  return { ...base, passportHash: hash(base) };
}

export function updatePropertyPassport(passport: PropertyPassport, report: ExecutiveReport, analysis: ReturnTypeAnalysePropertyPack): PropertyPassport {
  if (report.propertyId !== passport.propertyId) throw new Error("REPORT_PROPERTY_MISMATCH");
  if (passport.reports.some((item) => item.reportId === report.id)) return passport;
  const base = {
    ...passport,
    updatedAt: report.createdAt,
    currentDecision: report.decision,
    currentPakkaScore: report.pakkaScore,
    currentTrustScore: report.trustScore,
    verificationStatus: status(report),
    reports: [...passport.reports, { reportId: report.id, version: report.version, verificationId: report.verificationId, decision: report.decision, pakkaScore: report.pakkaScore, trustScore: report.trustScore, createdAt: report.createdAt, reportHash: report.reportHash }].sort((a,b) => a.version - b.version),
    timeline: analysis.timeline,
    missingEvidenceCodes: report.missingEvidence.map((item) => item.code),
  };
  const { passportHash: _old, ...hashable } = base;
  return { ...hashable, passportHash: hash(hashable) };
}

export function verifyPropertyPassport(passport: PropertyPassport): boolean {
  const { passportHash, ...base } = passport;
  return hash(base) === passportHash;
}
