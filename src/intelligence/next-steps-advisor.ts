/**
 * Next-Steps Advisor.
 *
 * After extraction and verdict are computed, this asks Gemini to generate
 * 3-5 personalized, concrete action items the user should take.
 *
 * Uses the actual extracted facts (party names, amounts, property details)
 * so advice feels specific rather than generic.
 *
 * Anti-hallucination rules mirror the extractor:
 * - Never invent facts, laws, dates, or officials
 * - Only reference facts present in the extraction
 * - Never fabricate CNICs, phone numbers, or authority names
 */

import { GoogleGenAI } from "@google/genai";
import { cacheGet, cacheSet } from "./llm-cache";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];

export type NextStep = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
};

export type NextStepsResult = {
  steps: NextStep[];
  error?: string;
  model?: string;
};

const RULES = `You are a Pakistani property/legal advisor helping a regular person (not a lawyer) understand what to DO after a document has been analysed. Your job is to write 3 to 5 concrete, actionable next steps in plain English.

STRICT RULES:
1. Only reference facts from the extracted data provided. Do NOT invent people, dates, amounts, CNICs, plot numbers, laws, or authorities.
2. Address the user directly ("Ask the seller...", "Take a photo of...", "Visit the Sub-Registrar office...").
3. Each step should be one action the user can complete in a single sitting.
4. Prioritise steps by risk: highest-risk gaps first (e.g. missing seller identity before missing property tax receipt).
5. Reference specific document facts when available (e.g. "Verify the CNIC on record matches Mrs. Nusrat Parveen's actual CNIC" is better than "Verify the seller's identity").
6. If the verdict is PROCEED and no evidence is missing, focus on confirmation steps (e.g. "Keep a signed copy for your records").
7. If the verdict is DO_NOT_PROCEED, focus on halting the transaction and consulting a lawyer.
8. Be honest about limits: if a document type requires professional verification (e.g. NADRA CNIC check, land record cross-check with Patwari), say so.
9. Do not tell the user to "consult a lawyer" as a first step for every case - only when the situation genuinely requires legal expertise.
10. Return ONLY the JSON array, no commentary.

RESPONSE FORMAT:
[
  {
    "title": "Short action title (5-8 words)",
    "detail": "One or two sentences explaining what to do and why. Use extracted facts where possible.",
    "priority": "high" | "medium" | "low"
  }
]

Priorities:
- "high" = required before any money changes hands
- "medium" = important but not blocking
- "low" = nice-to-have or record-keeping`;

export async function generateNextSteps(input: {
  documentType: string;
  verdict: string;
  pakkaScore: number;
  extractedFacts: any;
  missingEvidence: string[];
  findings: string[];
}): Promise<NextStepsResult> {
  if (!genAI) {
    return { steps: [], error: "GEMINI_API_KEY not configured" };
  }

  // Cache check - key is a fingerprint of all inputs
  const cacheKey = JSON.stringify({
    documentType: input.documentType,
    verdict: input.verdict,
    pakkaScore: input.pakkaScore,
    extractedFacts: input.extractedFacts,
    missingEvidence: input.missingEvidence,
    findings: input.findings,
  });
  const cached = cacheGet<NextStepsResult>("next-steps", cacheKey);
  if (cached) {
    console.log("[next-steps] " + input.documentType + " (cache HIT)");
    return cached;
  }

  const factsBlock = JSON.stringify(input.extractedFacts, null, 2);
  const missingBlock = input.missingEvidence.length > 0
    ? input.missingEvidence.map((m, i) => `  ${i + 1}. ${m}`).join("\n")
    : "  (none)";
  const findingsBlock = input.findings.length > 0
    ? input.findings.map((f, i) => `  ${i + 1}. ${f}`).join("\n")
    : "  (none)";

  const prompt = `${RULES}

CONTEXT:
Document type: ${input.documentType}
Verdict: ${input.verdict}
PakkaScore: ${input.pakkaScore}/100

Extracted facts:
${factsBlock}

Missing evidence:
${missingBlock}

Findings:
${findingsBlock}

Generate 3 to 5 next steps for the user. Return ONLY the JSON array.`;

  for (const modelName of MODELS) {
    try {
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const raw = response.text || "";
      const cleaned = raw
        .replace(/^\s*```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        console.warn(`[next-steps] ${modelName} returned non-JSON. First 200:`, cleaned.slice(0, 200));
        continue;
      }

      if (!Array.isArray(parsed)) {
        console.warn(`[next-steps] ${modelName} did not return an array`);
        continue;
      }

      const steps: NextStep[] = parsed
        .filter((s: any) => s && typeof s.title === "string" && typeof s.detail === "string")
        .slice(0, 5)
        .map((s: any) => ({
          title: String(s.title).trim(),
          detail: String(s.detail).trim(),
          priority: ["high", "medium", "low"].includes(s.priority) ? s.priority : "medium",
        }));

      if (steps.length === 0) {
        console.warn(`[next-steps] ${modelName} returned empty step list`);
        continue;
      }

      const result: NextStepsResult = { steps, model: modelName };
      cacheSet("next-steps", result, cacheKey);
      console.log(`[next-steps] Generated ${steps.length} step(s) via ${modelName}`);
      return result;
    } catch (err: any) {
      console.warn(`[next-steps] ${modelName} failed:`, err?.message || err);
      continue;
    }
  }

  return { steps: [], error: "All next-steps models failed" };
}

/**
 * Fallback: convert missing evidence + findings into basic step objects
 * if the LLM advisor is unavailable. Used when API key missing or all models fail.
 */
export function fallbackNextSteps(
  missingEvidence: string[],
  findings: string[]
): NextStep[] {
  const steps: NextStep[] = [];

  for (const m of missingEvidence.slice(0, 3)) {
    steps.push({
      title: `Obtain: ${m.split(/[(.]/)[0].trim()}`,
      detail: m,
      priority: "high",
    });
  }
  for (const f of findings.slice(0, 2)) {
    steps.push({
      title: `Address finding`,
      detail: f,
      priority: "medium",
    });
  }
  if (steps.length === 0) {
    steps.push({
      title: "Keep a signed copy for your records",
      detail: "This document appears complete. Retain a signed copy for future reference.",
      priority: "low",
    });
  }
  return steps;
}
