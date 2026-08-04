/**
 * PD-036 — Production readiness checklist aggregation.
 */

import type { ContinuousProbeState } from "./continuous-probes";
import { realClientsEnabledSummary } from "../storage/real-clients";
import { RELEASE_MILESTONE, RELEASE_VERSION } from "../release/metadata";

export type ChecklistItem = {
  code: string;
  ok: boolean;
  detail: string;
};

export type ReadinessReport = {
  milestone: string;
  version: string;
  ready: boolean;
  items: ChecklistItem[];
};

export function buildReadinessReport(input: {
  gateStates: ContinuousProbeState[];
  migrationApplied: boolean;
  supervisedWorkersRunning: number;
  expectedWorkers: number;
  probeAuditEntries: number;
  env?: Record<string, string | undefined>;
}): ReadinessReport {
  const clients = realClientsEnabledSummary(input.env);
  const items: ChecklistItem[] = [
    {
      code: "RELEASE_METADATA",
      ok: true,
      detail: `${RELEASE_MILESTONE} ${RELEASE_VERSION}`,
    },
    {
      code: "MIGRATION_APPLIED",
      ok: input.migrationApplied,
      detail: input.migrationApplied ? "schema bootstrap applied" : "schema bootstrap pending",
    },
    {
      code: "PROBE_AUDIT",
      ok: input.probeAuditEntries > 0,
      detail: `${input.probeAuditEntries} probe audit entries`,
    },
    {
      code: "WORKERS",
      ok: input.supervisedWorkersRunning >= input.expectedWorkers && input.expectedWorkers > 0,
      detail: `workers ${input.supervisedWorkersRunning}/${input.expectedWorkers}`,
    },
    {
      code: "POSTGRES_GATE",
      ok: input.gateStates.some((s) => s.name === "postgres" && s.gatedConnected),
      detail: "continuous postgres probe gate",
    },
    {
      code: "REAL_CLIENT_FLAGS",
      ok: true,
      detail: `postgres=${clients.postgres} objectStorage=${clients.objectStorage} (informational)`,
    },
  ];
  return {
    milestone: RELEASE_MILESTONE,
    version: RELEASE_VERSION,
    ready: items.filter((i) => i.code !== "REAL_CLIENT_FLAGS").every((i) => i.ok),
    items,
  };
}
