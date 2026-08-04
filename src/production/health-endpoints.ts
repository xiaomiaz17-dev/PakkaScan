/**
 * PD-040 — Liveness vs readiness separation.
 * Liveness: process is up.
 * Readiness: required dependencies are available.
 */

export type ReadinessInput = {
  postgresConnected: boolean;
  objectStorageConnected?: boolean;
  requirePostgres: boolean;
  requireObjectStorage?: boolean;
};

export function liveness(): { status: "ok" } {
  return { status: "ok" };
}

export function readiness(input: ReadinessInput): { ready: boolean; checks: Record<string, boolean> } {
  const checks: Record<string, boolean> = {
    postgres: input.requirePostgres ? input.postgresConnected : true,
  };
  if (input.requireObjectStorage) {
    checks.objectStorage = !!input.objectStorageConnected;
  }
  return { ready: Object.values(checks).every(Boolean), checks };
}
