/**
 * PD-032 — S3-compatible private object storage driver.
 * HTTP is injectable so tests never open real network sockets.
 * Live operations require a successful health probe.
 */

import { createHash } from "node:crypto";
import type { ObjectStorage, StoredObject } from "./contracts";
import type { ObjectStorageHealth } from "./private-object-storage";

export type HttpResponse = { status: number; body: Uint8Array; headers?: Record<string, string> };
export type HttpTransport = {
  request(input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: Uint8Array;
  }): Promise<HttpResponse>;
};

export type S3DriverOptions = {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  transport?: HttpTransport;
};

/** In-memory HTTP transport for staging smoke tests. */
export class MemoryHttpTransport implements HttpTransport {
  private readonly objects = new Map<string, { body: Uint8Array; contentType: string; sha256: string }>();
  private healthy = true;

  setHealthy(value: boolean): void {
    this.healthy = value;
  }

  async request(input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: Uint8Array;
  }): Promise<HttpResponse> {
    if (!this.healthy) {
      return { status: 503, body: new TextEncoder().encode("service unavailable") };
    }
    const url = new URL(input.url);
    const key = decodeURIComponent(url.pathname.replace(/^\//, "")).replace(/\/$/, "");
    // Bucket root health check: HEAD /bucket or HEAD /bucket/
    if (input.method === "HEAD" && (key === "" || !key.includes("/"))) {
      return { status: 200, body: new Uint8Array() };
    }
    if (input.method === "PUT" && !input.body) {
      // Bucket create / empty put
      return { status: 200, body: new Uint8Array() };
    }
    if (input.method === "PUT" && input.body) {
      const contentType = input.headers?.["content-type"] ?? "application/octet-stream";
      const sha256 = input.headers?.["x-amz-meta-sha256"] ?? createHash("sha256").update(input.body).digest("hex");
      this.objects.set(key, { body: input.body.slice(), contentType, sha256 });
      return { status: 200, body: new Uint8Array() };
    }
    if (input.method === "GET") {
      const obj = this.objects.get(key);
      if (!obj) return { status: 404, body: new TextEncoder().encode("not found") };
      return { status: 200, body: obj.body.slice(), headers: { "content-type": obj.contentType } };
    }
    if (input.method === "DELETE") {
      this.objects.delete(key);
      return { status: 204, body: new Uint8Array() };
    }
    return { status: 405, body: new TextEncoder().encode("method not allowed") };
  }
}

export class S3Driver implements ObjectStorage {
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private transport?: HttpTransport;
  private verified = false;

  constructor(options: S3DriverOptions) {
    if (!options.bucket.trim()) throw new Error("Object storage bucket is required");
    if (!options.endpoint.trim()) throw new Error("Object storage endpoint is required");
    if (!options.accessKeyId.trim() || !options.secretAccessKey.trim()) {
      throw new Error("Object storage credentials are required");
    }
    this.bucket = options.bucket;
    this.endpoint = options.endpoint.replace(/\/$/, "");
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.transport = options.transport;
  }

  setTransport(transport: HttpTransport): void {
    this.transport = transport;
    this.verified = false;
  }

  private objectUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  async probe(): Promise<{ ok: boolean; detail: string }> {
    if (!this.transport) {
      return { ok: false, detail: "No HTTP transport attached — external driver required" };
    }
    try {
      const response = await this.transport.request({
        method: "HEAD",
        url: `${this.endpoint}/${this.bucket}/`,
        headers: { authorization: `AWS4 ${this.accessKeyId}` },
      });
      if (response.status >= 200 && response.status < 300) {
        this.verified = true;
        return { ok: true, detail: `HEAD ${this.bucket} → ${response.status}` };
      }
      this.verified = false;
      return { ok: false, detail: `HEAD ${this.bucket} → ${response.status}` };
    } catch (error) {
      this.verified = false;
      return { ok: false, detail: error instanceof Error ? error.message : "probe failed" };
    }
  }

  async health(): Promise<ObjectStorageHealth> {
    if (!this.transport) {
      return { name: "s3-driver", connected: false, detail: "No HTTP transport attached" };
    }
    if (!this.verified) {
      return { name: "s3-driver", connected: false, detail: "Transport present but probe not yet successful" };
    }
    return { name: "s3-driver", connected: true, detail: `Verified private bucket ${this.bucket}` };
  }

  private ensure(): HttpTransport {
    if (!this.transport || !this.verified) {
      throw new Error("NOT_CONNECTED: S3 driver is not verified by health probe");
    }
    return this.transport;
  }

  async putQuarantined(input: {
    key: string;
    contentType: string;
    body: Uint8Array;
    sha256: string;
  }): Promise<StoredObject> {
    if (!input.key.startsWith("quarantine/")) throw new Error("Uploads must enter quarantine first.");
    const digest = createHash("sha256").update(input.body).digest("hex");
    if (digest !== input.sha256) throw new Error("SHA-256 mismatch on put");
    const t = this.ensure();
    const response = await t.request({
      method: "PUT",
      url: this.objectUrl(input.key),
      headers: {
        "content-type": input.contentType,
        "x-amz-meta-sha256": input.sha256,
        authorization: `AWS4 ${this.accessKeyId}`,
      },
      body: input.body,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Object storage put failed: ${response.status}`);
    }
    return {
      key: input.key,
      contentType: input.contentType,
      sizeBytes: input.body.byteLength,
      sha256: input.sha256,
      createdAt: new Date().toISOString(),
    };
  }

  async promote(input: { quarantineKey: string; destinationKey: string }): Promise<StoredObject> {
    if (input.destinationKey.startsWith("quarantine/")) {
      throw new Error("Promotion destination must leave quarantine.");
    }
    const body = await this.get(input.quarantineKey);
    const sha256 = createHash("sha256").update(body).digest("hex");
    const t = this.ensure();
    const put = await t.request({
      method: "PUT",
      url: this.objectUrl(input.destinationKey),
      headers: {
        "content-type": "application/octet-stream",
        "x-amz-meta-sha256": sha256,
        authorization: `AWS4 ${this.accessKeyId}`,
      },
      body,
    });
    if (put.status < 200 || put.status >= 300) throw new Error(`Promote put failed: ${put.status}`);
    await t.request({
      method: "DELETE",
      url: this.objectUrl(input.quarantineKey),
      headers: { authorization: `AWS4 ${this.accessKeyId}` },
    });
    return {
      key: input.destinationKey,
      contentType: "application/octet-stream",
      sizeBytes: body.byteLength,
      sha256,
      createdAt: new Date().toISOString(),
    };
  }

  async get(key: string): Promise<Uint8Array> {
    const t = this.ensure();
    const response = await t.request({
      method: "GET",
      url: this.objectUrl(key),
      headers: { authorization: `AWS4 ${this.accessKeyId}` },
    });
    if (response.status === 404) throw new Error("Object not found.");
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Object storage get failed: ${response.status}`);
    }
    return response.body.slice();
  }

  async delete(key: string): Promise<void> {
    const t = this.ensure();
    await t.request({
      method: "DELETE",
      url: this.objectUrl(key),
      headers: { authorization: `AWS4 ${this.accessKeyId}` },
    });
  }
}
