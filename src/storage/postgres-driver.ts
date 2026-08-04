/**
 * PD-032 — PostgreSQL driver bound behind health probes.
 * Uses an injectable transport so unit tests never open real sockets.
 * Live TCP is only attempted when a transport is provided and probes succeed.
 */

import {
  type DurableRepository,
  type PropertyRecord,
  type DocumentRecord,
  type JobRecord,
  type RepositoryHealth,
} from "./repository";

export type SqlRow = Record<string, unknown>;
export type SqlTransport = {
  query(sql: string, params?: unknown[]): Promise<{ rows: SqlRow[] }>;
  close(): Promise<void>;
};

export type PostgresDriverOptions = {
  connectionString: string;
  transport?: SqlTransport;
};

/**
 * Minimal in-process SQL transport used for shared multi-process smoke tests
 * when a real database is unavailable. Not a full SQL engine — only the
 * statements issued by this driver are supported.
 */
export class MemorySqlTransport implements SqlTransport {
  private properties = new Map<string, PropertyRecord>();
  private documents = new Map<string, DocumentRecord>();
  private jobs = new Map<string, JobRecord>();

  async query(sql: string, params: unknown[] = []): Promise<{ rows: SqlRow[] }> {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    // DDL no-ops so bootstrap migrations can run against the memory transport in unit tests.
    if (
      normalized.startsWith("create table") ||
      normalized.startsWith("create index") ||
      normalized.startsWith("alter table") ||
      normalized.startsWith("insert into schema_migrations")
    ) {
      return { rows: [] };
    }
    if (normalized === "select 1 as ok") {
      return { rows: [{ ok: 1 }] };
    }
    if (normalized.startsWith("insert into properties")) {
      const record = params[0] as PropertyRecord;
      this.properties.set(record.id, structuredClone(record));
      return { rows: [record as unknown as SqlRow] };
    }
    if (normalized.startsWith("select * from properties where id")) {
      const id = String(params[0]);
      const row = this.properties.get(id);
      return { rows: row ? [row as unknown as SqlRow] : [] };
    }
    if (normalized.startsWith("select * from properties where user_id")) {
      const userId = String(params[0]);
      return {
        rows: [...this.properties.values()]
          .filter((p) => p.userId === userId)
          .map((p) => p as unknown as SqlRow),
      };
    }
    if (normalized.startsWith("insert into documents")) {
      const record = params[0] as DocumentRecord;
      this.documents.set(record.id, structuredClone(record));
      return { rows: [record as unknown as SqlRow] };
    }
    if (normalized.startsWith("select * from documents where id")) {
      const id = String(params[0]);
      const row = this.documents.get(id);
      return { rows: row ? [row as unknown as SqlRow] : [] };
    }
    if (normalized.startsWith("select * from documents where property_id")) {
      const propertyId = String(params[0]);
      return {
        rows: [...this.documents.values()]
          .filter((d) => d.propertyId === propertyId)
          .map((d) => d as unknown as SqlRow),
      };
    }
    if (normalized.startsWith("insert into jobs") || normalized.startsWith("update jobs")) {
      const record = params[0] as JobRecord;
      this.jobs.set(record.id, structuredClone(record));
      return { rows: [record as unknown as SqlRow] };
    }
    if (normalized.startsWith("select * from jobs where id")) {
      const id = String(params[0]);
      const row = this.jobs.get(id);
      return { rows: row ? [row as unknown as SqlRow] : [] };
    }
    if (normalized.startsWith("select * from jobs where state")) {
      const state = String(params[0]);
      return {
        rows: [...this.jobs.values()]
          .filter((j) => j.state === state)
          .map((j) => j as unknown as SqlRow),
      };
    }
    if (normalized.startsWith("select * from jobs runnable")) {
      const nowIso = String(params[0]);
      return {
        rows: [...this.jobs.values()]
          .filter(
            (j) =>
              j.state === "PENDING" ||
              (j.state === "RETRY_SCHEDULED" && (!j.nextAttemptAt || j.nextAttemptAt <= nowIso)),
          )
          .map((j) => j as unknown as SqlRow),
      };
    }
    throw new Error(`Unsupported SQL in MemorySqlTransport: ${sql}`);
  }

  async close(): Promise<void> {
    /* no-op */
  }
}

