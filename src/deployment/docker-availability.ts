/**
 * PD-034 — Detect whether Docker is available for live integration tests.
 */

import { spawnSync } from "node:child_process";

export function isDockerAvailable(): boolean {
  try {
    const result = spawnSync("docker", ["info"], { encoding: "utf8", timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function dockerSkipReason(): string | false {
  return isDockerAvailable() ? false : "Docker not available in this environment — live integration skipped";
}
