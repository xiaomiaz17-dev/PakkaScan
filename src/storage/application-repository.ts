/**
 * PD-041 — Canonical PostgreSQL application repository.
 * Parameterised SQL with explicit column lists and row mappers.
 * Memory transport is for unit tests only; production uses real pg.
 */

import { createHash, randomUUID } from "node:crypto";
import type { SqlTransport } from "./postgres-driver";
import type { JobRecord, PropertyRecord, DocumentRecord } from "./repository";

export type UserRow = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  passwordHash: string;
  verified: boolean;
  createdAt: string;
};

export type SessionRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
};

export type ReportRow = {
  verificationId: string;
  propertyId: string;
  passportId?: string;
  version: number;
  body: unknown;
  createdAt: string;
};

export type PassportRow = {
  id: string;
  propertyId: string;
  publicId: string;
  body: unknown;
  updatedAt: string;
};

function asString(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}

function asBool(v: unknown): boolean {
  return v === true || v === "t" || v === "true" || v === 1;
}

function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return new Date().toISOString();
}

export function mapUser(row: Record<string, unknown>): UserRow {
  return {
    id: asString(row.id),
    email: asString(row.email),
    displayName: asString(row.display_name ?? row.displayName),
    role: asString(row.role, "CUSTOMER"),
    passwordHash: asString(row.password_hash ?? row.passwordHash),
    verified: asBool(row.verified),
    createdAt: iso(row.created_at ?? row.createdAt),
  };
}

export function mapSession(row: Record<string, unknown>): SessionRow {
  return {
    id: asString(row.id),
    userId: asString(row.user_id ?? row.userId),
    tokenHash: asString(row.token_hash ?? row.tokenHash),
    expiresAt: iso(row.expires_at ?? row.expiresAt),
    revokedAt: row.revoked_at || row.revokedAt ? iso(row.revoked_at ?? row.revokedAt) : undefined,
    createdAt: iso(row.created_at ?? row.createdAt),
  };
}

export function mapProperty(row: Record<string, unknown>): PropertyRecord & {
  status: string;
  passportPublicId?: string;
  latestReportVerificationId?: string;
  updatedAt: string;
} {
  return {
    id: asString(row.id),
    label: asString(row.label),
    country: asString(row.country, "Pakistan"),
    province: row.province == null ? undefined : asString(row.province),
    jurisdiction: asString(row.jurisdiction),
    userId: asString(row.user_id ?? row.userId),
    createdAt: iso(row.created_at ?? row.createdAt),
    status: asString(row.status, "DRAFT"),
    passportPublicId: row.passport_public_id || row.passportPublicId ? asString(row.passport_public_id ?? row.passportPublicId) : undefined,
    latestReportVerificationId:
      row.latest_report_verification_id || row.latestReportVerificationId
        ? asString(row.latest_report_verification_id ?? row.latestReportVerificationId)
        : undefined,
    updatedAt: iso(row.updated_at ?? row.updatedAt ?? row.created_at),
  };
}

export function mapDocument(row: Record<string, unknown>): DocumentRecord & { ownerUserId: string; contentType: string } {
  return {
    id: asString(row.id),
    propertyId: asString(row.property_id ?? row.propertyId),
    filename: asString(row.file_name ?? row.filename ?? row.fileName),
    mimeType: asString(row.mime_type ?? row.mimeType),
    sha256: asString(row.sha256),
    storageKey: asString(row.storage_key ?? row.storageKey),
    sizeBytes: asNumber(row.size_bytes ?? row.sizeBytes),
    status: asString(row.status, "UPLOADED"),
    createdAt: iso(row.created_at ?? row.createdAt),
    ownerUserId: asString(row.owner_user_id ?? row.ownerUserId),
    contentType: asString(row.content_type ?? row.contentType ?? row.mime_type),
  };
}

