/**
 * PD-058 — Dedicated migration process for Compose init.
 * Runs bootstrap SQL once and exits (success/failure).
 */

import { createRealPostgresTransport, readRealClientFlags } from "../storage/real-clients";
import { applyBootstrapMigration } from "../storage/migrations";

async function main(): Promise<void> {
  const env = process.env;
  const flags = readRealClientFlags(env);
  if (!flags.enableRealPostgres) {
    console.error(JSON.stringify({ ok: false, error: "REAL_POSTGRES_REQUIRED" }));
    process.exit(1);
  }
  const databaseUrl = env.DATABASE_URL ?? "";
  if (!databaseUrl) {
    console.error(JSON.stringify({ ok: false, error: "DATABASE_URL_REQUIRED" }));
    process.exit(1);
  }
  const transport = await createRealPostgresTransport(databaseUrl);
  try {
    const result = await applyBootstrapMigration(transport);
    console.log(JSON.stringify({ ok: true, migrate: result }));
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
