export type ScanVerdict = "CLEAN" | "INFECTED" | "UNSUPPORTED";
export type ScanResult = { verdict: ScanVerdict; engine: string; signature?: string; scannedAt: string };

export interface MalwareScanner {
  scan(input: { fileName: string; mimeType: string; bytes: Uint8Array }): Promise<ScanResult>;
}

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/jpg",
]);
const dangerousMarkers = ["eicar-standard-antivirus-test-file", "<script", "javascript:"];

export class DeterministicBetaScanner implements MalwareScanner {
  async scan(input: { fileName: string; mimeType: string; bytes: Uint8Array }): Promise<ScanResult> {
    const scannedAt = new Date().toISOString();
    if (!allowedMimeTypes.has(input.mimeType)) return { verdict: "UNSUPPORTED", engine: "pakkadeed-beta-scan", scannedAt };
    const text = new TextDecoder().decode(input.bytes).toLowerCase();
    const marker = dangerousMarkers.find((item) => text.includes(item));
    if (marker) return { verdict: "INFECTED", engine: "pakkadeed-beta-scan", signature: marker, scannedAt };
    return { verdict: "CLEAN", engine: "pakkadeed-beta-scan", scannedAt };
  }
}

export async function requireCleanUpload(scanner: MalwareScanner, input: { fileName: string; mimeType: string; bytes: Uint8Array }): Promise<ScanResult> {
  const result = await scanner.scan(input);
  if (result.verdict !== "CLEAN") throw new Error(`Upload rejected: ${result.verdict}`);
  return result;
}
