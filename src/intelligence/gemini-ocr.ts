import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

const OCR_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-flash-lite-latest"];
const MAX_CONCURRENCY = 3;

// --- Retry / timeout tuning ---
const MAX_RETRIES_PER_MODEL = 1;           // no same-model retry; fall through to next model
const MAX_BACKOFF_MS = 3000;               // cap wait between attempts at 3s (was up to 8s)
const BASE_BACKOFF_MS = 1500;              // starting backoff
const PER_CALL_TIMEOUT_MS = 90000;
const PER_PAGE_BUDGET_MS = 75000;          // 60s total budget per page

export function geminiConfigured(): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}

async function compressImageBuffer(buf: Buffer): Promise<{ base64: string; mimeType: string }> {
  try {
    const resizedBuffer = await sharp(buf)
      .resize({ width: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { base64: resizedBuffer.toString("base64"), mimeType: "image/jpeg" };
  } catch (err) {
    console.warn("[gemini-ocr] Sharp compression failed:", err);
    return { base64: buf.toString("base64"), mimeType: "image/png" };
  }
}

async function normalizeImage(img: any): Promise<{ inlineData: { data: string; mimeType: string } }> {
  if (img.inlineData) return img;
  let buffer: Buffer | null = null;
  if (Buffer.isBuffer(img.buf)) buffer = img.buf;
  else if (typeof img.buf === "string") buffer = Buffer.from(img.buf, "base64");

  if (buffer) {
    const c = await compressImageBuffer(buffer);
    return { inlineData: { data: c.base64, mimeType: c.mimeType } };
  }
  return { inlineData: { data: img.buf || "", mimeType: img.mime || img.mimeType || "image/png" } };
}

const OCR_PROMPT = `You are an expert OCR engine specialising in Pakistani legal and property documents (Sale Deeds, Bayana Agreements, Mutation, Tenancy Agreements, PoA, etc.).

Extract ALL text visible on this page verbatim, preserving:
- Original language (English AND Urdu - do NOT translate)
- Line breaks and paragraph structure
- Handwriting (transcribe as best you can - indicate uncertain readings with [?])
- Numbers, CNIC numbers, phone numbers, addresses exactly as written
- Stamp/seal text if legible

Do NOT summarise, translate, or add commentary. Output raw extracted text only.
If a section is unreadable, write [UNREADABLE] on that line and continue.`;

/**
 * Wrap a promise with a hard timeout. If the promise doesn't resolve/reject
 * within timeoutMs, reject with a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function callModel(modelName: string, image: any, pageIdx: number): Promise<string | null> {
  if (!genAI) throw new Error("GEMINI_API_KEY not set");
  const callPromise = genAI.models.generateContent({
    model: modelName,
    contents: [{ role: "user", parts: [{ inlineData: image.inlineData }, { text: OCR_PROMPT }] }],
  });
  const response = await withTimeout(callPromise, PER_CALL_TIMEOUT_MS, `[gemini-ocr] ${modelName} page ${pageIdx + 1}`);
  const text = response.text;
  if (text && text.trim().length > 0) {
    console.log(`[gemini-ocr] Page ${pageIdx + 1}: ${modelName} extracted ${text.length} chars`);
    return text;
  }
  return null;
}

async function extractSinglePage(image: any, pageIdx: number): Promise<string> {
  const pageStart = Date.now();
  let lastError: any = null;

  for (const modelName of OCR_MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {

      // Check global page budget
      const elapsed = Date.now() - pageStart;
      if (elapsed >= PER_PAGE_BUDGET_MS) {
        console.warn(`[gemini-ocr] Page ${pageIdx + 1}: exceeded ${PER_PAGE_BUDGET_MS}ms budget, giving up`);
        return ""; // empty → router can retry / extractor reports clearly
      }

      try {
        const result = await callModel(modelName, image, pageIdx);
        if (result) return result;
        // Undefined/empty response - retry if we have attempts left, else move to next model
        if (attempt < MAX_RETRIES_PER_MODEL) {
          const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
          console.warn(`[gemini-ocr] Page ${pageIdx + 1} (${modelName}) got empty response; retrying in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        // No retries left for this model, break to next model
        console.warn(`[gemini-ocr] Page ${pageIdx + 1} (${modelName}) exhausted retries, moving to next model`);
        break;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        const msg = String(err?.message || "");
        const isTimeout = msg.includes("exceeded") && msg.includes("ms");
        const isRetryable = !isTimeout && (status === 503 || status === 429 || msg.includes("503") || msg.includes("429") || msg.includes("overloaded"));

        if (isRetryable && attempt < MAX_RETRIES_PER_MODEL) {
          const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
          console.warn(`[gemini-ocr] Page ${pageIdx + 1} (${modelName}) error (${status || err?.message}); retrying in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.warn(`[gemini-ocr] Page ${pageIdx + 1} (${modelName}) failed permanently: ${err?.message || err}`);
        break;
      }
    }
  }

  console.error(`[gemini-ocr] Page ${pageIdx + 1}: all models exhausted after ${Date.now() - pageStart}ms`, lastError?.message || lastError);
  return ""; // empty → do not cache as valid OCR
}

async function runWithConcurrencyLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    return next();
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
  return results;
}

export async function extractBatchImages(rawImages: any[]): Promise<{ text: string }> {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  const images = await Promise.all(rawImages.map(normalizeImage));
  console.log(`[gemini-ocr] Starting parallel OCR for ${images.length} page(s), concurrency=${MAX_CONCURRENCY}`);
  const pageResults = await runWithConcurrencyLimit(images, MAX_CONCURRENCY, (img, idx) => extractSinglePage(img, idx));
  const combined = pageResults.map((text, idx) => (images.length > 1 ? `--- Page ${idx + 1} ---\n${text}` : text)).join("\n\n");
  console.log(`[gemini-ocr] Complete: ${combined.length} total chars across ${images.length} page(s)`);
  return { text: combined };
}

export const extractTextWithGeminiBatch = extractBatchImages;

export async function extractTextWithGemini(imageBase64: string, mimeType = "image/png"): Promise<string> {
  const result = await extractBatchImages([{ inlineData: { data: imageBase64, mimeType } }]);
  return result.text;
}

export async function extractPdfWithGemini(pdfBase64: string): Promise<string> {
  const result = await extractBatchImages([{ inlineData: { data: pdfBase64, mimeType: "application/pdf" } }]);
  return result.text;
}