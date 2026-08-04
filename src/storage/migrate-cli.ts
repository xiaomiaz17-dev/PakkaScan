/**
 * PD-034 — SQL migration CLI. Canonical migration mechanism is raw SQL (001_init.sql).
 * Prisma migrate deploy remains an optional alternate path behind a feature flag.
 */

import { createRealPostgresTransport, readRealClientFlags } from "./real-clients";
import { applyBootstrapMigration } from "./migrations";
import { MemorySqlTransport } from "./postgres-driver";

async function main(): Promise<void> {
  const env = process.env;
  const flags = readRealClientFlags(env);
  if (env.PAKKADEED_USE_MEMORY_SQL === "1") {
    const transport = new MemorySqlTransport();
    const result = await applyBootstrapMigration(transport);
    console.log(JSON.stringify({ ok: true, mode: "memory", ...result }));
    return;
  }
  if (!flags.enableRealPostgres) {
    console.error(JSON.stringify({ ok: false, detail: "Set PAKKADEED_ENABLE_REAL_POSTGRES=1 and DATABASE_URL" }));
    process.exit(1);
  }
  const databaseUrl = env.DATABASE_URL ?? "";
  if (!databaseUrl) {
    console.error(JSON.stringify({ ok: false, detail: "DATABASE_URL required" }));
    process.exit(1);
  }
  const transport = await createRealPostgresTransport(databaseUrl);
  try {
    const result = await applyBootstrapMigration(transport);
    console.log(JSON.stringify({ ok: true, mode: "postgres", ...result }));
  } finally {
    await transport.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, detail: error instanceof Error ? error.message : String(error) }));
    process.exit(1);
  });
}
