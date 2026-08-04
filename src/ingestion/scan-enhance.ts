/**
 * Scanner-app style normalisation (ClearScanner / CamScanner class exports).
 * Pipeline stage: IMAGE_NORMALISATION — improve OCR readability.
 * Full computer-vision deskew lives in worker infra; this module defines the contract + light heuristics.
 */

export type ScanEnhanceRequest = {
  mimeType: string;
  /** Original bytes (image or PDF). */
  bytes: Uint8Array;
  options?: {
    /** Prefer grayscale page for OCR. */
    grayscale?: boolean;
    /** Flag for downstream OCR that contrast stretch is desired. */
    enhanceContrast?: boolean;
    /** Multi-page scanner PDFs. */
    treatAsDocumentScan?: boolean;
  };
};

export type ScanEnhanceResult = {
  mimeType: string;
  bytes: Uint8Array;
  /** Hints for OCR / review. */
  enhancementsApplied: string[];
  ocrFriendly: boolean;
  notes: string[];
};

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/gif",
]);

/**
 * Prepare scanner exports for OCR. Without native image libs in-core, we pass through
 * bytes and attach enhancement flags for the worker/OCR service.
 */
export function prepareScanForOcr(input: ScanEnhanceRequest): ScanEnhanceResult {
  const mime = input.mimeType.toLowerCase().split(";")[0].trim();
  const enhancementsApplied: string[] = [];
  const notes: string[] = [];

  if (mime === "application/pdf") {
    enhancementsApplied.push("pdf_document_scan");
    notes.push("PDF from scanner apps is preferred for multi-page deeds.");
    return {
      mimeType: mime,
      bytes: input.bytes,
      enhancementsApplied,
      ocrFriendly: true,
      notes,
    };
  }

  if (!IMAGE_MIME.has(mime)) {
    return {
      mimeType: mime,
      bytes: input.bytes,
      enhancementsApplied: [],
      ocrFriendly: false,
      notes: ["Unsupported image type for scan enhancement."],
    };
  }

  if (mime === "image/heic" || mime === "image/heif") {
    enhancementsApplied.push("heic_needs_transcode");
    notes.push("HEIC should be transcoded to JPEG in the worker before OCR.");
  }
  if (mime === "image/bmp" || mime === "image/tiff") {
    enhancementsApplied.push("raster_normalize");
    notes.push("Large raster formats should be downscaled/compressed to JPEG for OCR.");
  }
  if (input.options?.grayscale !== false) {
    enhancementsApplied.push("prefer_grayscale_page");
  }
  if (input.options?.enhanceContrast !== false) {
    enhancementsApplied.push("prefer_contrast_stretch");
  }
  if (input.options?.treatAsDocumentScan !== false) {
    enhancementsApplied.push("document_scan_profile");
    notes.push("Treat as document scan: deskew + edge crop recommended in worker.");
  }

  return {
    mimeType: mime === "image/jpg" ? "image/jpeg" : mime,
    bytes: input.bytes,
    enhancementsApplied,
    ocrFriendly: true,
    notes,
  };
}
