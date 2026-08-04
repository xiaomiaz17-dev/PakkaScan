/**
 * PD-040 — Stale job leases, idempotent claims, retry backoff, dead-letter.
 */

export type LeaseState = {
  jobId: string;
  ownerId: string;
  leasedUntil: string;
  attempt: number;
};

export type ClaimResult =
  | { claimed: true; lease: LeaseState }
  | { claimed: false; reason: "ALREADY_LEASED" | "NOT_RUNNABLE" | "DEAD_LETTER" };

export function computeBackoffMs(attempt: number, baseMs = 1000, maxMs = 60_000): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.min(250, exp * 0.1));
  return exp + jitter;
}

export function isLeaseExpired(lease: LeaseState | undefined, now = new Date()): boolean {
  if (!lease) return true;
  return new Date(lease.leasedUntil).getTime() <= now.getTime();
}

export function claimJob(input: {
  jobId: string;
  ownerId: string;
  state: string;
  attempts: number;
  maxAttempts: number;
  existingLease?: LeaseState;
  leaseMs?: number;
  now?: Date;
}): ClaimResult {
  const now = input.now ?? new Date();
  if (input.state === "DEAD_LETTER" || input.state === "SUCCEEDED") {
    return { claimed: false, reason: input.state === "DEAD_LETTER" ? "DEAD_LETTER" : "NOT_RUNNABLE" };
  }
  if (input.attempts >= input.maxAttempts) {
    return { claimed: false, reason: "DEAD_LETTER" };
  }
  if (input.existingLease && !isLeaseExpired(input.existingLease, now) && input.existingLease.ownerId !== input.ownerId) {
    return { claimed: false, reason: "ALREADY_LEASED" };
  }
  const leaseMs = input.leaseMs ?? 30_000;
  return {
    claimed: true,
    lease: {
      jobId: input.jobId,
      ownerId: input.ownerId,
      leasedUntil: new Date(now.getTime() + leaseMs).toISOString(),
      attempt: input.attempts + 1,
    },
  };
}

export function shouldDeadLetter(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}
