/**
 * PD-034 — API process entry: optional SQL migrate, then HTTP server.
 */

import { createBetaHttpServer } from "./http-server";
import { applyBootstrapMigration } from "../storage/migrations";
import { createRealPostgresTransport, readRealClientFlags } from "../storage/real-clients";
import { PostgresDriver } from "../storage/postgres-driver";
import { BetaApplication } from "./beta-application";
import { DependencyHealthRegistry } from "../production/health-probes";
import { FileProbeAudit } from "../production/probe-audit";
import { RELEASE_VERSION } from "../release/metadata";

async function main(): Promise<void> {
  const env = process.env;
  const health = new DependencyHealthRegistry();
  const auditPath = env.PAKKADEED_PROBE_AUDIT_PATH ?? "./var/probe-audit.jsonl";
  const audit = new FileProbeAudit(auditPath);
  void audit;
  const databaseUrl = env.DATABASE_URL ?? "";
  const realPg = readRealClientFlags(env).enableRealPostgres && databaseUrl.length > 0;

  if (env.PAKKADEED_AUTO_MIGRATE === "1" && realPg) {
    const transport = await createRealPostgresTransport(databaseUrl);
    try {
      const result = await applyBootstrapMigration(transport);
      console.log(JSON.stringify({ migrate: result }));
    } finally {
      await transport.close();
    }
  }

  let repository: PostgresDriver | undefined;
  if (realPg) {
    const transport = await createRealPostgresTransport(databaseUrl);
    repository = new PostgresDriver({ connectionString: databaseUrl, transport });
    health.registerProbe("postgres", () => repository!.probe());
    await repository.probe();
  }

  const app = new BetaApplication({ health, repository });
  const server = createBetaHttpServer({ app });
  const port = Number(env.PORT ?? 3001);
  server.listen(port, () => {
    console.log(JSON.stringify({ service: "api", version: RELEASE_VERSION, port, auditPath }));
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
