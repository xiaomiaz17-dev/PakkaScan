/**
 * Shared PDF-to-image rasteriser used by both local Tesseract and Gemini OCR.
 * Uses pdf-to-img which bundles pdfjs + canvas internally.
 *
 * Serverless (Vercel) note:
 * pdfjs-dist 5.x references DOMMatrix, ImageData, and Path2D as browser globals.
 * These do not exist in Node by default. We polyfill them via @napi-rs/canvas
 * BEFORE the first pdfjs import so pdfjs finds them when it initialises.
 */

// Load canvas polyfills at module init - MUST happen before pdf-to-img import
let polyfilled = false;
async function ensurePolyfills(): Promise<void> {
  if (polyfilled) return;
  const g = globalThis as any;
  if (typeof g.DOMMatrix === "undefined") {
    try {
      const canvas = await import("@napi-rs/canvas");
      g.DOMMatrix = (canvas as any).DOMMatrix;
      g.ImageData = (canvas as any).ImageData;
      g.Path2D = (canvas as any).Path2D;
      console.log("[pdf-rasteriser] Loaded canvas polyfills for serverless (DOMMatrix, ImageData, Path2D)");
    } catch (err) {
      console.warn("[pdf-rasteriser] Failed to load @napi-rs/canvas polyfills:", err);
    }
  }
  polyfilled = true;
}

export async function rasterisePdfToImages(pdfBuf: Buffer): Promise<Buffer[]> {
  await ensurePolyfills();
  const { pdf } = await import("pdf-to-img");
  const document = await pdf(pdfBuf, { scale: 3 });
  const pages: Buffer[] = [];
  for await (const pageImage of document) {
    pages.push(Buffer.from(pageImage));
  }
  console.log(`[pdf-rasteriser] Converted PDF into ${pages.length} page image(s)`);
  return pages;
}
