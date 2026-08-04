import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type EncryptedObject = {
  objectKey: string;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
  plaintextSha256: string;
  createdAt: string;
};

function deriveKey(secret: string): Uint8Array {
  if (secret.length < 32) throw new Error("Storage encryption secret must contain at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

export function encryptPrivateObject(input: {
  objectKey: string;
  plaintext: string;
  secret: string;
  createdAt?: string;
}): EncryptedObject {
  if (!input.objectKey.trim()) throw new Error("Object key is required");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(input.secret), iv);
  const ciphertext = Buffer.concat([cipher.update(input.plaintext, "utf8"), cipher.final()]);
  return {
    objectKey: input.objectKey,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    plaintextSha256: createHash("sha256").update(input.plaintext).digest("hex"),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function decryptPrivateObject(object: EncryptedObject, secret: string): string {
  const decipher = createDecipheriv(
    object.algorithm,
    deriveKey(secret),
    Buffer.from(object.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(object.authTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(object.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  const digest = createHash("sha256").update(plaintext).digest("hex");
  if (digest !== object.plaintextSha256) throw new Error("Object integrity verification failed");
  return plaintext;
}
