/**
 * Phase 2 — AI assistant policy (evidence-first, no hallucination).
 */

export type AssistantMode = "explain_finding" | "summarise_report" | "next_steps";

export type AssistantRequest = {
  mode: AssistantMode;
  findingText?: string;
  reportSummary?: string;
  evidenceRefs?: string[];
};

export type AssistantResponse = {
  allowed: boolean;
  text: string;
  citations: string[];
  declinedReason?: string;
};

const DISCLAIMERS = "This is decision-support, not legal advice. Ownership is never invented.";

export function answerWithEvidence(req: AssistantRequest): AssistantResponse {
  const citations = req.evidenceRefs ?? [];
  if (req.mode === "explain_finding") {
    if (!req.findingText?.trim()) {
      return { allowed: false, text: "", citations: [], declinedReason: "MISSING_FINDING" };
    }
    if (citations.length === 0) {
      return { allowed: false, text: "", citations: [], declinedReason: "EVIDENCE_REQUIRED" };
    }
    return {
      allowed: true,
      citations,
      text: `Finding: ${req.findingText.trim()}\nLinked evidence: ${citations.join(", ")}\n${DISCLAIMERS}`,
    };
  }
  if (req.mode === "summarise_report") {
    if (!req.reportSummary?.trim()) {
      return { allowed: false, text: "", citations: [], declinedReason: "MISSING_REPORT" };
    }
    return {
      allowed: true,
      citations,
      text: `Summary based on issued report content only:\n${req.reportSummary.trim()}\n${DISCLAIMERS}`,
    };
  }
  return {
    allowed: true,
    citations,
    text: `Next steps: review missing documents, resolve review-queue items, then re-run analysis if evidence changes.\n${DISCLAIMERS}`,
  };
}
