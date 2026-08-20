/**
 * PDF: prefer STACKED EN then UR (narrow page) to avoid clipping.
 * PassportData.urdu?: { verdict?, reasoning?, summary? }
 */
export type PassportUrdu = {
  verdict?: string | null;
  reasoning?: string | null;
  summary?: string | null;
};

export function pickPassportUrdu(
  map: Record<string, string> | null | undefined
): PassportUrdu {
  if (!map) return {};
  return {
    verdict: map.verdict || map.verdictHeadline || map.posture || null,
    reasoning: map.reasoning || map.verdictReasoning || map.combinedReasoning || null,
    summary: map.summary || map.documentSummary || null,
  };
}