export function mapJob(row: Record<string, unknown>): JobRecord & {
  leaseOwner?: string;
  leaseExpiresAt?: string;
  deadLetteredAt?: string;
} {
  return {
    id: asString(row.id),
    documentId: asString(row.document_id ?? row.documentId),
    propertyId: asString(row.property_id ?? row.propertyId),
    stage: asString(row.stage) as JobRecord["stage"],
    state: asString(row.state) as JobRecord["state"],
    attempts: asNumber(row.attempts),
    maxAttempts: asNumber(row.max_attempts ?? row.maxAttempts, 3),
    nextAttemptAt: row.next_attempt_at || row.nextAttemptAt ? iso(row.next_attempt_at ?? row.nextAttemptAt) : undefined,
    lastError: row.last_error || row.lastError ? asString(row.last_error ?? row.lastError) : undefined,
    payload: row.payload == null ? undefined : (typeof row.payload === "string" ? JSON.parse(asString(row.payload)) : row.payload),
    createdAt: iso(row.created_at ?? row.createdAt),
    updatedAt: iso(row.updated_at ?? row.updatedAt),
    leaseOwner: row.lease_owner || row.leaseOwner ? asString(row.lease_owner ?? row.leaseOwner) : undefined,
    leaseExpiresAt: row.lease_expires_at || row.leaseExpiresAt ? iso(row.lease_expires_at ?? row.leaseExpiresAt) : undefined,
    deadLetteredAt: row.dead_lettered_at || row.deadLetteredAt ? iso(row.dead_lettered_at ?? row.deadLetteredAt) : undefined,
  };
}

export class ApplicationPgRepository {
  constructor(private readonly transport: SqlTransport) {}

  async insertUser(user: UserRow): Promise<void> {
    await this.transport.query(
      `INSERT INTO users (id, email, display_name, role, password_hash, verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.email, user.displayName, user.role, user.passwordHash, user.verified, user.createdAt],
    );
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const r = await this.transport.query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email.toLowerCase()]);
    return r.rows[0] ? mapUser(r.rows[0]!) : null;
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const r = await this.transport.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
    return r.rows[0] ? mapUser(r.rows[0]!) : null;
  }

  async insertSession(session: SessionRow): Promise<void> {
    await this.transport.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, revoked_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [session.id, session.userId, session.tokenHash, session.expiresAt, session.revokedAt ?? null, session.createdAt],
    );
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionRow | null> {
    const r = await this.transport.query(`SELECT * FROM sessions WHERE token_hash = $1 LIMIT 1`, [tokenHash]);
    return r.rows[0] ? mapSession(r.rows[0]!) : null;
  }

  async revokeSession(tokenHash: string, revokedAt: string): Promise<void> {
    await this.transport.query(`UPDATE sessions SET revoked_at = $2 WHERE token_hash = $1`, [tokenHash, revokedAt]);
  }

  async insertProperty(p: {
    id: string;
    label: string;
    country: string;
    province?: string;
    jurisdiction: string;
    userId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    await this.transport.query(
      `INSERT INTO properties (
         id, label, country, province, jurisdiction, user_id, status,
         passport_public_id, latest_report_verification_id, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        p.id,
        p.label,
        p.country,
        p.province ?? null,
        p.jurisdiction,
        p.userId,
        p.status,
        null,
        null,
        p.createdAt,
        p.updatedAt,
      ],
    );
  }

