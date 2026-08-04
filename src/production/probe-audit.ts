/**
 * PD-033 — Probe history audit log.
 * Records every probe result for compliance and post-incident review.
 * Entries are append-only in memory; optional file sink for durable audit.
 */

import { appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { DependencyName, ProbeResult } from "./health-probes";

export type ProbeAuditEntry = ProbeResult & {
  id: string;
  gatedConnectedAfter?: boolean;
  environment: string;
};

export type ProbeAuditSink = {
  append(entry: ProbeAuditEntry): void;
  list(filter?: { name?: DependencyName; limit?: number }): ProbeAuditEntry[];
};

export class MemoryProbeAudit implements ProbeAuditSink {
  private readonly entries: ProbeAuditEntry[] = [];

  append(entry: ProbeAuditEntry): void {
    this.entries.push(structuredClone(entry));
  }

  list(filter: { name?: DependencyName; limit?: number } = {}): ProbeAuditEntry[] {
    let rows = this.entries;
    if (filter.name) rows = rows.filter((e) => e.name === filter.name);
    const limit = filter.limit ?? rows.length;
    return rows.slice(-limit).map((e) => structuredClone(e));
  }
}

export class FileProbeAudit implements ProbeAuditSink {
  private readonly memory = new MemoryProbeAudit();

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  append(entry: ProbeAuditEntry): void {
    this.memory.append(entry);
    appendFileSync(this.filePath, JSON.stringify(entry) + "\n", { encoding: "utf8", mode: 0o600 });
  }

  list(filter: { name?: DependencyName; limit?: number } = {}): ProbeAuditEntry[] {
    return this.memory.list(filter);
  }
}

let sequence = 0;

export function createAuditEntry(
  result: ProbeResult,
  input: { environment?: string; gatedConnectedAfter?: boolean } = {},
): ProbeAuditEntry {
  sequence += 1;
  return {
    ...result,
    id: `probe_${sequence}_${result.checkedAt.replace(/[:.]/g, "")}`,
    environment: input.environment ?? "test",
    gatedConnectedAfter: input.gatedConnectedAfter,
  };
}
