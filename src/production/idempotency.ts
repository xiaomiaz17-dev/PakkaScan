import { createHash } from "node:crypto";

export type IdempotencyRecord<T> = {
  key: string;
  requestHash: string;
  response: T;
  createdAt: string;
};

export class IdempotencyStore<T> {
  private records = new Map<string, IdempotencyRecord<T>>();

  execute(key: string, requestBody: unknown, operation: () => T, now = new Date()): T {
    const requestHash = createHash("sha256").update(JSON.stringify(requestBody)).digest("hex");
    const existing = this.records.get(key);
    if (existing) {
      if (existing.requestHash !== requestHash) throw new Error("Idempotency key reused with a different request");
      return existing.response;
    }
    const response = operation();
    this.records.set(key, { key, requestHash, response, createdAt: now.toISOString() });
    return response;
  }

  size(): number { return this.records.size; }
}