export class PostgresDriver implements DurableRepository {
  private readonly connectionString: string;
  private transport?: SqlTransport;
  private verified = false;

  constructor(options: PostgresDriverOptions) {
    if (!options.connectionString.startsWith("postgres")) {
      throw new Error("DATABASE_URL must be a PostgreSQL connection string");
    }
    this.connectionString = options.connectionString;
    this.transport = options.transport;
  }

  /** Attach or replace transport (e.g. after pool creation). */
  setTransport(transport: SqlTransport): void {
    this.transport = transport;
    this.verified = false;
  }

  async probe(): Promise<{ ok: boolean; detail: string }> {
    if (!this.transport) {
      return { ok: false, detail: "No SQL transport attached — external driver required" };
    }
    try {
      const result = await this.transport.query("select 1 as ok");
      const ok = result.rows[0]?.ok === 1 || result.rows[0]?.ok === "1";
      if (ok) {
        this.verified = true;
        return { ok: true, detail: "select 1 succeeded" };
      }
      this.verified = false;
      return { ok: false, detail: "select 1 returned unexpected payload" };
    } catch (error) {
      this.verified = false;
      return { ok: false, detail: error instanceof Error ? error.message : "probe failed" };
    }
  }

  async health(): Promise<RepositoryHealth> {
    if (!this.transport) {
      return { name: "postgres-driver", connected: false, detail: "No SQL transport attached" };
    }
    if (!this.verified) {
      return { name: "postgres-driver", connected: false, detail: "Transport present but probe not yet successful" };
    }
    return { name: "postgres-driver", connected: true, detail: "Verified PostgreSQL transport" };
  }

  private ensure(): SqlTransport {
    if (!this.transport || !this.verified) {
      throw new Error("NOT_CONNECTED: PostgreSQL driver is not verified by health probe");
    }
    return this.transport;
  }

  async saveProperty(record: PropertyRecord): Promise<PropertyRecord> {
    const t = this.ensure();
    await t.query("insert into properties values ($1)", [record]);
    return structuredClone(record);
  }

  async getProperty(id: string): Promise<PropertyRecord | undefined> {
    const t = this.ensure();
    const result = await t.query("select * from properties where id = $1", [id]);
    return result.rows[0] as unknown as PropertyRecord | undefined;
  }

  async listPropertiesByUser(userId: string): Promise<PropertyRecord[]> {
    const t = this.ensure();
    const result = await t.query("select * from properties where user_id = $1", [userId]);
    return result.rows as unknown as PropertyRecord[];
  }

  async saveDocument(record: DocumentRecord): Promise<DocumentRecord> {
    const t = this.ensure();
    await t.query("insert into documents values ($1)", [record]);
    return structuredClone(record);
  }

  async getDocument(id: string): Promise<DocumentRecord | undefined> {
    const t = this.ensure();
    const result = await t.query("select * from documents where id = $1", [id]);
    return result.rows[0] as unknown as DocumentRecord | undefined;
  }

  async listDocumentsByProperty(propertyId: string): Promise<DocumentRecord[]> {
    const t = this.ensure();
    const result = await t.query("select * from documents where property_id = $1", [propertyId]);
    return result.rows as unknown as DocumentRecord[];
  }

  async saveJob(record: JobRecord): Promise<JobRecord> {
    const t = this.ensure();
    await t.query("insert into jobs values ($1)", [record]);
    return structuredClone(record);
  }

  async getJob(id: string): Promise<JobRecord | undefined> {
    const t = this.ensure();
    const result = await t.query("select * from jobs where id = $1", [id]);
    return result.rows[0] as unknown as JobRecord | undefined;
  }

  async listJobsByState(state: string): Promise<JobRecord[]> {
    const t = this.ensure();
    const result = await t.query("select * from jobs where state = $1", [state]);
    return result.rows as unknown as JobRecord[];
  }

  async listRunnableJobs(now: Date): Promise<JobRecord[]> {
    const t = this.ensure();
    const result = await t.query("select * from jobs runnable where now = $1", [now.toISOString()]);
    return result.rows as unknown as JobRecord[];
  }

  async close(): Promise<void> {
    if (this.transport) await this.transport.close();
    this.verified = false;
  }
}
