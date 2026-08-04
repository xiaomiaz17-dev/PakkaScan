/**
 * Phase 2 — plain-language explanation always bound to evidence IDs.
 */

import type { Finding } from "../domain/models";

export type ExplainedFinding = {
  ruleCode: string;
  title: string;
  plainLanguage: string;
  severity: Finding["severity"];
  effect: Finding["effect"];
  evidenceIds: string[];
  recommendation: string;
  disclaimer: string;
};

const DISCLAIMER = "Decision-support only — not legal advice. Ownership is never invented.";

export function explainFinding(finding: Finding): ExplainedFinding {
  const evidence =
    finding.evidenceIds.length > 0
      ? `This finding is linked to evidence records: ${finding.evidenceIds.join(", ")}.`
      : "This finding lacks linked evidence IDs and must not be treated as conclusive.";

  return {
    ruleCode: finding.ruleCode,
    title: finding.title,
    plainLanguage: `${finding.title}. ${evidence}`,
    severity: finding.severity,
    effect: finding.effect,
    evidenceIds: finding.evidenceIds,
    recommendation: finding.recommendation,
    disclaimer: DISCLAIMER,
  };
}

export function explainFindings(findings: Finding[]): ExplainedFinding[] {
  return findings.map(explainFinding);
}
