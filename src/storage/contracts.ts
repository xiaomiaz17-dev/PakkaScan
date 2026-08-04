export type StoredObject = {
  key: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
};

export interface ObjectStorage {
  putQuarantined(input: { key: string; contentType: string; body: Uint8Array; sha256: string }): Promise<StoredObject>;
  promote(input: { quarantineKey: string; destinationKey: string }): Promise<StoredObject>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

export class MemoryObjectStorage implements ObjectStorage {
  private readonly objects = new Map<string, { meta: StoredObject; body: Uint8Array }>();

  async putQuarantined(input: { key: string; contentType: string; body: Uint8Array; sha256: string }): Promise<StoredObject> {
    if (!input.key.startsWith("quarantine/")) throw new Error("Uploads must enter quarantine first.");
    const meta: StoredObject = {
      key: input.key,
      contentType: input.contentType,
      sizeBytes: input.body.byteLength,
      sha256: input.sha256,
      createdAt: new Date().toISOString(),
    };
    this.objects.set(input.key, { meta, body: input.body.slice() });
    return meta;
  }

  async promote(input: { quarantineKey: string; destinationKey: string }): Promise<StoredObject> {
    const existing = this.objects.get(input.quarantineKey);
    if (!existing) throw new Error("Quarantined object not found.");
    const meta = { ...existing.meta, key: input.destinationKey };
    this.objects.set(input.destinationKey, { meta, body: existing.body.slice() });
    this.objects.delete(input.quarantineKey);
    return meta;
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
