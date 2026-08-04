/**
 * In-memory SQL transport for unit tests — understands PD-041 table shapes.
 * Not used in production.
 */

import type { SqlTransport, SqlRow } from "./postgres-driver";

type Table = Map<string, SqlRow>;

function keyOf(table: string, row: SqlRow): string {
  if (table === "reports") return String(row.verification_id);
  if (table === "encrypted_objects") return String(row.object_key);
  if (table === "sessions" && row.token_hash) return String(row.token_hash);
  return String(row.id ?? row.object_key ?? JSON.stringify(row));
}

export class StructuredMemorySqlTransport implements SqlTransport {
  readonly tables = new Map<string, Table>();

  private table(name: string): Table {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name)!;
  }

  async query(sql: string, params: unknown[] = []): Promise<{ rows: SqlRow[] }> {
    const normalized = sql.replace(/\s+/g, " ").trim();
    const lower = normalized.toLowerCase();

    if (lower.startsWith("select 1")) {
      return { rows: [{ ok: 1 }] };
    }

    if (lower.includes("for update skip locked")) {
      const jobs = [...this.table("jobs").values()].filter((j) => {
        const state = String(j.state);
        const attempts = Number(j.attempts ?? 0);
        const max = Number(j.max_attempts ?? 3);
        if (!["PENDING", "FAILED", "RUNNING"].includes(state)) return false;
        if (attempts >= max) return false;
        return true;
      });
      jobs.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      return { rows: jobs.slice(0, 1) };
    }

    if (lower.startsWith("insert into users")) {
      const row = {
        id: params[0],
        email: params[1],
        display_name: params[2],
        role: params[3],
        password_hash: params[4],
        verified: params[5],
        created_at: params[6],
      };
      this.table("users").set(String(params[0]), row);
      return { rows: [] };
    }

    if (lower.startsWith("select * from users where email")) {
      const email = String(params[0]).toLowerCase();
      const rows = [...this.table("users").values()].filter((u) => String(u.email).toLowerCase() === email);
      return { rows };
    }

    if (lower.startsWith("select * from users where id")) {
      const row = this.table("users").get(String(params[0]));
      return { rows: row ? [row] : [] };
    }

    if (lower.startsWith("insert into sessions")) {
      const row = {
        id: params[0],
        user_id: params[1],
        token_hash: params[2],
        expires_at: params[3],
        revoked_at: params[4],
        created_at: params[5],
      };
      this.table("sessions").set(String(params[2]), row);
      return { rows: [] };
    }

    if (lower.startsWith("select * from sessions where token_hash")) {
      const row = this.table("sessions").get(String(params[0]));
      return { rows: row ? [row] : [] };
    }

    if (lower.startsWith("update sessions set revoked_at")) {
      const row = this.table("sessions").get(String(params[0]));
      if (row) row.revoked_at = params[1];
      return { rows: [] };
    }

    if (lower.startsWith("insert into properties")) {
      const row = {
        id: params[0],
        label: params[1],
        country: params[2],
        province: params[3],
        jurisdiction: params[4],
        user_id: params[5],
        status: params[6],
        passport_public_id: params[7],
        latest_report_verification_id: params[8],
        created_at: params[9],
        updated_at: params[10],
      };
      this.table("properties").set(String(params[0]), row);
      return { rows: [] };
    }

    if (lower.startsWith("select * from properties where user_id")) {
      const rows = [...this.table("properties").values()].filter((p) => p.user_id === params[0]);
      return { rows };
    }

    if (lower.startsWith("select * from properties where id")) {
      const row = this.table("properties").get(String(params[0]));
      return { rows: row ? [row] : [] };
    }

    if (lower.startsWith("update properties set status")) {
      const row = this.table("properties").get(String(params[0]));
      if (row) {
        row.status = params[1];
        row.updated_at = params[2];
      }
      return { rows: [] };
    }

    if (lower.startsWith("update properties set latest_report_verification_id")) {
      const row = this.table("properties").get(String(params[0]));
      if (row) {
        row.latest_report_verification_id = params[1];
        row.passport_public_id = params[2];
        row.status = "REPORT_READY";
        row.updated_at = params[3];
      }
      return { rows: [] };
    }

    if (lower.startsWith("insert into documents")) {
      const row = {
        id: params[0],
        property_id: params[1],
        owner_user_id: params[2],
        file_name: params[3],
        content_type: params[4],
        mime_type: params[5],
        sha256: params[6],
        storage_key: params[7],
        size_bytes: params[8],
        status: params[9],
        created_at: params[10],
      };
      this.table("documents").set(String(params[0]), row);
      return { rows: [] };
    }

    if (lower.startsWith("select * from documents where property_id")) {
      const rows = [...this.table("documents").values()].filter((d) => d.property_id === params[0]);
      return { rows };
    }

    if (lower.startsWith("insert into jobs")) {
      const row = {
        id: params[0],
        document_id: params[1],
        property_id: params[2],
        stage: params[3],
        state: params[4],
        attempts: params[5],
        max_attempts: params[6],
        next_attempt_at: params[7],
        last_error: params[8],
        payload: params[9],
        lease_owner: params[10],
        lease_expires_at: params[11],
        dead_lettered_at: params[12],
        created_at: params[13],
        updated_at: params[14],
      };
      this.table("jobs").set(String(params[0]), row);
      return { rows: [] };
    }

    if (lower.startsWith("update jobs set") && lower.includes("state = 'running'")) {
      const row = this.table("jobs").get(String(params[0]));
      if (row) {
        row.state = "RUNNING";
        row.attempts = Number(row.attempts ?? 0) + 1;
        row.lease_owner = params[1];
        row.lease_expires_at = params[2];
        row.updated_at = params[3];
      }
      return { rows: [] };
    }

    if (lower.startsWith("update jobs set") && lower.includes("succeeded")) {
      const row = this.table("jobs").get(String(params[0]));
      if (row) {
        row.state = "SUCCEEDED";
        row.lease_owner = null;
        row.lease_expires_at = null;
        row.updated_at = params[1];
      }
      return { rows: [] };
    }

    if (lower.startsWith("update jobs set") && lower.includes("last_error")) {
      const row = this.table("jobs").get(String(params[0]));
      if (row) {
        row.state = params[1];
        row.last_error = params[2];
        row.next_attempt_at = params[3];
        row.dead_lettered_at = params[4];
        row.lease_owner = null;
        row.lease_expires_at = null;
        row.updated_at = params[5];
      }
      return { rows: [] };
    }

    if (lower.startsWith("select * from jobs where id")) {
      const row = this.table("jobs").get(String(params[0]));
      return { rows: row ? [row] : [] };
    }

    if (lower.startsWith("insert into reports")) {
      const row = {
        verification_id: params[0],
        property_id: params[1],
        passport_id: params[2],
        version: params[3],
        body_json: params[4],
        created_at: params[5],
      };
      this.table("reports").set(String(params[0]), row);
      return { rows: [] };
    }

    if (lower.startsWith("select * from reports where property_id")) {
      const rows = [...this.table("reports").values()]
        .filter((r) => r.property_id === params[0])
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { rows: rows.slice(0, 1) };
    }

    if (lower.startsWith("insert into passports")) {
      const row = {
        id: params[0],
        property_id: params[1],
        public_id: params[2],
        body_json: params[3],
        updated_at: params[4],
      };
      this.table("passports").set(String(params[1]), row);
      return { rows: [] };
    }

    if (lower.startsWith("select * from passports where property_id")) {
      const row = this.table("passports").get(String(params[0]));
      return { rows: row ? [row] : [] };
    }

    if (lower.startsWith("insert into encrypted_objects")) {
      const row = {
        object_key: params[0],
        algorithm: params[1],
        iv: params[2],
        auth_tag: params[3],
        ciphertext: params[4],
        created_at: params[5],
      };
      this.table("encrypted_objects").set(String(params[0]), row);
      return { rows: [] };
    }

    if (lower.startsWith("select * from encrypted_objects")) {
      const row = this.table("encrypted_objects").get(String(params[0]));
      return { rows: row ? [row] : [] };
    }

    if (lower.startsWith("insert into audit_events")) {
      this.table("audit_events").set(String(params[0]), {
        id: params[0],
        actor_user_id: params[1],
        action: params[2],
        resource_type: params[3],
        resource_id: params[4],
        detail: params[5],
        correlation_id: params[6],
        created_at: params[7],
      });
      return { rows: [] };
    }

    if (lower.startsWith("create table") || lower.startsWith("create index") || lower.startsWith("insert into schema_migrations")) {
      return { rows: [] };
    }

    // Fallback: ignore unknown DDL-ish statements in memory mode
    if (lower.startsWith("create ") || lower.startsWith("alter ") || lower.startsWith("insert into schema")) {
      return { rows: [] };
    }

    throw new Error(`MemorySqlTransport: unsupported SQL: ${normalized.slice(0, 120)}`);
  }

  async close(): Promise<void> {
    this.tables.clear();
  }
}
