import { createHash, randomUUID } from "node:crypto";
import type { Finding, Rule } from "../domain/models";
import type { ReturnTypeAnalysePropertyPack } from "./types";

export type ExecutiveReport = {
  id: string;
  verificationId: string;
  propertyId: string;
  passportId: string;
  version: number;
  createdAt: string;
  title: string;
  decision: string;
  pakkaScore: number | null;
  trustScore: number;
  confidenceScore: number;
  categoryScores: Record<Rule["category"], number>;
  executiveSummary: string[];
  criticalFindings: Finding[];
  recommendations: string[];
  missingEvidence: { code: string; label: string; critical: boolean }[];
  timeline: ReturnTypeAnalysePropertyPack["timeline"];
  evidenceAppendix: { id: string; documentId: string; field: string; value: string; confidence: number; page?: number }[];
  reportHash: string;
};

const decisionCopy: Record<string, string> = {
  PROCEED: "The supplied evidence supports proceeding, subject to normal professional verification.",
  PROCEED_WITH_CAUTION: "The transaction may proceed only after the listed conditions are resolved.",
  LEGAL_REVIEW_REQUIRED: "Material issues require legal review before commitment or payment.",
  DO_NOT_PROCEED: "One or more critical blockers were identified. Do not proceed until they are resolved and re-analysed.",
  INCONCLUSIVE: "The supplied evidence is insufficient for a reliable conclusion.",
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildExecutiveSummary(analysis: ReturnTypeAnalysePropertyPack): string[] {
  const lines = [decisionCopy[analysis.analysis.decision] ?? "The supplied evidence has been analysed."];
  const critical = analysis.analysis.findings.filter((item) => item.severity === "CRITICAL");
  const high = analysis.analysis.findings.filter((item) => item.severity === "HIGH");
  if (critical.length) lines.push(`${critical.length} critical finding${critical.length === 1 ? "" : "s"} require immediate resolution.`);
  else if (high.length) lines.push(`${high.length} high-severity finding${high.length === 1 ? "" : "s"} require verification.`);
  else lines.push("No critical or high-severity findings were triggered by the supplied evidence.");
  if (analysis.missingEvidence.length) lines.push(`${analysis.missingEvidence.length} required evidence item${analysis.missingEvidence.length === 1 ? " is" : "s are"} outstanding.`);
  if ((analysis.analysis.trustScore ?? 0) < 70) lines.push("Evidence quality or coverage is not yet strong enough for high-confidence reliance.");
  return lines;
}

export function generateExecutiveReport(input: {
  propertyId: string;
  passportId: string;
  analysis: ReturnTypeAnalysePropertyPack;
  version?: number;
  createdAt?: string;
}): ExecutiveReport {
  const id = randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const base = {
    id,
    verificationId: `PD-${createdAt.slice(0, 4)}-${id.replace(/-/g, "").slice(0, 12).toUpperCase()}`,
    propertyId: input.propertyId,
    passportId: input.passportId,
    version: input.version ?? 1,
    createdAt,
    title: "PakkaDeed Property Intelligence Report",
    decision: input.analysis.analysis.decision,
    pakkaScore: input.analysis.analysis.pakkaScore,
    trustScore: input.analysis.analysis.trustScore ?? 0,
    confidenceScore: input.analysis.analysis.confidenceScore,
    categoryScores: input.analysis.analysis.categoryScores ?? {
      OWNERSHIP: 100, IDENTITY: 100, ENCUMBRANCE: 100, AUTHORITY: 100, COMPLETENESS: 100, JURISDICTION: 100, DOCUMENT_INTEGRITY: 100,
    },
    executiveSummary: buildExecutiveSummary(input.analysis),
    criticalFindings: input.analysis.analysis.findings.filter((item) => item.severity === "CRITICAL" || item.severity === "HIGH"),
    recommendations: unique(input.analysis.analysis.findings.map((item) => item.recommendation)),
    missingEvidence: input.analysis.missingEvidence,
    timeline: input.analysis.timeline,
    evidenceAppendix: input.analysis.evidence.map((item) => ({ id: item.id, documentId: item.documentId, field: item.field, value: item.value, confidence: item.confidence, page: item.page })),
  };
  return { ...base, reportHash: hash(base) };
}

export function verifyExecutiveReport(report: ExecutiveReport): boolean {
  const { reportHash, ...base } = report;
  return hash(base) === reportHash;
}
