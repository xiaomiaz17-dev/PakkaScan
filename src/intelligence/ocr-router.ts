import { extractWithLocalOcr, type LocalOcrImage, type LocalOcrResult } from "./local-ocr";
import { extractBatchImages, extractPdfWithGemini, geminiConfigured } from "./gemini-ocr";
import { rasterisePdfToImages } from "./pdf-rasteriser";
import { cacheGet, cacheSet } from "./llm-cache";
import { createHash } from "node:crypto";

export type OcrMode = "local" | "gemini" | "auto";

export type OcrOutcome = {
  text: string;
  confidence: number;
  language: string;
  pageCount: number;
  engineUsed: "local" | "gemini" | "auto:local" | "auto:gemini-fallback";
};

const LOCAL_CONFIDENCE_FALLBACK_THRESHOLD = 55;
const LOCAL_TEXT_MIN_CHARS = 120;

/**
 * Compute a stable SHA-256 fingerprint of the input images.
 * Used as the OCR cache key. Same file bytes -> same fingerprint -> cache hit.
 */
function computeOcrFingerprint(images: LocalOcrImage[]): string {
  const hash = createHash("sha256");
  for (const img of images) {
    if ("inlineData" in img && img.inlineData) {
      hash.update(img.inlineData.mimeType || "");
      hash.update("|");
      hash.update(img.inlineData.data || "");
      hash.update("|");
    } else if ((img as any).buf) {
      const buf = (img as any).buf;
      const mime = (img as any).mime || (img as any).mimeType || "";
      hash.update(mime);
      hash.update("|");
      if (Buffer.isBuffer(buf)) {
        hash.update(buf);
      } else if (typeof buf === "string") {
        hash.update(buf);
      }
      hash.update("|");
    }
  }
  return hash.digest("hex");
}

export function currentOcrMode(): OcrMode {
  const raw = (process.env.PAKKASCAN_OCR || "local").toLowerCase().trim();
  if (raw === "gemini" || raw === "auto" || raw === "local") return raw;
  return "local";
}

async function toPageImages(images: LocalOcrImage[]): Promise<LocalOcrImage[]> {
  const out: LocalOcrImage[] = [];
  for (const img of images) {
    let buf: Buffer | null = null;
    let mimeType = "";

    if ("inlineData" in img) {
      buf = Buffer.from(img.inlineData.data, "base64");
      mimeType = img.inlineData.mimeType;
    } else if (Buffer.isBuffer(img.buf)) {
      buf = img.buf;
      mimeType = img.mime || img.mimeType || "";
    } else if (typeof img.buf === "string") {
      buf = Buffer.from(img.buf, "base64");
      mimeType = img.mime || img.mimeType || "";
    }

    if (buf && (mimeType === "application/pdf" || mimeType.includes("pdf"))) {
      const pages = await rasterisePdfToImages(buf);
      for (const p of pages) {
        out.push({ buf: p, mimeType: "image/png" });
      }
    } else if (buf) {
      out.push({ buf, mimeType: mimeType || "image/png" });
    } else {
      out.push(img);
    }
  }
  return out;
}

function isUsableOcr(text: string | undefined | null): boolean {
  return Boolean(text && text.trim().length >= 50);
}

