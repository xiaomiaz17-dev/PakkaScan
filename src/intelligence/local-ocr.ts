/**
 * Local OCR engine using Tesseract.js.
 * Optimised for scanned property documents (English or Urdu).
 *
 * Strategy:
 *   1. Preprocess with binarization + high resolution
 *   2. Run English OCR first (most Pakistani property docs are English)
 *   3. If English confidence is low or Urdu script is detected, run Urdu pass
 *   4. Merge results intelligently
 */

import { createWorker, type Worker } from "tesseract.js";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

export type LocalOcrImage =
  | { inlineData: { data: string; mimeType: string } }
  | { buf: Buffer | string; mime?: string; mimeType?: string };

export type LocalOcrResult = {
  text: string;
  confidence: number;
  language: "English" | "Urdu/Mixed" | "Unknown";
  pageCount: number;
  perPageConfidence: number[];
};

const ENGLISH_CONFIDENCE_THRESHOLD = 60;
const URDU_CHAR_RATIO_THRESHOLD = 0.10;

/**
 * Aggressive preprocessing for scanned document OCR.
 * - Auto-orient by EXIF
 * - Convert to greyscale
 * - Normalize (stretch contrast to full range)
 * - Threshold to pure black/white (binarization)
 * - Sharpen edges
 * - Upscale to ~3000px wide for maximum OCR resolution
 */
async function preprocessImage(buf: Buffer): Promise<Buffer> {
  try {
    return await sharp(buf)
      .rotate()
      .greyscale()
      .normalize()
      .median(1)
      .sharpen({ sigma: 1.5, m1: 0.5, m2: 3 })
      .threshold(160)
      .resize({ width: 3000, withoutEnlargement: false, fit: "inside" })
      .png()
      .toBuffer();
  } catch (err) {
    console.warn("[local-ocr] Preprocessing failed, using original buffer:", err);
    return buf;
  }
}

async function toBuffer(image: LocalOcrImage): Promise<{ buf: Buffer; mimeType: string }> {
  if ("inlineData" in image) {
    return {
      buf: Buffer.from(image.inlineData.data, "base64"),
      mimeType: image.inlineData.mimeType,
    };
  }
  if (Buffer.isBuffer(image.buf)) {
    return { buf: image.buf, mimeType: image.mime || image.mimeType || "image/png" };
  }
  if (typeof image.buf === "string") {
    return {
      buf: Buffer.from(image.buf, "base64"),
      mimeType: image.mime || image.mimeType || "image/png",
    };
  }
  throw new Error("Unrecognised image descriptor for local OCR");
}

/**
 * Rasterise a PDF into per-page PNG buffers using pdf-to-img.
 */
async function pdfToImages(pdfBuf: Buffer): Promise<Buffer[]> {
  const { pdf } = await import("pdf-to-img");

  const document = await pdf(pdfBuf, {
    scale: 3,
  });

  const pages: Buffer[] = [];

  for await (const pageImage of document) {
    pages.push(Buffer.from(pageImage));
  }

  console.log(`[local-ocr] Rasterised PDF into ${pages.length} page image(s)`);

  return pages;
}

async function expandToPageImages(images: LocalOcrImage[]): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const img of images) {
    const { buf, mimeType } = await toBuffer(img);
    if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
      const pages = await pdfToImages(buf);
      out.push(...pages);
    } else {
      out.push(buf);
    }
  }
  return out;
}

async function recognizeWithWorker(
  worker: Worker,
  buf: Buffer,
): Promise<{ text: string; confidence: number }> {
  const tmpFile = path.join(os.tmpdir(), `pakka-ocr-${randomUUID()}.png`);
  await fs.writeFile(tmpFile, buf);
  try {
    const res = await worker.recognize(tmpFile);
    return {
      text: res.data.text || "",
      confidence: Number.isFinite(res.data.confidence) ? res.data.confidence : 0,
    };
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

/**
 * Count actual Urdu-script characters in a string.
 * Urdu uses the Arabic script block U+0600 to U+06FF.
 */
function countUrduChars(text: string): number {
  let count = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0x0600 && code <= 0x06FF) count++;
  }
  return count;
}

