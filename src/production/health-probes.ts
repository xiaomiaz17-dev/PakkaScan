/**
 * PD-031 — Dependency health probes and connection records.
 * A dependency is only marked connected after a successful probe result is recorded.
 */

export type DependencyName =
  | "postgres"
  | "object-storage"
  | "live-ocr"
  | "job-worker";

export type ProbeResult = {
  name: DependencyName;
  ok: boolean;
  latencyMs: number;
  detail: string;
  checkedAt: string;
};

export type ConnectionRecord = {
  name: DependencyName;
  connected: boolean;
  lastProbe?: ProbeResult;
  connectedAt?: string;
};

export type ProbeFn = () => Promise<{ ok: boolean; detail: string }>;

export class DependencyHealthRegistry {
  private readonly records = new Map<DependencyName, ConnectionRecord>();
  private readonly probes = new Map<DependencyName, ProbeFn>();

  registerProbe(name: DependencyName, probe: ProbeFn): void {
    this.probes.set(name, probe);
    if (!this.records.has(name)) {
      this.records.set(name, { name, connected: false });
    }
  }

  get(name: DependencyName): ConnectionRecord {
    return structuredClone(this.records.get(name) ?? { name, connected: false });
  }

  list(): ConnectionRecord[] {
    return [...this.records.values()].map((r) => structuredClone(r));
  }

  /**
   * Run a probe. Only on success is the dependency marked connected.
   * Failures never mark a dependency as connected.
   */
  async probe(name: DependencyName, now = new Date()): Promise<ProbeResult> {
    const fn = this.probes.get(name);
    const started = Date.now();
    let result: ProbeResult;
    if (!fn) {
      result = {
        name,
        ok: false,
        latencyMs: 0,
        detail: "No probe registered",
        checkedAt: now.toISOString(),
      };
    } else {
      try {
        const outcome = await fn();
        result = {
          name,
          ok: outcome.ok,
          latencyMs: Date.now() - started,
          detail: outcome.detail,
          checkedAt: now.toISOString(),
        };
      } catch (error) {
        result = {
          name,
          ok: false,
          latencyMs: Date.now() - started,
          detail: error instanceof Error ? error.message : "Probe failed",
          checkedAt: now.toISOString(),
        };
      }
    }

    const prior = this.records.get(name) ?? { name, connected: false };
    if (result.ok) {
      this.records.set(name, {
        name,
        connected: true,
        lastProbe: result,
        connectedAt: prior.connectedAt ?? result.checkedAt,
      });
    } else {
      this.records.set(name, {
        name,
        connected: false,
        lastProbe: result,
        connectedAt: undefined,
      });
    }
    return result;
  }

  async probeAll(now = new Date()): Promise<ProbeResult[]> {
    const names = [...this.probes.keys()];
    const results: ProbeResult[] = [];
    for (const name of names) {
      results.push(await this.probe(name, now));
    }
    return results;
  }

  /** Explicit disconnect — e.g. after failed live operation. */
  markDisconnected(name: DependencyName, detail: string, now = new Date()): void {
    this.records.set(name, {
      name,
      connected: false,
      lastProbe: {
        name,
        ok: false,
        latencyMs: 0,
        detail,
        checkedAt: now.toISOString(),
      },
      connectedAt: undefined,
    });
  }
}
