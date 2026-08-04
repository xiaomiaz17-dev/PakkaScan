/**
 * PD-030 — Private object storage contracts.
 * Memory implementation is fully functional.
 * S3-compatible adapter requires verified credentials and remains unconnected until confirmed.
 */

import { createHash } from "node:crypto";
import type { ObjectStorage, StoredObject } from "./contracts";

export type ObjectStorageHealth = {
  name: string;
  connected: boolean;
  detail: string;
};

export interface HealthAwareObjectStorage extends ObjectStorage {
  health(): Promise<ObjectStorageHealth>;
}

export class MemoryPrivateObjectStorage implements HealthAwareObjectStorage {
  private readonly objects = new Map<string, { meta: StoredObject; body: Uint8Array }>();

  async health(): Promise<ObjectStorageHealth> {
    return { name: "memory-object-storage", connected: true, detail: "In-memory private object storage (local/staging)" };
  }

  async putQuarantined(input: { key: string; contentType: string; body: Uint8Array; sha256: string }): Promise<StoredObject> {
    if (!input.key.startsWith("quarantine/")) throw new Error("Uploads must enter quarantine first.");
    const digest = createHash("sha256").update(input.body).digest("hex");
    if (digest !== input.sha256) throw new Error("SHA-256 mismatch on put");
    const meta: StoredObject = {
      key: input.key,
      contentType: input.contentType,
      sizeBytes: input.body.byteLength,
      sha256: input.sha256,
      createdAt: new Date().toISOString(),
    };
    this.objects.set(input.key, { meta, body: input.body.slice() });
    return structuredClone(meta);
  }

  async promote(input: { quarantineKey: string; destinationKey: string }): Promise<StoredObject> {
    const existing = this.objects.get(input.quarantineKey);
    if (!existing) throw new Error("Quarantined object not found.");
    if (input.destinationKey.startsWith("quarantine/")) throw new Error("Promotion destination must leave quarantine.");
    const meta = { ...existing.meta, key: input.destinationKey };
    this.objects.set(input.destinationKey, { meta, body: existing.body.slice() });
    this.objects.delete(input.quarantineKey);
    return structuredClone(meta);
  }

  async get(key: string): Promise<Uint8Array> {
    const existing = this.objects.get(key);
    if (!existing) throw new Error("Object not found.");
    return existing.body.slice();
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

/**
 * S3CompatibleObjectStorage — private cloud object storage.
 * Construction and credential acceptance are allowed; live operations
 * remain blocked until connectivity is explicitly verified.
 */
export class S3CompatibleObjectStorage implements HealthAwareObjectStorage {
  private configured = false;
  private bucket?: string;
  private endpoint?: string;
  private accessKeyId?: string;
  private secretAccessKey?: string;

  configure(input: {
    bucket: string;
    endpoint?: string;
    accessKeyId: string;
    secretAccessKey: string;
  }): void {
    if (!input.bucket.trim()) throw new Error("Object storage bucket is required");
    if (!input.accessKeyId.trim() || !input.secretAccessKey.trim()) {
      throw new Error("Object storage credentials are required");
    }
    this.bucket = input.bucket;
    this.endpoint = input.endpoint;
    this.accessKeyId = input.accessKeyId;
    this.secretAccessKey = input.secretAccessKey;
    // Credentials accepted but live connection not claimed.
    this.configured = false;
  }

  markConnected(): void {
    if (!this.bucket || !this.accessKeyId) throw new Error("Object storage credentials not supplied");
    this.configured = true;
  }

  async health(): Promise<ObjectStorageHealth> {
    if (!this.bucket) {
      return { name: "s3-compatible-object-storage", connected: false, detail: "Bucket and credentials not supplied — external credential required" };
    }
    if (!this.configured) {
      return { name: "s3-compatible-object-storage", connected: false, detail: "Credentials present but live connection not yet verified" };
    }
    return { name: "s3-compatible-object-storage", connected: true, detail: `Verified private bucket ${this.bucket}` };
  }

  private ensure(): void {
    if (!this.configured) {
      throw new Error("NOT_CONNECTED: Private object storage is not verified. Supply and verify credentials before use.");
    }
  }

  async putQuarantined(_input: { key: string; contentType: string; body: Uint8Array; sha256: string }): Promise<StoredObject> {
    this.ensure();
    throw new Error("NOT_IMPLEMENTED_LIVE");
  }

  async promote(_input: { quarantineKey: string; destinationKey: string }): Promise<StoredObject> {
    this.ensure();
    throw new Error("NOT_IMPLEMENTED_LIVE");
  }

  async get(_key: string): Promise<Uint8Array> {
    this.ensure();
    throw new Error("NOT_IMPLEMENTED_LIVE");
  }

  async delete(_key: string): Promise<void> {
    this.ensure();
    throw new Error("NOT_IMPLEMENTED_LIVE");
  }
}
