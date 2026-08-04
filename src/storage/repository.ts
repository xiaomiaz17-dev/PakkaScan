/**
 * PD-030 — Durable repository contracts.
 * Memory implementations are fully functional for local/staging.
 * Postgres adapters require a verified DATABASE_URL and remain
 * explicitly unconnected until credentials and connectivity are confirmed.
 */

export type RepositoryHealth = {
  name: string;
  connected: boolean;
  detail: string;
};

export interface PropertyRecord {
  id: string;
  label: string;
  country: string;
  province?: string;
  jurisdiction: string;
  userId: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  propertyId: string;
  filename: string;
  mimeType: string;
  sha256: string;
  storageKey: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
}

export interface JobRecord {
  id: string;
  documentId: string;
  propertyId: string;
  stage: string;
  state: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  lastError?: string;
  payload?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DurableRepository {
  health(): Promise<RepositoryHealth>;
  saveProperty(record: PropertyRecord): Promise<PropertyRecord>;
  getProperty(id: string): Promise<PropertyRecord | undefined>;
  listPropertiesByUser(userId: string): Promise<PropertyRecord[]>;
  saveDocument(record: DocumentRecord): Promise<DocumentRecord>;
  getDocument(id: string): Promise<DocumentRecord | undefined>;
  listDocumentsByProperty(propertyId: string): Promise<DocumentRecord[]>;
  saveJob(record: JobRecord): Promise<JobRecord>;
  getJob(id: string): Promise<JobRecord | undefined>;
  listJobsByState(state: string): Promise<JobRecord[]>;
  listRunnableJobs(now: Date): Promise<JobRecord[]>;
}

export class MemoryDurableRepository implements DurableRepository {
  private properties = new Map<string, PropertyRecord>();
  private documents = new Map<string, DocumentRecord>();
  private jobs = new Map<string, JobRecord>();

  async health(): Promise<RepositoryHealth> {
    return { name: "memory-repository", connected: true, detail: "In-memory durable repository (local/staging)" };
  }

  async saveProperty(record: PropertyRecord): Promise<PropertyRecord> {
    this.properties.set(record.id, structuredClone(record));
    return structuredClone(record);
  }

  async getProperty(id: string): Promise<PropertyRecord | undefined> {
    const r = this.properties.get(id);
    return r ? structuredClone(r) : undefined;
  }

  async listPropertiesByUser(userId: string): Promise<PropertyRecord[]> {
    return [...this.properties.values()].filter((p) => p.userId === userId).map((p) => structuredClone(p));
  }

  async saveDocument(record: DocumentRecord): Promise<DocumentRecord> {
    this.documents.set(record.id, structuredClone(record));
    return structuredClone(record);
  }

  async getDocument(id: string): Promise<DocumentRecord | undefined> {
    const r = this.documents.get(id);
    return r ? structuredClone(r) : undefined;
  }

  async listDocumentsByProperty(propertyId: string): Promise<DocumentRecord[]> {
    return [...this.documents.values()].filter((d) => d.propertyId === propertyId).map((d) => structuredClone(d));
  }

  async saveJob(record: JobRecord): Promise<JobRecord> {
    this.jobs.set(record.id, structuredClone(record));
    return structuredClone(record);
  }

  async getJob(id: string): Promise<JobRecord | undefined> {
    const r = this.jobs.get(id);
    return r ? structuredClone(r) : undefined;
  }

  async listJobsByState(state: string): Promise<JobRecord[]> {
    return [...this.jobs.values()].filter((j) => j.state === state).map((j) => structuredClone(j));
  }

  async listRunnableJobs(now: Date): Promise<JobRecord[]> {
    const nowIso = now.toISOString();
    return [...this.jobs.values()]
      .filter((j) => j.state === "PENDING" || (j.state === "RETRY_SCHEDULED" && (!j.nextAttemptAt || j.nextAttemptAt <= nowIso)))
      .map((j) => structuredClone(j));
  }
}

/**
 * PostgresDurableRepository — binds contracts to managed PostgreSQL.
 * Construction succeeds, but every operation fails with NOT_CONNECTED
 * until a verified live connection is supplied via configure().
 */
export class PostgresDurableRepository implements DurableRepository {
  private configured = false;
  private connectionString?: string;

  configure(databaseUrl: string): void {
    if (!databaseUrl.startsWith("postgres")) {
      throw new Error("DATABASE_URL must be a PostgreSQL connection string");
    }
    this.connectionString = databaseUrl;
    // Explicit: do not open a real socket until a future verified probe.
    // PD-030 keeps external credentials as prerequisites.
    this.configured = false;
  }

  markConnected(): void {
    if (!this.connectionString) throw new Error("DATABASE_URL not supplied");
    this.configured = true;
  }

  async health(): Promise<RepositoryHealth> {
    if (!this.connectionString) {
      return { name: "postgres-repository", connected: false, detail: "DATABASE_URL not supplied — external credential required" };
    }
    if (!this.configured) {
      return { name: "postgres-repository", connected: false, detail: "DATABASE_URL present but live connection not yet verified" };
    }
    return { name: "postgres-repository", connected: true, detail: "Verified PostgreSQL connection" };
  }

  private ensure(): void {
    if (!this.configured) throw new Error("NOT_CONNECTED: PostgreSQL adapter is not verified. Supply and verify DATABASE_URL before use.");
  }

  async saveProperty(_record: PropertyRecord): Promise<PropertyRecord> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async getProperty(_id: string): Promise<PropertyRecord | undefined> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async listPropertiesByUser(_userId: string): Promise<PropertyRecord[]> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async saveDocument(_record: DocumentRecord): Promise<DocumentRecord> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async getDocument(_id: string): Promise<DocumentRecord | undefined> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async listDocumentsByProperty(_propertyId: string): Promise<DocumentRecord[]> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async saveJob(_record: JobRecord): Promise<JobRecord> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async getJob(_id: string): Promise<JobRecord | undefined> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async listJobsByState(_state: string): Promise<JobRecord[]> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
  async listRunnableJobs(_now: Date): Promise<JobRecord[]> { this.ensure(); throw new Error("NOT_IMPLEMENTED_LIVE"); }
}
