/**
 * Cross-Document Analyzer.
 *
 * When a user uploads 2+ documents in one scan session, this compares
 * facts across all documents and produces human-readable cross-check findings:
 *
 * - Does the seller CNIC on the Bayana match the CNIC card?
 * - Does the owner name on the Fard match the seller on the Bayana?
 * - Do property addresses/plot numbers agree across documents?
 * - Are there any contradictions that warrant halting the transaction?
 *
 * Uses Gemini to interpret the extracted structured data and phrase
 * findings in plain English. Anti-hallucination rules mirror the extractor:
 * every claim must reference an actual extracted fact.
 */

import { GoogleGenAI } from "@google/genai";
import { cacheGet, cacheSet } from "./llm-cache";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];

export type CrossCheck = {
  category: "identity" | "ownership" | "property" | "financial" | "date" | "other";
  status: "match" | "mismatch" | "partial_match" | "unverifiable";
  finding: string;
  severity: "critical" | "warning" | "info";
};

export type CrossDocResult = {
  crossChecks: CrossCheck[];
  overallAssessment: string;
  hasCriticalMismatch: boolean;
  error?: string;
  model?: string;
};

export type DocumentInput = {
  fileName: string;
  documentType: string;
  smartFields: any;
};

const RULES = `You are a Pakistani property/legal analyst comparing facts across multiple documents in a single transaction.

YOUR JOB:
1. Compare the extracted structured facts from 2 or more documents.
2. Identify cross-checks: does key information agree or contradict between documents?
3. Return findings in strict JSON.

STRICT RULES:
1. Only reference facts explicitly present in the input JSON. NEVER invent facts, names, CNICs, amounts, or dates.
2. If a fact needed for a cross-check is missing from one of the documents, mark that check as "unverifiable" rather than guessing.
3. Focus on cross-checks that affect the safety of a real financial transaction:
   - IDENTITY: Do the same-role party CNICs/names match across documents?
   - OWNERSHIP: Does the seller/owner named in one document match another?
   - PROPERTY: Do property addresses, plot numbers, khasra/khewat references agree?
   - FINANCIAL: Do consideration amounts on related documents agree?
   - DATE: Are the document dates internally consistent (e.g. Bayana before Sale Deed)?
4. Be specific. Bad: "The parties match." Good: "The seller CNIC on the Bayana (35202-1234567-1) matches the CNIC on the uploaded CNIC card."
5. Severity guide:
   - "critical" = would materially harm the buyer/tenant if ignored (e.g. seller names don't match; property addresses disagree)
   - "warning" = should be verified but not necessarily a deal-breaker (e.g. address is partial match, or one date is missing)
   - "info" = confirms alignment or notes something the user should know
6. Return ONLY the JSON object.

RESPONSE FORMAT:
{
  "crossChecks": [
    {
      "category": "identity" | "ownership" | "property" | "financial" | "date" | "other",
      "status": "match" | "mismatch" | "partial_match" | "unverifiable",
      "finding": "One-sentence plain-English cross-check statement with specific values.",
      "severity": "critical" | "warning" | "info"
    }
  ],
  "overallAssessment": "One or two sentences summarising whether the documents tell a consistent story. Be honest: say if something is worrying.",
  "hasCriticalMismatch": true | false
}`;

