import { createHash } from "node:crypto";

export type BackupManifest = { id: string; source: string; createdAt: string; recordCount: number; sha256: string; encrypted: boolean };
export function createBackupManifest(input: { id: string; source: string; createdAt: string; records: unknown[]; encrypted: boolean }): BackupManifest {
  if (!input.encrypted) throw new Error("Closed-beta backups must be encrypted");
  return { id: input.id, source: input.source, createdAt: input.createdAt, recordCount: input.records.length, encrypted: true, sha256: createHash("sha256").update(JSON.stringify(input.records)).digest("hex") };
}
export function verifyRestore(manifest: BackupManifest, restoredRecords: unknown[]): boolean {
  return manifest.recordCount === restoredRecords.length && manifest.sha256 === createHash("sha256").update(JSON.stringify(restoredRecords)).digest("hex");
}
