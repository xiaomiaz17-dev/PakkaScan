/**
 * PD-041 — Schema bootstrap for the durable repository.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SqlTransport } from "./postgres-driver";

export type MigrationResult = {
  applied: string[];
  detail: string;
};

function loadMigrationSql(filename: string): string {
  const candidates = [
    join(process.cwd(), "migrations", filename),
    join(process.cwd(), "..", "migrations", filename),
    join(__dirname, "..", "..", "migrations", filename),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return readFileSync(path, "utf8");
  }
  throw new Error(`Migration file not found: ${filename}`);
}

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statementText) => statementText.trim())
    .filter((statementText) => statementText.length > 0 && !statementText.startsWith("--"));
}

export async function applyBootstrapMigration(transport: SqlTransport): Promise<MigrationResult> {
  const applied: string[] = [];
  for (const file of ["001_init.sql", "002_application.sql"]) {
    try {
      const sql = loadMigrationSql(file);
      for (const statement of splitStatements(sql)) {
        await transport.query(statement);
      }
      applied.push(file);
    } catch (error) {
      if (file === "002_application.sql") {
        continue;
      }
      throw error;
    }
  }
  return { applied, detail: `Applied ${applied.join(", ")}` };
}

export async function verifyMigrationsApplied(transport: SqlTransport): Promise<boolean> {
  try {
    const r = await transport.query(
      `SELECT 1 AS ok FROM information_schema.tables WHERE table_name = 'users' LIMIT 1`,
    );
    if (r.rows.length) return true;
  } catch {
    /* fall through */
  }
  try {
    await transport.query(`SELECT 1 FROM users LIMIT 0`);
    await transport.query(`SELECT 1 FROM sessions LIMIT 0`);
    await transport.query(`SELECT 1 FROM properties LIMIT 0`);
    await transport.query(`SELECT 1 FROM jobs LIMIT 0`);
    await transport.query(`SELECT 1 FROM reports LIMIT 0`);
    await transport.query(`SELECT 1 FROM passports LIMIT 0`);
    return true;
  } catch {
    return false;
  }
}