export async function analyzeCrossDocuments(
  documents: DocumentInput[]
): Promise<CrossDocResult> {
  if (!genAI) {
    return {
      crossChecks: [],
      overallAssessment: "Cross-document analysis unavailable (Gemini not configured).",
      hasCriticalMismatch: false,
      error: "GEMINI_API_KEY not configured",
    };
  }

  if (!documents || documents.length < 2) {
    return {
      crossChecks: [],
      overallAssessment: "Cross-document analysis requires at least 2 documents.",
      hasCriticalMismatch: false,
    };
  }

  // Cache check - key is a stable fingerprint of the sorted document set
  // (order-independent so [A,B] and [B,A] both hit the same cache entry)
  const cacheKey = JSON.stringify(
    documents
      .map((d) => ({ documentType: d.documentType, smartFields: d.smartFields }))
      .sort((a, b) => a.documentType.localeCompare(b.documentType))
  );
  const cached = cacheGet<CrossDocResult>("cross-doc", cacheKey);
  if (cached) {
    console.log("[cross-doc] (cache HIT) " + cached.crossChecks.length + " check(s)");
    return cached;
  }

  // Build the input context for the LLM
  const docsBlock = documents.map((d, i) => {
    return `Document ${i + 1}: ${d.fileName}
Type: ${d.documentType}
Extracted facts:
${JSON.stringify(d.smartFields, null, 2)}
`;
  }).join("\n---\n");

  const prompt = `${RULES}

DOCUMENTS TO CROSS-CHECK:

${docsBlock}

Return ONLY the JSON object. Focus on findings that matter for transaction safety.`;

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
        console.warn(`[cross-doc] ${modelName} returned non-JSON. First 200:`, cleaned.slice(0, 200));
        continue;
      }

      if (!parsed || typeof parsed !== "object") {
        console.warn(`[cross-doc] ${modelName} returned non-object`);
        continue;
      }

      const crossChecks: CrossCheck[] = Array.isArray(parsed.crossChecks)
        ? parsed.crossChecks
            .filter((c: any) => c && typeof c.finding === "string")
            .map((c: any) => ({
              category: ["identity", "ownership", "property", "financial", "date", "other"].includes(c.category) ? c.category : "other",
              status: ["match", "mismatch", "partial_match", "unverifiable"].includes(c.status) ? c.status : "unverifiable",
              finding: String(c.finding).trim(),
              severity: ["critical", "warning", "info"].includes(c.severity) ? c.severity : "info",
            }))
        : [];

      const result: CrossDocResult = {
        crossChecks,
        overallAssessment: typeof parsed.overallAssessment === "string" ? parsed.overallAssessment.trim() : "",
        hasCriticalMismatch: Boolean(parsed.hasCriticalMismatch) || crossChecks.some(c => c.severity === "critical" && c.status === "mismatch"),
        model: modelName,
      };

      cacheSet("cross-doc", result, cacheKey);
      console.log(`[cross-doc] Generated ${crossChecks.length} cross-check(s) via ${modelName}. Critical mismatch: ${result.hasCriticalMismatch}`);
      return result;
    } catch (err: any) {
      console.warn(`[cross-doc] ${modelName} failed:`, err?.message || err);
      continue;
    }
  }

  return {
    crossChecks: [],
    overallAssessment: "Cross-document analysis failed. Individual documents may still contain useful information.",
    hasCriticalMismatch: false,
    error: "All cross-doc models failed",
  };
}

/**
 * Safety-first combined verdict:
 * If ANY document says DO_NOT_PROCEED (or STOP or REJECT), the combined
 * verdict is DO_NOT_PROCEED. Otherwise if any is PROCEED_WITH_CAUTION,
 * the combined is PROCEED_WITH_CAUTION. Otherwise PROCEED.
 *
 * Also: if crossDoc found a critical mismatch, force DO_NOT_PROCEED.
 */
export function computeCombinedVerdict(
  perDocumentVerdicts: string[],
  crossDocHasCriticalMismatch: boolean
): { verdict: string; posture: string; reasoning: string } {
  const stopSet = new Set(["DO_NOT_PROCEED", "STOP", "REJECT", "BLOCKED"]);
  const cautionSet = new Set(["PROCEED_WITH_CAUTION", "REVIEW", "NEEDS_REVIEW", "CAUTIOUS"]);

  if (crossDocHasCriticalMismatch) {
    return {
      verdict: "DO_NOT_PROCEED",
      posture: "DO_NOT_PROCEED",
      reasoning: "Cross-document analysis found a critical inconsistency between the documents you uploaded.",
    };
  }

  if (perDocumentVerdicts.some((v) => stopSet.has(v))) {
    return {
      verdict: "DO_NOT_PROCEED",
      posture: "DO_NOT_PROCEED",
      reasoning: "At least one document in this bundle has a serious issue.",
    };
  }

  if (perDocumentVerdicts.some((v) => cautionSet.has(v))) {
    return {
      verdict: "PROCEED_WITH_CAUTION",
      posture: "CAUTIOUS",
      reasoning: "At least one document has missing evidence or requires review before proceeding.",
    };
  }

  return {
    verdict: "PROCEED",
    posture: "CLEAR",
    reasoning: "All documents look clean and the cross-checks align.",
  };
}
