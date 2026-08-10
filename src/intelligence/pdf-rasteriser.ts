/**
 * Shared PDF-to-image rasteriser used by both local Tesseract and Gemini OCR.
 * Uses pdf-to-img which bundles pdfjs + canvas internally.
 */

export async function rasterisePdfToImages(pdfBuf: Buffer): Promise<Buffer[]> {
  const { pdf } = await import("pdf-to-img");
  const document = await pdf(pdfBuf, { scale: 3 });
  const pages: Buffer[] = [];
  for await (const pageImage of document) {
    pages.push(Buffer.from(pageImage));
  }
  console.log(`[pdf-rasteriser] Converted PDF into ${pages.length} page image(s)`);
  return pages;
}
