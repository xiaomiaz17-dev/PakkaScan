/**
 * One plain-English sentence under the risk score for non-lawyers.
 */
function clipWords(s: string, n = 160): string {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const c = t.slice(0, n);
  const i = Math.max(c.lastIndexOf(" "), c.lastIndexOf(","), c.lastIndexOf(";"));
  return (i > n * 0.5 ? c.slice(0, i) : c).replace(/[.,;:]+$/, "") + ".";
}

export function plainEnglishRiskMeaning(
  riskScore: number | null | undefined,
  riskLabel: string | null | undefined,
  riskFactors?: Array<{ label: string; points?: number }> | null
): string {
  const score = typeof riskScore === "number" ? riskScore : 1;
  const label = (riskLabel || "").toUpperCase();
  const top = (riskFactors || [])
    .slice()
    .sort((a, b) => Math.abs(b.points || 0) - Math.abs(a.points || 0))[0];

  const topHint = top?.label
    ? ` Main driver: ${clipWords(top.label, 160)}.`
    : "";

  if (score <= 2 || label === "LOW") {
    return (
      "What this means: No major red flags stood out. Confidence is about how clearly we read the document; risk level is about deal concerns. Still verify identity before paying." +
      topHint
    );
  }
  if (score <= 4 || label === "MEDIUM") {
    return (
      "What this means: The verdict can still be PROCEED when there are no hard blockers. Risk level flags softer gaps — review the factors below and close them (IDs, formalities, or contract terms) with the other party or a lawyer before you rely on this paper." +
      topHint
    );
  }
  if (score <= 7 || label === "HIGH") {
    return (
      "What this means: Several material risks were found. Do not treat this as a green light — resolve the items below (or get legal advice) before transferring money or signing further." +
      topHint
    );
  }
  return (
    "What this means: Critical issues were detected. Pause the transaction until these are explained in writing and independently verified. A lawyer review is strongly recommended." +
    topHint
  );
}

/** Short Urdu companion (static; avoids extra LLM call). */

export function plainEnglishRiskMeaningUrdu(
  riskScore: number | null | undefined,
  riskLabel: string | null | undefined
): string {
  const score = typeof riskScore === "number" ? riskScore : 1;
  const label = (riskLabel || "").toUpperCase();
  if (score <= 2 || label === "LOW") {
    return "مطلب: دستاویزات میں بڑا خطرہ نظر نہیں آیا۔ ادائیگی سے پہلے شناختی کارڈ اور ملکیت ریکارڈ ضرور چیک کریں۔";
  }
  if (score <= 4 || label === "MEDIUM") {
    return "مطلب: کچھ مسائل توجہ مانگتے ہیں۔ نیچے دیے عوامل دیکھیں اور مکمل کرنے سے پہلے فریقِ مقابل یا وکیل سے بات کریں۔";
  }
  if (score <= 7 || label === "HIGH") {
    return "مطلب: اہم خطرات ملے ہیں۔ رقم بھیجنے یا مزید دستخط سے پہلے ان مسائل کا حل یا قانونی مشورہ لیں۔";
  }
  return "مطلب: سنگین مسائل سامنے آئے ہیں۔ لین دین روکیں جب تک تحریری وضاحت اور آزاد تصدیق نہ ہو۔ وکیل سے رجوع مضبوطی سے تجویز ہے۔";
}
