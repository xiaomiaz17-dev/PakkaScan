import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Evidence, Jurisdiction } from "../domain/models";
import { runPhase2Analysis } from "./phase2-pipeline";

export type Phase2Fixture = {
  id: string;
  jurisdiction: Jurisdiction;
  rawTextHint?: string;
  evidence: Evidence[];
  expect: {
    decision?: string;
    ruleCodes?: string[];
  };
};

export function loadPhase2Fixture(name: string): Phase2Fixture {
  const path = join(process.cwd(), "fixtures", "phase2", name);
  return JSON.parse(readFileSync(path, "utf8")) as Phase2Fixture;
}

export function runFixture(name: string) {
  const fx = loadPhase2Fixture(name);
  const out = runPhase2Analysis({
    evidence: fx.evidence,
    jurisdiction: fx.jurisdiction,
    rawTextHint: fx.rawTextHint,
  });
  return { fx, out };
}
