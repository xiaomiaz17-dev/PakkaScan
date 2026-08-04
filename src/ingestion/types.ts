import type { DocumentType, Jurisdiction } from "../domain/models";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Formats accepted from file pickers and scanner apps (ClearScanner, CamScanner, etc.).
 * Prefer PDF/JPEG for OCR; HEIC/TIFF/BMP normalised where possible before OCR.
 */
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/gif", // rare for deeds; allowed for screenshots of pages
]);

/** HTML file input accept list */
export const UPLOAD_ACCEPT_ATTR =
  ".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,.heic,.heif,.gif,application/pdf,image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/heic,image/heif,image/gif";

export const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".gif": "image/gif",
};

export function mimeFromFilename(filename: string, fallback = "application/octet-stream"): string {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return fallback;
  return MIME_BY_EXTENSION[lower.slice(dot)] ?? fallback;
}

export function isAllowedUploadMime(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  if (ALLOWED_MIME_TYPES.has(normalized)) return true;
  // Some browsers send image/jpg
  if (normalized === "image/jpg") return true;
  return false;
}

export type UploadStatus =
  | "PREPARED"
  | "UPLOADED"
  | "QUARANTINED"
  | "SCANNING"
  | "PROCESSING"
  | "REVIEW_REQUIRED"
  | "COMPLETE"
  | "FAILED";

export type UploadPreparation = {
  uploadId: string;
  propertyId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  status: UploadStatus;
  expiresAt: string;
};

export type FileMetadata = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  pageCount?: number;
  width?: number;
  height?: number;
};

export type ClassificationCandidate = {
  documentType: DocumentType;
  jurisdiction: Jurisdiction;
  confidence: number;
  reasons: string[];
};

export type ProcessingJob = {
  id: string;
  uploadId: string;
  propertyId: string;
  storageKey: string;
  sha256: string;
  stage:
    | "MALWARE_SCAN"
    | "IMAGE_NORMALISATION"
    | "OCR"
    | "CLASSIFICATION"
    | "EXTRACTION"
    | "EVIDENCE_PERSISTENCE"
    | "RULE_ANALYSIS";
  attempts: number;
  createdAt: string;
};

export type ReviewItem = {
  id: string;
  documentId: string;
  propertyId: string;
  reasonCode:
    | "LOW_CLASSIFICATION_CONFIDENCE"
    | "LOW_EXTRACTION_CONFIDENCE"
    | "CRITICAL_FIELD_MISSING"
    | "CONFLICTING_EVIDENCE"
    | "UNREADABLE_DOCUMENT"
    | "OUT_OF_JURISDICTION";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  createdAt: string;
};
