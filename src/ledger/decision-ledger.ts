import { createHash, randomUUID } from "node:crypto";
import type { Jurisdiction } from "../domain/models";
import type { ReturnTypeAnalysePropertyPack } from "../reporting/types";

export type DecisionLedgerSnapshot = {
  id: string;
  propertyId: string;
  reportId: string;
  jurisdiction: Jurisdiction;
  engineVersion: string;
  ruleSetVersion: string;
  evidenceSnapshotHash: string;
  findingsSnapshotHash: string;
  decision: string;
  pakkaScore: number | null;
  trustScore: number;
  confidenceScore: number;
  createdAt: string;
  immutableHash: string;
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function createDecisionLedgerSnapshot(input: {
  propertyId: string;
  reportId: string;
  jurisdiction: Jurisdiction;
  analysis: ReturnTypeAnalysePropertyPack;
  createdAt?: string;
  engineVersion?: string;
  ruleSetVersion?: string;
}): DecisionLedgerSnapshot {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const evidenceSnapshotHash = hash(input.analysis.evidence.map((item) => ({
    id: item.id,
    documentId: item.documentId,
    field: item.field,
    value: item.normalizedValue ?? item.value,
    confidence: item.confidence,
  })));
  const findingsSnapshotHash = hash(input.analysis.analysis.findings);
  const base = {
    propertyId: input.propertyId,
    reportId: input.reportId,
    jurisdiction: input.jurisdiction,
    engineVersion: input.engineVersion ?? "0.6.0",
    ruleSetVersion: input.ruleSetVersion ?? "PD-RULES-001",
    evidenceSnapshotHash,
    findingsSnapshotHash,
    decision: input.analysis.analysis.decision,
    pakkaScore: input.analysis.analysis.pakkaScore,
    trustScore: input.analysis.analysis.trustScore ?? 0,
    confidenceScore: input.analysis.analysis.confidenceScore,
    createdAt,
  };
  return { id: randomUUID(), ...base, immutableHash: hash(base) };
}

export function verifyDecisionLedgerSnapshot(snapshot: DecisionLedgerSnapshot): boolean {
  const { id: _id, immutableHash, ...base } = snapshot;
  return hash(base) === immutableHash;
}
