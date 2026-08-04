/**
 * Phase 2 — map analysis output into a customer report DTO (web).
 */

import type { AnalysisResult, Evidence, Jurisdiction } from "../domain/models";
import { runPhase2Analysis } from "./phase2-pipeline";
import { explainFindings } from "./explain-finding";

export type CustomerReportDTO = {
  verificationId: string;
  jurisdiction: Jurisdiction;
  pakkaScore: number | null;
  decision: AnalysisResult["decision"];
  posture: string;
  blockers: number;
  confidenceScore: number;
  findings: Array<{
    ruleCode: string;
    title: string;
    severity: string;
    effect: string;
    recommendation: string;
    evidenceIds: string[];
    plainLanguage: string;
  }>;
  missingEvidence: { code: string; label: string; critical: boolean }[];
  coverage: number;
  disclaimer: string;
};

export function buildCustomerReport(input: {
  verificationId: string;
  jurisdiction: Jurisdiction;
  evidence: Evidence[];
  rawTextHint?: string;
}): CustomerReportDTO {
  const out = runPhase2Analysis({
    evidence: input.evidence,
    jurisdiction: input.jurisdiction,
    rawTextHint: input.rawTextHint,
  });
  const explained = explainFindings(out.analysis.findings);

  return {
    verificationId: input.verificationId,
    jurisdiction: input.jurisdiction,
    pakkaScore: out.analysis.pakkaScore,
    decision: out.analysis.decision,
    posture: out.posture,
    blockers: out.analysis.blockers,
    confidenceScore: out.analysis.confidenceScore,
    findings: explained.map((e) => ({
      ruleCode: e.ruleCode,
      title: e.title,
      severity: e.severity,
      effect: e.effect,
      recommendation: e.recommendation,
      evidenceIds: e.evidenceIds,
      plainLanguage: e.plainLanguage,
    })),
    missingEvidence: out.missingEvidence.missing,
    coverage: out.missingEvidence.coverage,
    disclaimer: "Decision-support only — not legal advice. Ownership is never invented.",
  };
}
