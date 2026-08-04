import { createHash, randomUUID } from "node:crypto";
import { isAllowedUploadMime, MAX_UPLOAD_BYTES, type UploadPreparation } from "./types";

export class UploadValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export function safeFilename(value: string): string {
  const normalized = value.normalize("NFKC").replace(/[\\/\0]/g, "-").trim();
  const stripped = normalized.replace(/[^\p{L}\p{N}._() -]/gu, "-");
  return stripped.slice(0, 180) || "document";
}

export function validateUpload(input: {
  propertyId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): UploadPreparation {
  if (!input.propertyId.trim()) throw new UploadValidationError("PROPERTY_REQUIRED", "Property is required.");
  const mime = input.mimeType.toLowerCase().split(";")[0].trim();
  const normalized = mime === "image/jpg" ? "image/jpeg" : mime;
  if (!isAllowedUploadMime(normalized)) {
    throw new UploadValidationError(
      "UNSUPPORTED_FILE_TYPE",
      "Accepted: PDF, JPEG, PNG, WebP, BMP, TIFF, HEIC/HEIF, GIF (scanner-app exports supported).",
    );
  }

  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new UploadValidationError("INVALID_FILE_SIZE", "File size must be a positive integer.");
  }
  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError("FILE_TOO_LARGE", `Maximum upload size is ${MAX_UPLOAD_BYTES} bytes.`);
  }

  const uploadId = randomUUID();
  const filename = safeFilename(input.filename);
  return {
    uploadId,
    propertyId: input.propertyId,
    filename,
    mimeType: normalized,
    sizeBytes: input.sizeBytes,
    storageKey: `quarantine/${input.propertyId}/${uploadId}/${filename}`,
    status: "PREPARED",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

export function sha256(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function immutableEvidenceHash(input: {
  documentId: string;
  field: string;
  normalizedValue: string;
  page?: number;
  boundingBox?: unknown;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
