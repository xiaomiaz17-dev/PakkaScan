import { createHash, randomUUID } from "node:crypto";
import type { MalwareScanner } from "./scanning";
import { requireCleanUpload } from "./scanning";
import type { OcrProvider } from "./providers";

export type AuthContext = { userId: string; roles: Array<"CUSTOMER" | "REVIEWER" | "ADMIN"> };
export type BetaUpload = { id: string; userId: string; propertyId: string; fileName: string; mimeType: string; sha256: string; status: "STORED" | "OCR_COMPLETE"; ocrText?: string };

export class ClosedBetaApi {
  private readonly uploads = new Map<string, BetaUpload>();
  constructor(private readonly scanner: MalwareScanner, private readonly ocr: OcrProvider) {}

  async uploadDocument(auth: AuthContext | undefined, input: { propertyId: string; ownerUserId: string; fileName: string; mimeType: string; bytes: Uint8Array }): Promise<BetaUpload> {
    if (!auth) throw new Error("Authentication required");
    const privileged = auth.roles.includes("ADMIN") || auth.roles.includes("REVIEWER");
    if (auth.userId !== input.ownerUserId && !privileged) throw new Error("Forbidden");
    await requireCleanUpload(this.scanner, input);
    const upload: BetaUpload = {
      id: randomUUID(), userId: input.ownerUserId, propertyId: input.propertyId,
      fileName: input.fileName, mimeType: input.mimeType,
      sha256: createHash("sha256").update(input.bytes).digest("hex"), status: "STORED",
    };
    this.uploads.set(upload.id, upload);
    return structuredClone(upload);
  }

  async runOcr(auth: AuthContext | undefined, uploadId: string, bytes: Uint8Array): Promise<BetaUpload> {
    if (!auth) throw new Error("Authentication required");
    const upload = this.uploads.get(uploadId);
    if (!upload) throw new Error("Upload not found");
    const privileged = auth.roles.includes("ADMIN") || auth.roles.includes("REVIEWER");
    if (upload.userId !== auth.userId && !privileged) throw new Error("Forbidden");
    const result = await this.ocr.extract({ documentId: upload.id, mimeType: upload.mimeType, bytes });
    const updated = { ...upload, status: "OCR_COMPLETE" as const, ocrText: result.text };
    this.uploads.set(uploadId, updated);
    return structuredClone(updated);
  }
}
