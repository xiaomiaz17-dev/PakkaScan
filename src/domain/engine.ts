import type { AnalysisResult, Finding, Jurisdiction, Observation, Rule } from "./models";
import { RULES } from "./rules";

const severityRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as const;

export function evaluateObservations(
  observations: Observation[],
  jurisdiction: Jurisdiction,
  rules: Rule[] = RULES
): AnalysisResult {
  const findings: Finding[] = [];

  for (const observation of observations) {
    const matched = rules.filter(
      (rule) =>
        rule.enabled &&
        rule.observationCode === observation.code &&
        observation.confidence >= rule.minimumConfidence &&
        (rule.jurisdiction === "ANY" || rule.jurisdiction === jurisdiction)
    );

    for (const rule of matched) {
      findings.push({
        ruleCode: rule.code,
        category: rule.category,
        title: rule.name,
        description: observation.description,
        severity: rule.severity,
        effect: rule.effect,
        confidence: observation.confidence,
        scoreImpact: rule.scoreImpact ?? 0,
        scoreCap: rule.scoreCap,
        evidenceIds: observation.evidenceIds,
        recommendation: rule.recommendation,
        legalSources: rule.legalSources
      });
    }
  }

  findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  const confidenceScore = observations.length === 0
    ? 0
    : Math.round((observations.reduce((sum, item) => sum + item.confidence, 0) / observations.length) * 100);

  const hasInconclusive = findings.some((finding) => finding.effect === "INCONCLUSIVE");
  const blockers = findings.filter((finding) => finding.effect === "BLOCKER").length;

  let score = 100;
  for (const finding of findings) score += finding.scoreImpact;
  for (const finding of findings) {
    if (finding.scoreCap !== undefined) score = Math.min(score, finding.scoreCap);
  }
  score = Math.max(0, Math.min(100, score));

  const pakkaScore = hasInconclusive && blockers === 0 ? null : score;
  let decision: AnalysisResult["decision"];
  if (blockers > 0) decision = "DO_NOT_PROCEED";
  else if (pakkaScore === null) decision = "INCONCLUSIVE";
  else if (pakkaScore < 40) decision = "DO_NOT_PROCEED";
  else if (pakkaScore < 60) decision = "LEGAL_REVIEW_REQUIRED";
  else if (pakkaScore < 80) decision = "PROCEED_WITH_CAUTION";
  else decision = "PROCEED";

  return { pakkaScore, confidenceScore, decision, blockers, findings };
}