export async function runOcr(images: LocalOcrImage[]): Promise<OcrOutcome> {
  const mode = currentOcrMode();

  // Cache check - key is (mode + fingerprint of input images)
  const fingerprint = computeOcrFingerprint(images);
  const cached = cacheGet<OcrOutcome>("ocr", mode, fingerprint);
  if (cached && isUsableOcr(cached.text)) {
    console.log("[ocr-router] Cache HIT (mode=" + mode + ", " + cached.text.length + " chars)");
    return cached;
  }
  if (cached && !isUsableOcr(cached.text)) {
    console.warn("[ocr-router] Ignoring short/empty cached OCR (" + (cached.text || "").length + " chars)");
  }

  if (mode === "gemini") {
    if (!geminiConfigured()) {
      throw new Error("PAKKASCAN_OCR=gemini but GEMINI_API_KEY is not set");
    }

    // Try normal path first: rasterize PDF to images, OCR each page.
    // Some PDFs (with unusual vector graphics or forms) crash pdfjs/canvas.
    // On failure, fall back to sending the raw PDF directly to Gemini,
    // which handles PDFs natively via inlineData.
    try {
      const pageImages = await toPageImages(images);
      console.log(`[ocr-router] Gemini mode: prepared ${pageImages.length} page image(s)`);
      const result = await extractBatchImages(pageImages as any);
      let textOut = result.text || "";
      if (!isUsableOcr(textOut)) {
        console.warn("[ocr-router] Gemini returned short text (" + textOut.length + " chars) — retrying once");
        try {
          const retry = await extractBatchImages(pageImages as any);
          if (isUsableOcr(retry.text)) textOut = retry.text || textOut;
        } catch (re: any) {
          console.warn("[ocr-router] Gemini retry failed:", re?.message || re);
        }
      }
      const outcome: OcrOutcome = {
        text: textOut,
        confidence: isUsableOcr(textOut) ? 70 : 20,
        language: "Unknown",
        pageCount: pageImages.length,
        engineUsed: "gemini",
      };
      if (isUsableOcr(outcome.text)) cacheSet("ocr", outcome, mode, fingerprint);
      return outcome;
    } catch (rasterErr: any) {
      console.warn("[ocr-router] Rasterization failed:", rasterErr?.message || rasterErr);
      console.warn("[ocr-router] Falling back to native Gemini PDF handling");

      // Native PDF fallback: find PDF buffers in the input and send them directly
      const pdfBuffers: Buffer[] = [];
      for (const img of images) {
        let buf: Buffer | null = null;
        let mimeType = "";
        if ("inlineData" in img && img.inlineData) {
          buf = Buffer.from(img.inlineData.data, "base64");
          mimeType = img.inlineData.mimeType;
        } else if (Buffer.isBuffer((img as any).buf)) {
          buf = (img as any).buf;
          mimeType = (img as any).mime || (img as any).mimeType || "";
        } else if (typeof (img as any).buf === "string") {
          buf = Buffer.from((img as any).buf, "base64");
          mimeType = (img as any).mime || (img as any).mimeType || "";
        }
        if (buf && (mimeType === "application/pdf" || mimeType.includes("pdf"))) {
          pdfBuffers.push(buf);
        }
      }

      if (pdfBuffers.length === 0) {
        console.error("[ocr-router] Fallback failed: no PDF buffers found in input");
        throw rasterErr;
      }

      // Send each PDF to Gemini directly
      const texts: string[] = [];
      for (const pdfBuf of pdfBuffers) {
        const pdfBase64 = pdfBuf.toString("base64");
        try {
          const text = await extractPdfWithGemini(pdfBase64);
          if (text) texts.push(text);
        } catch (fallbackErr: any) {
          console.error("[ocr-router] Native Gemini PDF fallback also failed:", fallbackErr?.message || fallbackErr);
        }
      }

      const combinedText = texts.join("\n\n");
      if (!combinedText.trim()) {
        console.error("[ocr-router] Both rasterization and native PDF fallback returned empty text");
        throw new Error("PDF processing failed. The document may be corrupt, password-protected, or in an unsupported format.");
      }

      const outcome: OcrOutcome = {
        text: combinedText,
        confidence: 65, // Slightly lower confidence for native PDF path
        language: "Unknown",
        pageCount: pdfBuffers.length,
        engineUsed: "gemini",
      };
      cacheSet("ocr", outcome, mode, fingerprint);
      console.log(`[ocr-router] Native PDF fallback succeeded: ${combinedText.length} chars from ${pdfBuffers.length} PDF(s)`);
      return outcome;
    }
  }

  if (mode === "local") {
    if (process.env.VERCEL) { throw new Error("skip-tesseract-vercel"); } const result: LocalOcrResult = await extractWithLocalOcr(images);
    const outcome: OcrOutcome = { ...result, engineUsed: "local" };
    cacheSet("ocr", outcome, mode, fingerprint);
    return outcome;
  }

  if (process.env.VERCEL) { throw new Error("skip-tesseract-vercel"); } const local = await extractWithLocalOcr(images);
  const looksGood =
    local.confidence >= LOCAL_CONFIDENCE_FALLBACK_THRESHOLD &&
    local.text.trim().length >= LOCAL_TEXT_MIN_CHARS;

  if (looksGood || !geminiConfigured()) {
    const outcome: OcrOutcome = { ...local, engineUsed: "auto:local" };
    cacheSet("ocr", outcome, mode, fingerprint);
    return outcome;
  }

  console.log(
    `[ocr-router] Local confidence ${local.confidence.toFixed(1)}% / ${local.text.length} chars - falling back to Gemini`,
  );

  try {
    const pageImages = await toPageImages(images);
    const gemini = await extractBatchImages(pageImages as any);
    const textOut = isUsableOcr(gemini.text) ? (gemini.text || "") : (gemini.text || local.text);
    const outcome: OcrOutcome = {
      text: textOut,
      confidence: Math.max(local.confidence, isUsableOcr(textOut) ? 70 : 20),
      language: local.language,
      pageCount: pageImages.length,
      engineUsed: "auto:gemini-fallback",
    };
    if (isUsableOcr(outcome.text)) cacheSet("ocr", outcome, mode, fingerprint);
    return outcome;
  } catch (err) {
    console.warn("[ocr-router] Gemini fallback failed; returning local result:", err);
    const outcome: OcrOutcome = { ...local, engineUsed: "auto:local" };
    cacheSet("ocr", outcome, mode, fingerprint);
    return outcome;
  }
}
