/**
 * PD-042 — Customer journey backed by ApplicationPgRepository (canonical PostgreSQL).
 * Used when bootstrapPostgresApplication() has succeeded.
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  ApplicationPgRepository,
  hashToken,
  type UserRow,
} from "../storage/application-repository";
import { hashPassword, verifyPassword } from "../commercial/auth";
import { encryptPrivateObject, decryptPrivateObject } from "../deployment/encrypted-storage";
import { analysePropertyPack } from "../pipeline/analyse-pack";
import { generateExecutiveReport } from "../reporting/executive-report";
import { createPropertyPassport, updatePropertyPassport } from "../passport/property-passport";
import type { Jurisdiction } from "../domain/models";

export class PgCustomerApplication {
  constructor(
    private readonly repo: ApplicationPgRepository,
    private readonly storageSecret: string,
    private readonly maxUploadBytes = 15 * 1024 * 1024,
  ) {}

  async register(input: { email: string; displayName: string; password: string }): Promise<{ userId: string }> {
    const email = input.email.trim().toLowerCase();
    if (await this.repo.findUserByEmail(email)) throw new Error("EMAIL_ALREADY_REGISTERED");
    const id = `usr_${randomUUID()}`;
    const passwordHash = hashPassword(input.password);
    await this.repo.insertUser({
      id,
      email,
      displayName: input.displayName.trim(),
      role: "CUSTOMER",
      passwordHash,
      verified: true,
      createdAt: new Date().toISOString(),
    });
    await this.repo.insertAudit({ actorUserId: id, action: "USER_REGISTERED", resourceType: "user", resourceId: id });
    return { userId: id };
  }

  async login(input: { email: string; password: string }): Promise<{ token: string; userId: string }> {
    const user = await this.repo.findUserByEmail(input.email.trim().toLowerCase());
    if (!user || !verifyPassword(input.password, user.passwordHash)) throw new Error("INVALID_CREDENTIALS");
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    await this.repo.insertSession({
      id: `ses_${randomBytes(8).toString("hex")}`,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: now.toISOString(),
    });
    await this.repo.insertAudit({ actorUserId: user.id, action: "USER_LOGIN", resourceType: "session" });
    return { token, userId: user.id };
  }

  async logout(token: string): Promise<void> {
    await this.repo.revokeSession(hashToken(token), new Date().toISOString());
  }

  async authenticate(token: string): Promise<UserRow> {
    const session = await this.repo.findSessionByTokenHash(hashToken(token));
    if (!session || session.revokedAt || new Date(session.expiresAt) <= new Date()) {
      throw new Error("UNAUTHENTICATED");
    }
    const user = await this.repo.findUserById(session.userId);
    if (!user) throw new Error("UNAUTHENTICATED");
    return user;
  }

  async createProperty(token: string, input: { label: string; jurisdiction: string }) {
    const user = await this.authenticate(token);
    const now = new Date().toISOString();
    const id = `prop_${randomUUID()}`;
    await this.repo.insertProperty({
      id,
      label: input.label.trim(),
      country: "Pakistan",
      jurisdiction: input.jurisdiction,
      userId: user.id,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
    await this.repo.insertAudit({
      actorUserId: user.id,
      action: "PROPERTY_CREATED",
      resourceType: "property",
      resourceId: id,
    });
    return (await this.repo.getProperty(id))!;
  }

  async listProperties(token: string) {
    const user = await this.authenticate(token);
    return this.repo.listPropertiesByUser(user.id);
  }

  async getProperty(token: string, propertyId: string) {
    const user = await this.authenticate(token);
    const property = await this.repo.getProperty(propertyId);
    if (!property) throw new Error("PROPERTY_NOT_FOUND");
    if (property.userId !== user.id) throw new Error("FORBIDDEN");
    return property;
  }

  async uploadTextDocument(token: string, input: { propertyId: string; fileName: string; text: string }) {
    return this.uploadDocument(token, {
      propertyId: input.propertyId,
      fileName: input.fileName,
      contentType: "text/plain",
      bytes: Buffer.from(input.text, "utf8"),
    });
  }

  async uploadDocument(
    token: string,
    input: { propertyId: string; fileName: string; contentType: string; bytes: Uint8Array },
  ) {
    const user = await this.authenticate(token);
    const property = await this.getProperty(token, input.propertyId);
    if (!input.fileName.trim()) throw new Error("FILE_NAME_REQUIRED");
    if (!input.bytes.byteLength) throw new Error("DOCUMENT_EMPTY");
    if (input.bytes.byteLength > this.maxUploadBytes) throw new Error("UPLOAD_TOO_LARGE");
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    const id = `doc_${randomUUID()}`;
    const objectKey = `objects/${property.id}/${id}`;
    const plaintext = Buffer.from(input.bytes).toString("base64");
    const encrypted = encryptPrivateObject({ objectKey, plaintext, secret: this.storageSecret });
    // Pack integrity hash into algorithm field suffix for schema without sha column: aes-256-gcm|<sha>
    await this.repo.insertEncryptedObject({
      objectKey,
      algorithm: `${encrypted.algorithm}|${encrypted.plaintextSha256}`,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      ciphertext: encrypted.ciphertext,
      createdAt: encrypted.createdAt,
    });
    const now = new Date().toISOString();
    await this.repo.insertDocument({
      id,
      propertyId: property.id,
      ownerUserId: user.id,
      fileName: input.fileName,
      contentType: input.contentType,
      mimeType: input.contentType,
      sha256,
      storageKey: objectKey,
      sizeBytes: input.bytes.byteLength,
      status: "UPLOADED",
      createdAt: now,
    });
    await this.repo.updatePropertyStatus(property.id, "UPLOADING", now);
    const jobId = `job_${randomUUID()}`;
    await this.repo.insertJob({
      id: jobId,
      documentId: id,
      propertyId: property.id,
      stage: "OCR",
      state: "PENDING",
      attempts: 0,
      maxAttempts: 3,
      createdAt: now,
      updatedAt: now,
    });
    await this.repo.insertAudit({
      actorUserId: user.id,
      action: "DOCUMENT_UPLOADED",
      resourceType: "document",
      resourceId: id,
    });
    return {
      id,
      propertyId: property.id,
      ownerUserId: user.id,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
      sha256,
      objectKey,
      createdAt: now,
      jobId,
    };
  }

  async analyseProperty(token: string, propertyId: string) {
    const user = await this.authenticate(token);
    const property = await this.getProperty(token, propertyId);
    const docs = await this.repo.listDocuments(propertyId);
    if (!docs.length) throw new Error("NO_DOCUMENTS");
    const texts: Array<{ documentId: string; text: string }> = [];
    for (const doc of docs) {
      if (doc.contentType === "text/plain" || doc.mimeType === "text/plain") {
        const obj = await this.repo.getEncryptedObject(doc.storageKey);
        if (!obj) throw new Error("OBJECT_NOT_FOUND");
        const algoRaw = String(obj.algorithm);
        const [algo, sha] = algoRaw.split("|");
        const plainB64 = decryptPrivateObject(
          {
            objectKey: doc.storageKey,
            algorithm: (algo as "aes-256-gcm") || "aes-256-gcm",
            iv: String(obj.iv),
            authTag: String(obj.auth_tag),
            ciphertext: String(obj.ciphertext),
            plaintextSha256: sha || "",
            createdAt: new Date().toISOString(),
          },
          this.storageSecret,
        );
        texts.push({ documentId: doc.id, text: Buffer.from(plainB64, "base64").toString("utf8") });
      } else {
        throw new Error("LIVE_OCR_REQUIRED");
      }
    }
    const now = new Date().toISOString();
    await this.repo.updatePropertyStatus(propertyId, "PROCESSING", now);
    const claimed = await this.repo.claimNextJob(`web-analyse-${user.id}`, 60_000);
    const analysis = analysePropertyPack({
      jurisdiction: property.jurisdiction as Jurisdiction,
      documents: texts.map((t) => ({
        documentId: t.documentId,
        text: t.text,
        jurisdictionHint: property.jurisdiction as Jurisdiction,
      })),
    });
    const passportId = randomUUID();
    const report = generateExecutiveReport({
      propertyId,
      passportId,
      analysis,
      version: 1,
    });
    const passport = createPropertyPassport({ propertyId, report, analysis, passportId });
    await this.repo.insertReport({
      verificationId: report.verificationId,
      propertyId,
      passportId,
      version: 1,
      body: report,
      createdAt: now,
    });
    await this.repo.upsertPassport({
      id: passportId,
      propertyId,
      publicId: passport.publicId,
      body: passport,
      updatedAt: now,
    });
    await this.repo.attachReportLinks(propertyId, report.verificationId, passport.publicId, now);
    if (claimed) await this.repo.completeJob(claimed.id);
    await this.repo.insertAudit({
      actorUserId: user.id,
      action: "PROPERTY_ANALYSED",
      resourceType: "property",
      resourceId: propertyId,
    });
    return { property: await this.repo.getProperty(propertyId), report, passport };
  }

  async getProcessingStatus(token: string, propertyId: string) {
    await this.getProperty(token, propertyId);
    const property = await this.repo.getProperty(propertyId);
    const docs = await this.repo.listDocuments(propertyId);
    const report = await this.repo.getReportByProperty(propertyId);
    const passport = await this.repo.getPassportByProperty(propertyId);
    return {
      propertyId,
      status: property!.status,
      documentCount: docs.length,
      reportReady: !!report,
      passportReady: !!passport,
      missingDocuments: docs.length === 0 ? ["FARD"] : [],
    };
  }

  async getPropertyReport(token: string, propertyId: string) {
    await this.getProperty(token, propertyId);
    const report = await this.repo.getReportByProperty(propertyId);
    if (!report) throw new Error("REPORT_NOT_READY");
    return report.body;
  }

  async getPassport(token: string, propertyId: string) {
    await this.getProperty(token, propertyId);
    const passport = await this.repo.getPassportByProperty(propertyId);
    if (!passport) throw new Error("PASSPORT_NOT_READY");
    return passport.body;
  }
}