  async listPropertiesByUser(userId: string) {
    const r = await this.transport.query(`SELECT * FROM properties WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return r.rows.map(mapProperty);
  }

  async getProperty(id: string) {
    const r = await this.transport.query(`SELECT * FROM properties WHERE id = $1 LIMIT 1`, [id]);
    return r.rows[0] ? mapProperty(r.rows[0]!) : null;
  }

  async updatePropertyStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await this.transport.query(`UPDATE properties SET status = $2, updated_at = $3 WHERE id = $1`, [id, status, updatedAt]);
  }

  async attachReportLinks(id: string, verificationId: string, passportPublicId: string, updatedAt: string): Promise<void> {
    await this.transport.query(
      `UPDATE properties SET latest_report_verification_id = $2, passport_public_id = $3, status = 'REPORT_READY', updated_at = $4 WHERE id = $1`,
      [id, verificationId, passportPublicId, updatedAt],
    );
  }

  async insertDocument(d: {
    id: string;
    propertyId: string;
    ownerUserId: string;
    fileName: string;
    contentType: string;
    mimeType: string;
    sha256: string;
    storageKey: string;
    sizeBytes: number;
    status: string;
    createdAt: string;
  }): Promise<void> {
    await this.transport.query(
      `INSERT INTO documents (
         id, property_id, owner_user_id, file_name, content_type, mime_type,
         sha256, storage_key, size_bytes, status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        d.id,
        d.propertyId,
        d.ownerUserId,
        d.fileName,
        d.contentType,
        d.mimeType,
        d.sha256,
        d.storageKey,
        d.sizeBytes,
        d.status,
        d.createdAt,
      ],
    );
  }

  async listDocuments(propertyId: string) {
    const r = await this.transport.query(`SELECT * FROM documents WHERE property_id = $1 ORDER BY created_at ASC`, [propertyId]);
    return r.rows.map(mapDocument);
  }

  async insertJob(job: JobRecord): Promise<void> {
    await this.transport.query(
      `INSERT INTO jobs (
         id, document_id, property_id, stage, state, attempts, max_attempts,
         next_attempt_at, last_error, payload, lease_owner, lease_expires_at,
         dead_lettered_at, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        job.id,
        job.documentId,
        job.propertyId,
        job.stage,
        job.state,
        job.attempts,
        job.maxAttempts,
        job.nextAttemptAt ?? null,
        job.lastError ?? null,
        job.payload ? JSON.stringify(job.payload) : null,
        null,
        null,
        null,
        job.createdAt,
        job.updatedAt,
      ],
    );
  }

  /**
   * Atomic claim using SKIP LOCKED semantics on a runnable job.
   * Callers on real Postgres should run this inside a transaction when available.
   */
  async claimNextJob(ownerId: string, leaseMs: number, now = new Date()): Promise<(JobRecord & { leaseOwner?: string; leaseExpiresAt?: string }) | null> {
    const nowIso = now.toISOString();
    const leaseUntil = new Date(now.getTime() + leaseMs).toISOString();
    // Prefer real SKIP LOCKED path; MemorySqlTransport emulates via sequential select.
    const selectable = await this.transport.query(
      `SELECT * FROM jobs
       WHERE state IN ('PENDING', 'FAILED', 'RUNNING')
         AND attempts < max_attempts
         AND (next_attempt_at IS NULL OR next_attempt_at <= $1)
         AND (lease_expires_at IS NULL OR lease_expires_at <= $1 OR lease_owner = $2)
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [nowIso, ownerId],
    );
    const row = selectable.rows[0];
    if (!row) return null;
    const id = asString(row.id);
    await this.transport.query(
      `UPDATE jobs SET
         state = 'RUNNING',
         attempts = attempts + 1,
         lease_owner = $2,
         lease_expires_at = $3,
         updated_at = $4
       WHERE id = $1`,
      [id, ownerId, leaseUntil, nowIso],
    );
    const refreshed = await this.transport.query(`SELECT * FROM jobs WHERE id = $1`, [id]);
    return refreshed.rows[0] ? mapJob(refreshed.rows[0]!) : null;
  }

  async completeJob(jobId: string, now = new Date()): Promise<void> {
    await this.transport.query(
      `UPDATE jobs SET state = 'SUCCEEDED', lease_owner = NULL, lease_expires_at = NULL, updated_at = $2 WHERE id = $1`,
      [jobId, now.toISOString()],
    );
  }

