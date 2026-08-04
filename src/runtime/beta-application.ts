import { createHash, randomUUID } from "node:crypto";
import { registerUser, issueSession, validateSession, verifyPassword } from "../commercial/auth";
import { createWorkspaceProperty, transitionWorkspace, attachReport } from "../commercial/workspace";
import type { BetaUser, Session, WorkspaceProperty } from "../commercial/types";
import type { Jurisdiction } from "../domain/models";
import { analysePropertyPack } from "../pipeline/analyse-pack";
import { generateExecutiveReport, type ExecutiveReport } from "../reporting/executive-report";
import { createPropertyPassport, updatePropertyPassport, type PropertyPassport } from "../passport/property-passport";
import { decryptPrivateObject, encryptPrivateObject, type EncryptedObject } from "../deployment/encrypted-storage";
import type { HealthAwareOcrProvider } from "../deployment/live-ocr";
import { createDefaultOcrStack } from "../deployment/live-ocr";
import type { DurableRepository } from "../storage/repository";
import type { HealthAwareObjectStorage } from "../storage/private-object-storage";
import { DependencyHealthRegistry, type ConnectionRecord } from "../production/health-probes";
import { MemoryRuntimeStateStore, type RuntimeStateStore, type PersistedRuntimeState } from "./durable-store";

export type RuntimeDocument = {
  id: string; propertyId: string; ownerUserId: string; fileName: string; contentType: string;
  sizeBytes: number; sha256: string; objectKey: string; createdAt: string;
};
type StoredSession = Session & { token: string };
export type BetaApplicationOptions = {
  store?: RuntimeStateStore;
  storageSecret?: string;
  maxUploadBytes?: number;
  ocr?: HealthAwareOcrProvider;
  repository?: DurableRepository;
  objectStorage?: HealthAwareObjectStorage;
  health?: DependencyHealthRegistry;
};

export class BetaApplication {
  private readonly users = new Map<string, BetaUser>();
  private readonly usersByEmail = new Map<string, string>();
  private readonly sessions = new Map<string, StoredSession>();
  private readonly properties = new Map<string, WorkspaceProperty>();
  private readonly documents = new Map<string, RuntimeDocument>();
  private readonly reports = new Map<string, ExecutiveReport>();
  private readonly passports = new Map<string, PropertyPassport>();
  private readonly objects = new Map<string, EncryptedObject>();
  private readonly store: RuntimeStateStore;
  private readonly storageSecret: string;
  private readonly maxUploadBytes: number;
  private readonly ocr: HealthAwareOcrProvider;
  private readonly repository?: DurableRepository;
  private readonly objectStorage?: HealthAwareObjectStorage;
  private readonly health: DependencyHealthRegistry;

  constructor(options: BetaApplicationOptions = {}) {
    this.store = options.store ?? new MemoryRuntimeStateStore();
    this.storageSecret = options.storageSecret ?? "local-beta-storage-secret-change-before-production";
    this.maxUploadBytes = options.maxUploadBytes ?? 15 * 1024 * 1024;
    this.ocr = options.ocr ?? createDefaultOcrStack();
    this.repository = options.repository;
    this.objectStorage = options.objectStorage;
    this.health = options.health ?? new DependencyHealthRegistry();
    const state = this.store.load();
    if (state) this.hydrate(state);
  }

  dependencyStatus(): ConnectionRecord[] {
    return this.health.list();
  }

  async probeDependencies(): Promise<ConnectionRecord[]> {
    await this.health.probeAll();
    return this.health.list();
  }

