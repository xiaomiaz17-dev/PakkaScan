import type { Evidence, Finding, Rule } from "../domain/models";
export type CategoryScores = Record<Rule["category"], number>;
const categories: Rule["category"][] = ["OWNERSHIP", "IDENTITY", "ENCUMBRANCE", "AUTHORITY", "COMPLETENESS", "JURISDICTION"];
export function calculateCategoryScores(findings: Finding[]): CategoryScores {
  const scores = Object.fromEntries(categories.map((category) => [category, 100])) as CategoryScores;
  for (const finding of findings) {
    scores[finding.category] = Math.max(0, scores[finding.category] + finding.scoreImpact);
    if (finding.scoreCap !== undefined) scores[finding.category] = Math.min(scores[finding.category], finding.scoreCap);
  }
  return scores;
}
export function calculateTrustScore(input: { evidence: Evidence[]; findings: Finding[]; requiredDocumentCoverage: number }): number {
  if (!input.evidence.length) return 0;
  const confidence = input.evidence.reduce((sum, item) => sum + item.confidence, 0) / input.evidence.length;
  const provenance = input.evidence.filter((item) => item.documentId && item.page !== undefined).length / input.evidence.length;
  const materialIssues = input.findings.filter((item) => ["SCORE_CAP", "BLOCKER", "INCONCLUSIVE"].includes(item.effect)).length;
  return Math.max(0, Math.min(100, Math.round((confidence * 0.45 + provenance * 0.2 + input.requiredDocumentCoverage * 0.35 - materialIssues * 0.06) * 100)));
}
