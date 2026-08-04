/**
 * Optional real infrastructure clients behind feature flags.
 * - PostgreSQL via the `pg` package (dynamic import)
 * - S3-compatible object storage via HTTP with AWS SigV4-lite headers when keys are present
 *
 * Default unit tests never set the enable flags and never require these packages.
 * Live integration is opt-in: PAKKADEED_ENABLE_REAL_POSTGRES=1 / PAKKADEED_ENABLE_REAL_OBJECT_STORAGE=1
 */

import { createHash, createHmac } from "node:crypto";
import type { SqlTransport } from "./postgres-driver";
import type { HttpTransport, HttpResponse } from "./s3-driver";

export type RealClientFlags = {
  enableRealPostgres: boolean;
  enableRealObjectStorage: boolean;
};

export function readRealClientFlags(env: Record<string, string | undefined> = process.env): RealClientFlags {
  return {
    enableRealPostgres: env.PAKKADEED_ENABLE_REAL_POSTGRES === "1",
    enableRealObjectStorage: env.PAKKADEED_ENABLE_REAL_OBJECT_STORAGE === "1",
  };
}

export function realClientsEnabledSummary(env: Record<string, string | undefined> = process.env): {
  postgres: boolean;
  objectStorage: boolean;
} {
  const flags = readRealClientFlags(env);
  return { postgres: flags.enableRealPostgres, objectStorage: flags.enableRealObjectStorage };
}

/**
 * Create a real `pg` Pool transport.
 * Requires PAKKADEED_ENABLE_REAL_POSTGRES=1 and the `pg` package installed.
 */
export async function createRealPostgresTransport(connectionString: string): Promise<SqlTransport> {
  const flags = readRealClientFlags();
  if (!flags.enableRealPostgres) {
    throw new Error("REAL_CLIENT_DISABLED: set PAKKADEED_ENABLE_REAL_POSTGRES=1 to use the real pg client");
  }
  let pgModule: any;
  try {
    pgModule = await import("pg");
  } catch {
    throw new Error("REAL_CLIENT_UNAVAILABLE: package 'pg' is not installed. Run: npm install pg && npm install -D @types/pg");
  }
  const Pool = pgModule.Pool ?? pgModule.default?.Pool;
  if (!Pool) throw new Error("REAL_CLIENT_UNAVAILABLE: pg.Pool not found in package export");
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 5_000 });
  return {
    async query(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return { rows: result.rows as Record<string, unknown>[] };
    },
    async close() {
      await pool.end();
    },
  };
}

export type RealS3TransportOptions = {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
};

/**
 * Real HTTP transport for S3-compatible endpoints using global fetch.
 * Signs requests with AWS Signature Version 4 (minimal implementation for PUT/GET/HEAD/DELETE).
 */
export async function createRealObjectStorageTransport(
  options: RealS3TransportOptions,
): Promise<HttpTransport> {
  const flags = readRealClientFlags();
  if (!flags.enableRealObjectStorage) {
    throw new Error("REAL_CLIENT_DISABLED: set PAKKADEED_ENABLE_REAL_OBJECT_STORAGE=1 to use real object storage HTTP");
  }
  if (typeof fetch !== "function") {
    throw new Error("REAL_CLIENT_UNAVAILABLE: global fetch is not available in this runtime");
  }
  const region = options.region ?? "us-east-1";
  const accessKeyId = options.accessKeyId;
  const secretAccessKey = options.secretAccessKey;

  return {
    async request(input: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: Uint8Array;
    }): Promise<HttpResponse> {
      const url = new URL(input.url);
      const body = input.body ? Buffer.from(input.body) : undefined;
      const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      const dateStamp = amzDate.slice(0, 8);
      const payloadHash = createHash("sha256").update(body ?? "").digest("hex");
      const headers: Record<string, string> = {
        host: url.host,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        ...(input.headers ?? {}),
      };
      if (body) headers["content-length"] = String(body.byteLength);

      const signedHeaders = Object.keys(headers)
        .map((h) => h.toLowerCase())
        .sort()
        .join(";");
      const canonicalHeaders = Object.keys(headers)
        .map((h) => h.toLowerCase())
        .sort()
        .map((h) => `${h}:${headers[Object.keys(headers).find((k) => k.toLowerCase() === h)!]!.trim()}\n`)
        .join("");
      const canonicalRequest = [
        input.method,
        url.pathname,
        url.search.replace(/^\?/, ""),
        canonicalHeaders,
        signedHeaders,
        payloadHash,
      ].join("\n");
      const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
      const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        createHash("sha256").update(canonicalRequest).digest("hex"),
      ].join("\n");
      const kDate = createHmac("sha256", `AWS4${secretAccessKey}`).update(dateStamp).digest();
      const kRegion = createHmac("sha256", kDate).update(region).digest();
      const kService = createHmac("sha256", kRegion).update("s3").digest();
      const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
      const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
      headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const response: any = await fetch(input.url, {
        method: input.method,
        headers,
        body,
      });
      const buffer = new Uint8Array(await response.arrayBuffer());
      const responseHeaders: Record<string, string> = {};
      if (response.headers && typeof response.headers.forEach === "function") {
        response.headers.forEach((value: string, key: string) => {
          responseHeaders[key] = value;
        });
      }
      return { status: response.status, body: buffer, headers: responseHeaders };
    },
  };
}
