/**
 * PD-034 — Prisma migrate deploy alternative to raw SQL bootstrap.
 * Invokes `prisma migrate deploy` only when explicitly enabled.
 * Does not run in unit tests.
 */

import { spawn } from "node:child_process";

export type PrismaMigrateResult = {
  ok: boolean;
  exitCode: number | null;
  detail: string;
};

export type PrismaMigrateOptions = {
  cwd?: string;
  env?: Record<string, string | undefined>;
  /** Injected runner for tests. */
  runCommand?: (command: string, args: string[], env: NodeJS.ProcessEnv) => Promise<{ code: number | null; stderr: string }>;
};

export async function prismaMigrateDeploy(options: PrismaMigrateOptions = {}): Promise<PrismaMigrateResult> {
  const env = { ...process.env, ...(options.env ?? {}) };
  if (env.PAKKADEED_ENABLE_PRISMA_MIGRATE !== "1") {
    return {
      ok: false,
      exitCode: null,
      detail: "PRISMA_MIGRATE_DISABLED: set PAKKADEED_ENABLE_PRISMA_MIGRATE=1 to run prisma migrate deploy",
    };
  }
  if (!env.DATABASE_URL) {
    return { ok: false, exitCode: null, detail: "DATABASE_URL required for prisma migrate deploy" };
  }

  const run =
    options.runCommand ??
    ((command: string, args: string[], processEnv: NodeJS.ProcessEnv) =>
      new Promise<{ code: number | null; stderr: string }>((resolve) => {
        const child = spawn(command, args, {
          cwd: options.cwd ?? process.cwd(),
          env: processEnv,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stderr = "";
        child.stderr.on("data", (chunk: any) => {
          stderr += String(chunk);
        });
        child.on("close", (code: any) => resolve({ code, stderr }));
        child.on("error", (error: any) => resolve({ code: 1, stderr: error.message }));
      }));

  const result = await run("npx", ["prisma", "migrate", "deploy"], env as NodeJS.ProcessEnv);
  return {
    ok: result.code === 0,
    exitCode: result.code,
    detail: result.code === 0 ? "prisma migrate deploy succeeded" : result.stderr || `exit ${result.code}`,
  };
}
