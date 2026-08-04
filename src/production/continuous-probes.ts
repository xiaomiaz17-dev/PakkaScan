/**
 * PD-032 — Continuous health probe gate.
 * Production configuration may mark a dependency connected only after
 * N consecutive successful probes within a time window.
 */

import {
  DependencyHealthRegistry,
  type DependencyName,
  type ProbeResult,
  type ConnectionRecord,
} from "./health-probes";
import type { ProbeAuditSink } from "./probe-audit";
import { createAuditEntry } from "./probe-audit";

export type ContinuousProbePolicy = {
  requiredSuccesses: number;
  maxFailureStreak: number;
};

export type ContinuousProbeState = {
  name: DependencyName;
  successStreak: number;
  failureStreak: number;
  gatedConnected: boolean;
  lastResults: ProbeResult[];
};

const DEFAULT_POLICY: ContinuousProbePolicy = {
  requiredSuccesses: 3,
  maxFailureStreak: 1,
};

export class ContinuousProbeGate {
  private readonly registry: DependencyHealthRegistry;
  private readonly policy: ContinuousProbePolicy;
  private readonly state = new Map<DependencyName, ContinuousProbeState>();
  private readonly audit?: ProbeAuditSink;
  private readonly environment: string;

  constructor(
    registry: DependencyHealthRegistry,
    policy: Partial<ContinuousProbePolicy> = {},
    options: { audit?: ProbeAuditSink; environment?: string } = {},
  ) {
    this.registry = registry;
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.audit = options.audit;
    this.environment = options.environment ?? "test";
  }

  getState(name: DependencyName): ContinuousProbeState {
    return structuredClone(
      this.state.get(name) ?? {
        name,
        successStreak: 0,
        failureStreak: 0,
        gatedConnected: false,
        lastResults: [],
      },
    );
  }

  list(): ContinuousProbeState[] {
    return [...this.state.values()].map((s) => structuredClone(s));
  }

  /**
   * Run one probe cycle. gatedConnected becomes true only after
   * requiredSuccesses consecutive successes. Any failure resets the streak
   * and clears gatedConnected.
   */
  async cycle(name: DependencyName, now = new Date()): Promise<ContinuousProbeState> {
    const result = await this.registry.probe(name, now);
    const prior = this.getState(name);
    const lastResults = [...prior.lastResults, result].slice(-10);

    let successStreak = prior.successStreak;
    let failureStreak = prior.failureStreak;
    let gatedConnected = prior.gatedConnected;

    if (result.ok) {
      successStreak += 1;
      failureStreak = 0;
      if (successStreak >= this.policy.requiredSuccesses) {
        gatedConnected = true;
      }
    } else {
      failureStreak += 1;
      successStreak = 0;
      if (failureStreak >= this.policy.maxFailureStreak) {
        gatedConnected = false;
        this.registry.markDisconnected(name, result.detail, now);
      }
    }

    const next: ContinuousProbeState = {
      name,
      successStreak,
      failureStreak,
      gatedConnected,
      lastResults,
    };
    this.state.set(name, next);
    if (this.audit) {
      this.audit.append(
        createAuditEntry(result, {
          environment: this.environment,
          gatedConnectedAfter: gatedConnected,
        }),
      );
    }
    return structuredClone(next);
  }

  async cycleAll(names: DependencyName[], now = new Date()): Promise<ContinuousProbeState[]> {
    const out: ContinuousProbeState[] = [];
    for (const name of names) {
      out.push(await this.cycle(name, now));
    }
    return out;
  }

  /** Production may use a dependency only when gatedConnected is true. */
  assertConnected(name: DependencyName): void {
    const state = this.getState(name);
    if (!state.gatedConnected) {
      throw new Error(
        `NOT_CONNECTED: ${name} has not achieved ${this.policy.requiredSuccesses} consecutive successful probes (streak=${state.successStreak})`,
      );
    }
  }

  connectionRecords(): ConnectionRecord[] {
    return this.registry.list();
  }
}
