import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

const OCR_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"];
const MAX_CONCURRENCY = 3;

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

async function callModel(modelName: string, image: any, pageIdx: number): Promise<string | null> {
  if (!genAI) throw new Error("GEMINI_API_KEY not set");
  const response = await genAI.models.generateContent({
    model: modelName,
    contents: [{ role: "user", parts: [{ inlineData: image.inlineData }, { text: OCR_PROMPT }] }],
  });
  const text = response.text;
  if (text && text.trim().length > 0) {
    console.log(`[gemini-ocr] Page ${pageIdx + 1}: ${modelName} extracted ${text.length} chars`);
    return text;
  }
  return null;
}

async function extractSinglePage(image: any, pageIdx: number, maxRetries = 2): Promise<string> {
  let lastError: any = null;
  for (const modelName of OCR_MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await callModel(modelName, image, pageIdx);
        if (result) return result;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        const retry = status === 503 || status === 429 || err?.message?.includes("503") || err?.message?.includes("429") || err?.message?.includes("overloaded");
        if (retry && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
          console.warn(`[gemini-ocr] Page ${pageIdx + 1} (${modelName}) got ${status}; retrying in ${Math.round(delay)}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.warn(`[gemini-ocr] Page ${pageIdx + 1} (${modelName}) failed: ${err?.message || err}`);
        break;
      }
    }
  }
  console.error(`[gemini-ocr] Page ${pageIdx + 1}: all models exhausted`, lastError?.message || lastError);
  return `[Page ${pageIdx + 1}: OCR failed]`;
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
