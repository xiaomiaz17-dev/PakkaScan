export type DependencyCheck = { name: string; healthy: boolean; latencyMs?: number; detail?: string };
export type ReadinessResult = { ready: boolean; status: "READY" | "DEGRADED" | "NOT_READY"; checks: DependencyCheck[] };

export function evaluateReadiness(checks: DependencyCheck[], maxLatencyMs = 2000): ReadinessResult {
  if (!checks.length) return { ready: false, status: "NOT_READY", checks };
  const criticalFailure = checks.some(c => !c.healthy);
  if (criticalFailure) return { ready: false, status: "NOT_READY", checks };
  const slow = checks.some(c => (c.latencyMs ?? 0) > maxLatencyMs);
  return { ready: true, status: slow ? "DEGRADED" : "READY", checks };
}