  register(input: { email: string; displayName: string; password: string }): { userId: string } {
    const email = input.email.trim().toLowerCase();
    if (this.usersByEmail.has(email)) throw new Error("EMAIL_ALREADY_REGISTERED");
    const user = registerUser({ id: `usr_${randomUUID()}`, ...input, email });
    user.verified = true;
    this.users.set(user.id, user); this.usersByEmail.set(user.email, user.id); this.persist();
    return { userId: user.id };
  }
  login(input: { email: string; password: string }): { token: string; userId: string } {
    const userId = this.usersByEmail.get(input.email.trim().toLowerCase());
    if (!userId) throw new Error("INVALID_CREDENTIALS");
    const user = this.users.get(userId)!;
    if (!verifyPassword(input.password, user.passwordHash)) throw new Error("INVALID_CREDENTIALS");
    const issued = issueSession(user.id);
    this.sessions.set(issued.session.id, { ...issued.session, token: issued.token }); this.persist();
    return { token: issued.token, userId: user.id };
  }
  authenticate(token: string): BetaUser {
    const stored = [...this.sessions.values()].find((item) => item.token === token);
    if (!stored || !validateSession(token, stored)) throw new Error("UNAUTHENTICATED");
    const user = this.users.get(stored.userId); if (!user) throw new Error("UNAUTHENTICATED");
    return structuredClone(user);
  }
  logout(token: string): void {
    const stored = [...this.sessions.values()].find((item) => item.token === token);
    if (!stored) return;
    stored.revokedAt = new Date().toISOString();
    this.sessions.set(stored.id, stored);
    this.persist();
  }
  getProperty(token: string, propertyId: string): WorkspaceProperty {
    const user = this.authenticate(token);
    return structuredClone(this.requireOwnedProperty(user.id, propertyId));
  }
  listDocuments(token: string, propertyId: string): RuntimeDocument[] {
    const user = this.authenticate(token);
    this.requireOwnedProperty(user.id, propertyId);
    return [...this.documents.values()]
      .filter((d) => d.propertyId === propertyId)
      .map((d) => structuredClone(d));
  }
  getPropertyReport(token: string, propertyId: string): ExecutiveReport {
    const user = this.authenticate(token);
    const property = this.requireOwnedProperty(user.id, propertyId);
    if (property.latestReportVerificationId) {
      const byKey = this.reports.get(property.latestReportVerificationId);
      if (byKey) return structuredClone(byKey);
    }
    for (const r of this.reports.values()) {
      if (r.propertyId === propertyId) return structuredClone(r);
    }
    throw new Error("REPORT_NOT_READY");
  }
  getProcessingStatus(token: string, propertyId: string): {
    propertyId: string;
    status: string;
    documentCount: number;
    reportReady: boolean;
    passportReady: boolean;
    missingDocuments: string[];
  } {
    const user = this.authenticate(token);
    const property = this.requireOwnedProperty(user.id, propertyId);
    const docs = [...this.documents.values()].filter((d) => d.propertyId === propertyId);
    const reportReady = this.passports.has(propertyId) || [...this.reports.values()].some((r) => (r as any).propertyId === propertyId);
    const passportReady = this.passports.has(propertyId);
    const missingDocuments: string[] = [];
    if (docs.length === 0) missingDocuments.push("FARD");
    return {
      propertyId,
      status: property.status,
      documentCount: docs.length,
      reportReady,
      passportReady,
      missingDocuments,
    };
  }

  createProperty(token: string, input: { label: string; jurisdiction: Jurisdiction }): WorkspaceProperty {
    const user = this.authenticate(token);
    const property = createWorkspaceProperty({ userId: user.id, label: input.label, jurisdiction: input.jurisdiction });
    this.properties.set(property.id, property); this.persist(); return structuredClone(property);
  }
  listProperties(token: string): WorkspaceProperty[] {
    const user = this.authenticate(token);
    return [...this.properties.values()].filter((item) => item.userId === user.id).map((item) => structuredClone(item));
  }
  uploadTextDocument(token: string, input: { propertyId: string; fileName: string; text: string }): RuntimeDocument {
    return this.uploadDocument(token, { ...input, contentType: "text/plain", bytes: Buffer.from(input.text, "utf8") });
  }
  uploadDocument(token: string, input: { propertyId: string; fileName: string; contentType: string; bytes: Uint8Array }): RuntimeDocument {
    const user = this.authenticate(token); const property = this.requireOwnedProperty(user.id, input.propertyId);
    if (!input.fileName.trim()) throw new Error("FILE_NAME_REQUIRED");
    if (!input.bytes.byteLength) throw new Error("DOCUMENT_EMPTY");
    if (input.bytes.byteLength > this.maxUploadBytes) throw new Error("UPLOAD_TOO_LARGE");
    const allowed = new Set(["text/plain", "application/pdf", "image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff", "image/heic", "image/heif", "image/gif", "image/jpg"]);
    if (!allowed.has(input.contentType)) throw new Error("UNSUPPORTED_CONTENT_TYPE");
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    const duplicate = [...this.documents.values()].find((d) => d.propertyId === property.id && d.sha256 === sha256);
    if (duplicate) return structuredClone(duplicate);
    const id = `doc_${randomUUID()}`; const objectKey = `${user.id}/${property.id}/${id}`;
    const encoded = Buffer.from(input.bytes).toString("base64");
    this.objects.set(objectKey, encryptPrivateObject({ objectKey, plaintext: encoded, secret: this.storageSecret }));
    const document: RuntimeDocument = { id, propertyId: property.id, ownerUserId: user.id, fileName: input.fileName.trim(), contentType: input.contentType, sizeBytes: input.bytes.byteLength, sha256, objectKey, createdAt: new Date().toISOString() };
    this.documents.set(id, document);
    this.properties.set(property.id, property.status === "DRAFT" ? transitionWorkspace(property, "UPLOADING") : property);
    this.persist(); return structuredClone(document);
  }
  async analyseProperty(token: string, propertyId: string): Promise<{ property: WorkspaceProperty; report: ExecutiveReport; passport: PropertyPassport }> {
    const user = this.authenticate(token); let property = this.requireOwnedProperty(user.id, propertyId);
    const docs = [...this.documents.values()].filter((item) => item.propertyId === propertyId); if (!docs.length) throw new Error("NO_DOCUMENTS");
    const texts: Array<{ documentId: string; text: string }> = [];
    for (const item of docs) {
      const text = await this.resolveDocumentText(item);
      texts.push({ documentId: item.id, text });
    }
    if (property.status === "DRAFT") property = transitionWorkspace(property, "UPLOADING");
    if (["UPLOADING", "FAILED", "REPORT_READY"].includes(property.status)) property = transitionWorkspace(property, "PROCESSING");
    this.properties.set(property.id, property);
    const analysis = analysePropertyPack({ jurisdiction: property.jurisdiction as Jurisdiction, documents: texts.map((item) => ({ documentId: item.documentId, text: item.text, jurisdictionHint: property.jurisdiction as Jurisdiction })) });
    const existing = this.passports.get(propertyId); const passportId = existing?.id ?? randomUUID();
    const report = generateExecutiveReport({ propertyId, passportId, analysis, version: (existing?.reports.length ?? 0) + 1 });
    const passport = existing ? updatePropertyPassport(existing, report, analysis) : createPropertyPassport({ propertyId, report, analysis, passportId });
    this.reports.set(report.verificationId, report); this.passports.set(propertyId, passport);
    property = attachReport(property, { verificationId: report.verificationId, passportPublicId: passport.publicId }); this.properties.set(propertyId, property);
    this.persist(); return { property: structuredClone(property), report: structuredClone(report), passport: structuredClone(passport) };
  }

