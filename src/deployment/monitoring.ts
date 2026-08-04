export type OperationalEvent = { service: string; operation: string; success: boolean; durationMs: number; occurredAt: string; correlationId: string };
export type ServiceHealth = { service: string; requests: number; failures: number; failureRate: number; averageDurationMs: number; status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" };

export function summarizeOperationalHealth(events: OperationalEvent[]): ServiceHealth[] {
  const byService = new Map<string, OperationalEvent[]>();
  for (const event of events) byService.set(event.service, [...(byService.get(event.service) ?? []), event]);
  return [...byService.entries()].map(([service, rows]) => {
    const failures = rows.filter((row) => !row.success).length;
    const failureRate = Number(((failures / rows.length) * 100).toFixed(2));
    const averageDurationMs = Math.round(rows.reduce((sum, row) => sum + row.durationMs, 0) / rows.length);
    const status: ServiceHealth["status"] = failureRate >= 20 ? "UNHEALTHY" : failureRate > 5 || averageDurationMs > 2500 ? "DEGRADED" : "HEALTHY";
    return { service, requests: rows.length, failures, failureRate, averageDurationMs, status };
  }).sort((a, b) => a.service.localeCompare(b.service));
}
