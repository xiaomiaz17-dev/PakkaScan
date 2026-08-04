/**
 * PD-034 — Automated MinIO/S3 bucket creation for staging.
 */

import { createRealObjectStorageTransport, readRealClientFlags } from "../storage/real-clients";
import type { HttpTransport } from "../storage/s3-driver";

export type MinioInitOptions = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  transport?: HttpTransport;
};

export async function ensureBucket(options: MinioInitOptions): Promise<{ ok: boolean; detail: string }> {
  const transport =
    options.transport ??
    (await createRealObjectStorageTransport({
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    }));
  const base = options.endpoint.replace(/\/$/, "");
  // MinIO / S3 create bucket: PUT /{bucket}
  const create = await transport.request({
    method: "PUT",
    url: `${base}/${options.bucket}`,
    headers: { "content-type": "application/xml" },
  });
  if (create.status === 200 || create.status === 201 || create.status === 409) {
    // 409 = already exists on some S3-compatible servers
    const head = await transport.request({
      method: "HEAD",
      url: `${base}/${options.bucket}/`,
    });
    if (head.status >= 200 && head.status < 300) {
      return { ok: true, detail: `bucket ${options.bucket} ready (create=${create.status}, head=${head.status})` };
    }
    return { ok: false, detail: `bucket head failed: ${head.status}` };
  }
  return { ok: false, detail: `bucket create failed: ${create.status}` };
}

async function main(): Promise<void> {
  const env = process.env;
  if (!readRealClientFlags(env).enableRealObjectStorage && env.PAKKADEED_ALLOW_INJECTED_MINIO !== "1") {
    console.error(JSON.stringify({ ok: false, detail: "Set PAKKADEED_ENABLE_REAL_OBJECT_STORAGE=1" }));
    process.exit(1);
  }
  const result = await ensureBucket({
    endpoint: env.OBJECT_STORAGE_ENDPOINT ?? "http://127.0.0.1:9000",
    bucket: env.OBJECT_STORAGE_BUCKET ?? "pakkadeed-staging",
    accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY ?? "pakkadeed",
    secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY ?? "pakkadeed_staging_secret",
  });
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, detail: error instanceof Error ? error.message : String(error) }));
    process.exit(1);
  });
}