  /** Resolve plaintext for analysis. Text documents are decoded directly; binaries go through OCR. */
  private async resolveDocumentText(document: RuntimeDocument): Promise<string> {
    if (document.contentType === "text/plain") {
      return this.readText(document);
    }
    const bytes = this.readBytes(document);
    try {
      const ocr = await this.ocr.extract({ documentId: document.id, mimeType: document.contentType, bytes });
      if (ocr.text && ocr.text.trim()) return ocr.text;
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCR failed";
      if (!message.startsWith("NOT_CONNECTED") && !message.includes("No OCR fixture")) {
        // Unexpected OCR errors still surface as LIVE_OCR_REQUIRED for beta safety.
      }
    }
    throw new Error("LIVE_OCR_REQUIRED");
  }

  private readBytes(document: RuntimeDocument): Uint8Array {
    const obj = this.objects.get(document.objectKey);
    if (!obj) throw new Error("OBJECT_NOT_FOUND");
    return Buffer.from(decryptPrivateObject(obj, this.storageSecret), "base64");
  }
  getPassport(token: string, propertyId: string): PropertyPassport { const user = this.authenticate(token); this.requireOwnedProperty(user.id, propertyId); const p=this.passports.get(propertyId); if(!p) throw new Error("PASSPORT_NOT_READY"); return structuredClone(p); }
  getReportByVerificationId(id: string): ExecutiveReport { const r=this.reports.get(id); if(!r) throw new Error("REPORT_NOT_FOUND"); return structuredClone(r); }
  private readText(document: RuntimeDocument): string { const obj=this.objects.get(document.objectKey); if(!obj) throw new Error("OBJECT_NOT_FOUND"); return Buffer.from(decryptPrivateObject(obj,this.storageSecret),"base64").toString("utf8"); }
  private requireOwnedProperty(userId:string, propertyId:string):WorkspaceProperty { const p=this.properties.get(propertyId); if(!p) throw new Error("PROPERTY_NOT_FOUND"); if(p.userId!==userId) throw new Error("FORBIDDEN"); return p; }
  private hydrate(s: PersistedRuntimeState): void { for(const x of s.users){this.users.set(x.id,x);this.usersByEmail.set(x.email,x.id)} for(const x of s.sessions)this.sessions.set(x.id,x); for(const x of s.properties)this.properties.set(x.id,x); for(const x of s.documents)this.documents.set(x.id,x); for(const x of s.reports)this.reports.set(x.verificationId,x); for(const x of s.passports)this.passports.set(x.propertyId,x); for(const x of s.objects)this.objects.set(x.objectKey,x); }
  private persist(): void { this.store.save({ schemaVersion:1, users:[...this.users.values()], sessions:[...this.sessions.values()], properties:[...this.properties.values()], documents:[...this.documents.values()], reports:[...this.reports.values()], passports:[...this.passports.values()], objects:[...this.objects.values()] }); }
}
