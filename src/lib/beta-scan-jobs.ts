import { sql } from "./db";

export type BetaScanJobStatus = "queued" | "running" | "completed" | "failed";

export type StoredScanFile = {
  name: string;
  type: string;
  data: string;
};

export type BetaScanJobRow = {
  id: string;
  user_id: string;
  status: BetaScanJobStatus;
  stage: string | null;
  entitlement_id: string | null;
  cookie_header: string | null;
  files_json: StoredScanFile[];
  hints_json: string[];
  result_json: unknown | null;
  error_text: string | null;
  created_at: string;
  updated_at: string;
};

let ensured = false;

export async function ensureBetaScanJobsTable(): Promise<void> {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS beta_scan_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      stage TEXT,
      entitlement_id TEXT,
      cookie_header TEXT,
      files_json TEXT NOT NULL DEFAULT '[]',
      hints_json TEXT NOT NULL DEFAULT '[]',
      result_json TEXT,
      error_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS beta_scan_jobs_user_idx ON beta_scan_jobs (user_id, created_at DESC)`;
  ensured = true;
}

export async function insertBetaScanJob(input: {
  id: string;
  userId: string;
  entitlementId?: string | null;
  cookieHeader?: string | null;
  files: StoredScanFile[];
  hints: string[];
}): Promise<void> {
  await ensureBetaScanJobsTable();
  await sql`
    INSERT INTO beta_scan_jobs (
      id, user_id, status, stage, entitlement_id, cookie_header, files_json, hints_json
    ) VALUES (
      ${input.id},
      ${input.userId},
      'queued',
      'IN',
      ${input.entitlementId ?? null},
      ${input.cookieHeader ?? null},
      ${JSON.stringify(input.files)},
      ${JSON.stringify(input.hints ?? [])}
    )
  `;
}

export async function getBetaScanJob(id: string): Promise<BetaScanJobRow | null> {
  await ensureBetaScanJobsTable();
  const rows = (await sql`
    SELECT
      id, user_id, status, stage, entitlement_id, cookie_header,
      files_json, hints_json, result_json, error_text,
      created_at::text AS created_at, updated_at::text AS updated_at
    FROM beta_scan_jobs
    WHERE id = ${id}
    LIMIT 1
  `) as any[];
  const row = rows[0];
  if (!row) return null;
  const parse = (v: unknown, fallback: unknown) => {
    if (v == null) return fallback;
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return fallback; }
  };
  return {
    ...row,
    files_json: parse(row.files_json, []),
    hints_json: parse(row.hints_json, []),
    result_json: parse(row.result_json, null),
  } as BetaScanJobRow;
}

export async function markBetaScanJobRunning(id: string, stage = "OC"): Promise<void> {
  await sql`
    UPDATE beta_scan_jobs
    SET status = 'running', stage = ${stage}, updated_at = now()
    WHERE id = ${id} AND status IN ('queued', 'running')
  `;
}

export async function completeBetaScanJob(id: string, result: unknown): Promise<void> {
  await sql`
    UPDATE beta_scan_jobs
    SET status = 'completed', stage = 'RP', result_json = ${JSON.stringify(result)},
        error_text = NULL, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function failBetaScanJob(id: string, errorText: string): Promise<void> {
  await sql`
    UPDATE beta_scan_jobs
    SET status = 'failed', error_text = ${errorText.slice(0, 2000)}, updated_at = now()
    WHERE id = ${id}
  `;
}
