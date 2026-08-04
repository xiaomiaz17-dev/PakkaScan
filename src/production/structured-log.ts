/**
 * PD-040 — Structured logs with correlation IDs and PII/secret redaction.
 */

import { randomBytes } from "node:crypto";
import { redactSecrets } from "./security-headers";

export function newCorrelationId(): string {
  return `corr_${randomBytes(8).toString("hex")}`;
}

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
  [/\b\d{5}-\d{7}-\d\b/g, "[REDACTED_CNIC]"],
  [/\b\d{13}\b/g, "[REDACTED_CNIC]"],
];

export function redactPii(value: string): string {
  let out = redactSecrets(value);
  for (const [re, replacement] of PII_PATTERNS) {
    out = out.replace(re, replacement);
  }
  return out;
}

export type LogFields = Record<string, unknown> & { correlationId?: string; level?: string; msg?: string };

export function structuredLog(fields: LogFields): string {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level: fields.level ?? "info",
    ...fields,
  };
  const raw = JSON.stringify(payload);
  return redactPii(raw);
}