  async failJob(jobId: string, error: string, nextAttemptAt: string | null, deadLetter: boolean, now = new Date()): Promise<void> {
    await this.transport.query(
      `UPDATE jobs SET
         state = $2,
         last_error = $3,
         next_attempt_at = $4,
         dead_lettered_at = $5,
         lease_owner = NULL,
         lease_expires_at = NULL,
         updated_at = $6
       WHERE id = $1`,
      [
        jobId,
        deadLetter ? "DEAD_LETTER" : "FAILED",
        error,
        nextAttemptAt,
        deadLetter ? now.toISOString() : null,
        now.toISOString(),
      ],
    );
  }

  async insertReport(report: ReportRow): Promise<void> {
    await this.transport.query(
      `INSERT INTO reports (verification_id, property_id, passport_id, version, body_json, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [report.verificationId, report.propertyId, report.passportId ?? null, report.version, JSON.stringify(report.body), report.createdAt],
    );
  }

  async getReportByProperty(propertyId: string): Promise<ReportRow | null> {
    const r = await this.transport.query(
      `SELECT * FROM reports WHERE property_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [propertyId],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      verificationId: asString(row.verification_id),
      propertyId: asString(row.property_id),
      passportId: row.passport_id ? asString(row.passport_id) : undefined,
      version: asNumber(row.version, 1),
      body: typeof row.body_json === "string" ? JSON.parse(asString(row.body_json)) : row.body_json,
      createdAt: iso(row.created_at),
    };
  }

  async upsertPassport(passport: PassportRow): Promise<void> {
    await this.transport.query(
      `INSERT INTO passports (id, property_id, public_id, body_json, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (property_id) DO UPDATE SET
         body_json = EXCLUDED.body_json,
         public_id = EXCLUDED.public_id,
         updated_at = EXCLUDED.updated_at`,
      [passport.id, passport.propertyId, passport.publicId, JSON.stringify(passport.body), passport.updatedAt],
    );
  }

  async getPassportByProperty(propertyId: string): Promise<PassportRow | null> {
    const r = await this.transport.query(`SELECT * FROM passports WHERE property_id = $1 LIMIT 1`, [propertyId]);
    const row = r.rows[0];
    if (!row) return null;
    return {
      id: asString(row.id),
      propertyId: asString(row.property_id),
      publicId: asString(row.public_id),
      body: typeof row.body_json === "string" ? JSON.parse(asString(row.body_json)) : row.body_json,
      updatedAt: iso(row.updated_at),
    };
  }

  async insertEncryptedObject(obj: {
    objectKey: string;
    algorithm: string;
    iv: string;
    authTag: string;
    ciphertext: string;
    createdAt: string;
  }): Promise<void> {
    await this.transport.query(
      `INSERT INTO encrypted_objects (object_key, algorithm, iv, auth_tag, ciphertext, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (object_key) DO NOTHING`,
      [obj.objectKey, obj.algorithm, obj.iv, obj.authTag, obj.ciphertext, obj.createdAt],
    );
  }

  async getEncryptedObject(objectKey: string) {
    const r = await this.transport.query(`SELECT * FROM encrypted_objects WHERE object_key = $1 LIMIT 1`, [objectKey]);
    return r.rows[0] ?? null;
  }

  async insertAudit(event: {
    id?: string;
    actorUserId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    detail?: string;
    correlationId?: string;
    createdAt?: string;
  }): Promise<void> {
    await this.transport.query(
      `INSERT INTO audit_events (id, actor_user_id, action, resource_type, resource_id, detail, correlation_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        event.id ?? randomUUID(),
        event.actorUserId ?? null,
        event.action,
        event.resourceType ?? null,
        event.resourceId ?? null,
        event.detail ?? null,
        event.correlationId ?? null,
        event.createdAt ?? new Date().toISOString(),
      ],
    );
  }

  async probe(): Promise<{ ok: boolean; detail: string }> {
    try {
      const r = await this.transport.query(`SELECT 1 AS ok`);
      const ok = r.rows.length > 0;
      return { ok, detail: ok ? "SELECT 1 succeeded" : "empty result" };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : "probe failed" };
    }
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
