/**
 * Urdu Translator.
 *
 * Translates short English strings (verdicts, summaries, headlines)
 * to Pakistani Urdu using Gemini. Optimised for cost - uses the cheapest
 * available model and batches multiple strings into a single call when possible.
 *
 * Level 1 scope: verdict labels, verdict headlines, AI summaries, cross-doc
 * overall assessments. Level 2+ (full report translation) is deferred.
 */

import { GoogleGenAI } from "@google/genai";
import { cacheGet, cacheSet } from "./llm-cache";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL = "gemini-flash-lite-latest";

const RULES = `You are a professional Urdu translator specialising in Pakistani legal and property contexts.

TRANSLATE these English strings to natural, everyday Pakistani Urdu (Nastaliq script, not Roman Urdu, not Indian Hindi-influenced Urdu).

RULES:
1. Use conversational, everyday Pakistani Urdu that a normal person (not a lawyer) would understand.
2. Preserve numbers, CNIC values, currency amounts, and dates EXACTLY as they appear in English. Do not translate or transliterate them.
3. Keep proper nouns (person names, place names) in their original form.
4. Legal/property terms should use their common Urdu forms (e.g. Bayana, Fard, Mutation, Sub-Registrar).
5. Return ONLY a JSON object mapping each input key to its Urdu translation.
6. Do not add commentary, explanation, or markdown.
`;

/**
 * Translate a map of English strings to Urdu in a single LLM call.
 *
 * @param strings Object mapping arbitrary keys to English strings.
 *                Empty/null values are skipped.
 * @returns Same-shaped object with Urdu translations. Failed keys are omitted.
 */
export async function translateToUrdu(
  strings: Record<string, string | null | undefined>
): Promise<Record<string, string>> {
  if (!genAI) return {};

  // Filter out empty entries
  const nonEmpty: Record<string, string> = {};
  for (const [k, v] of Object.entries(strings)) {
    if (typeof v === "string" && v.trim().length > 0) {
      nonEmpty[k] = v.trim();
    }
  }

  if (Object.keys(nonEmpty).length === 0) return {};

  // Cache check - key is a stable fingerprint of the non-empty input map
  const cacheKey = JSON.stringify(nonEmpty);
  const cached = cacheGet<Record<string, string>>("urdu", cacheKey);
  if (cached) {
    console.log("[urdu] (cache HIT) " + Object.keys(cached).length + " string(s)");
    return cached;
  }

  const prompt = `${RULES}

INPUT (JSON):
${JSON.stringify(nonEmpty, null, 2)}

RESPONSE FORMAT: Return a JSON object with the same keys, each value being the Urdu translation.`;

  try {
    const response = await genAI.models.generateContent({
      model: MODEL,
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
      console.warn("[urdu] Non-JSON response. First 200:", cleaned.slice(0, 200));
      return {};
    }

    if (!parsed || typeof parsed !== "object") {
      console.warn("[urdu] Response was not an object");
      return {};
    }

    // Sanitize: only keep string values that look like Urdu text
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim().length > 0) {
        result[k] = v.trim();
      }
    }

    cacheSet("urdu", result, cacheKey);
    console.log(`[urdu] Translated ${Object.keys(result).length}/${Object.keys(nonEmpty).length} string(s)`);
    return result;
  } catch (err: any) {
    console.warn("[urdu] Translation failed:", err?.message || err);
    return {};
  }
}

/**
 * Simple verdict-label translation lookup.
 * These are used often, deterministic, and don't need an LLM call.
 * Returns null if the label isn't a known verdict.
 */
export function urduVerdictLabel(englishLabel: string): string | null {
  const lookup: Record<string, string> = {
    "PROCEED": "??? ?????",
    "PROCEED WITH CAUTION": "?????? ?? ??? ?????",
    "DO NOT PROCEED": "??? ?? ?????",
    "BLANK OR TEMPLATE": "???? ?? ?????",
    "INCOMPLETE DOCUMENT": "?????? ???????",
  };
  return lookup[englishLabel.toUpperCase()] || null;
}
