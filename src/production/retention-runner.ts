/**
 * PD-035 — Scheduled retention enforcement.
 */

import { retentionDecision, type RetentionClass } from "./retention";

export type RetentionCandidate = {
  id: string;
  kind: RetentionClass;
  createdAt: string;
};

export type RetentionAction = {
  id: string;
  kind: RetentionClass;
  deleteNow: boolean;
  reason: string;
  retainUntil?: string;
};

export function planRetention(candidates: RetentionCandidate[], now = new Date()): RetentionAction[] {
  return candidates.map((candidate) => {
    const decision = retentionDecision(candidate.kind, new Date(candidate.createdAt), now);
    return {
      id: candidate.id,
      kind: candidate.kind,
      deleteNow: decision.deleteNow,
      reason: decision.reason,
      retainUntil: decision.retainUntil,
    };
  });
}

export function applyRetentionDeletes(
  actions: RetentionAction[],
  deleteFn: (id: string) => void,
): { deleted: string[]; retained: string[] } {
  const deleted: string[] = [];
  const retained: string[] = [];
  for (const action of actions) {
    if (action.deleteNow) {
      deleteFn(action.id);
      deleted.push(action.id);
    } else {
      retained.push(action.id);
    }
  }
  return { deleted, retained };
}

export type ScheduledRetentionResult = {
  scanned: number;
  deleted: number;
  retained: number;
  ranAt: string;
};

export function runScheduledRetention(
  candidates: RetentionCandidate[],
  deleteFn: (id: string) => void,
  now = new Date(),
): ScheduledRetentionResult {
  const actions = planRetention(candidates, now);
  const result = applyRetentionDeletes(actions, deleteFn);
  return {
    scanned: candidates.length,
    deleted: result.deleted.length,
    retained: result.retained.length,
    ranAt: now.toISOString(),
  };
}