/**
 * Detect if Urdu OCR is needed based on the *character set* of English OCR output.
 * If the "English" OCR pass extracted things that look like Urdu characters, we
 * should re-run in Urdu mode.
 */
function shouldRunUrdu(engText: string, engConfidence: number): boolean {
  if (engConfidence < ENGLISH_CONFIDENCE_THRESHOLD) return true;
  const urduChars = countUrduChars(engText);
  const totalChars = engText.length || 1;
  return (urduChars / totalChars) > URDU_CHAR_RATIO_THRESHOLD;
}

/**
 * Decide primary language based on which pass produced better-quality content.
 * Uses actual Urdu character counts, not word counts (which include OCR garbage).
 */
function detectLanguage(engText: string, urdText: string): LocalOcrResult["language"] {
  const urduInUrduPass = countUrduChars(urdText);
  const urduInEngPass = countUrduChars(engText);
  const totalUrdu = urduInUrduPass + urduInEngPass;
  const engAlphaCount = (engText.match(/[A-Za-z]/g) || []).length;

  if (totalUrdu === 0 && engAlphaCount === 0) return "Unknown";
  if (totalUrdu > engAlphaCount * 0.2) return "Urdu/Mixed";
  return "English";
}

export async function extractWithLocalOcr(rawImages: LocalOcrImage[]): Promise<LocalOcrResult> {
  const pageBuffers = await expandToPageImages(rawImages);
  if (pageBuffers.length === 0) {
    return { text: "", confidence: 0, language: "Unknown", pageCount: 0, perPageConfidence: [] };
  }

  const engWorker = await createWorker("eng");
  let urdWorker: Worker | null = null;

  let combinedEng = "";
  let combinedUrd = "";
  const perPageConfidence: number[] = [];
  let anyUrduRun = false;

  try {
    for (let i = 0; i < pageBuffers.length; i++) {
      const preprocessed = await preprocessImage(pageBuffers[i]);

      const engRes = await recognizeWithWorker(engWorker, preprocessed);

      let urdRes = { text: "", confidence: 0 };
      if (shouldRunUrdu(engRes.text, engRes.confidence)) {
        if (!urdWorker) {
          urdWorker = await createWorker("urd");
        }
        urdRes = await recognizeWithWorker(urdWorker, preprocessed);
        anyUrduRun = true;
      }

      const pageLabel = pageBuffers.length > 1 ? `\n--- Page ${i + 1} ---\n` : "";
      combinedEng += `${pageLabel}${engRes.text}\n`;
      if (urdRes.text) combinedUrd += `${pageLabel}${urdRes.text}\n`;

      perPageConfidence.push(Math.max(engRes.confidence, urdRes.confidence));

      const urdInfo = urdRes.confidence > 0 ? ` / urd ${urdRes.confidence.toFixed(1)}%` : "";
      console.log(
        `[local-ocr] Page ${i + 1}/${pageBuffers.length} - eng ${engRes.confidence.toFixed(1)}%${urdInfo}`,
      );
    }
  } finally {
    await engWorker.terminate();
    if (urdWorker) await urdWorker.terminate();
  }

  const combinedText = anyUrduRun
    ? `${combinedEng.trim()}\n\n=== URDU OCR PASS ===\n${combinedUrd.trim()}`
    : combinedEng.trim();

  const language = detectLanguage(combinedEng, combinedUrd);
  const avgConfidence =
    perPageConfidence.reduce((a, b) => a + b, 0) / Math.max(1, perPageConfidence.length);

  console.log(
    `[local-ocr] Final: ${combinedText.length} chars, lang=${language}, avg conf=${avgConfidence.toFixed(1)}%`,
  );

  return {
    text: combinedText,
    confidence: avgConfidence,
    language,
    pageCount: pageBuffers.length,
    perPageConfidence,
  };
}
