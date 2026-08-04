/**
 * Shared JSON helpers for Next.js route handlers.
 */
import { NextResponse } from "next/server";

const PUBLIC_ERRORS = new Set([
  "UPGRADE_REQUIRED",
  "REPORT_QUOTA_EXCEEDED",
  "TRIAL_EXPIRED",
  "ENTITLEMENT_DENIED",
  "FEATURE_DISABLED",
  "EVIDENCE_REQUIRED",
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "FORBIDDEN",
  "CSRF_FAILED",
  "EMAIL_ALREADY_REGISTERED",
  "UPLOAD_TOO_LARGE",
  "UNSUPPORTED_CONTENT_TYPE",
  "LIVE_OCR_REQUIRED",
  "PASSWORD_TOO_SHORT",
  "INVALID_EMAIL",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "NO_DOCUMENTS",
  "REPORT_NOT_READY",
  "PASSPORT_NOT_READY",
  "PROPERTY_NOT_FOUND",
  "FILE_NAME_REQUIRED",
  "DOCUMENT_EMPTY",
]);

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function publicErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (PUBLIC_ERRORS.has(message) || message.endsWith("_NOT_FOUND")) return message;
  return "REQUEST_FAILED";
}

export function errorResponse(error: unknown): NextResponse {
  const code = publicErrorCode(error);
  return json({ error: code }, statusFor(code));
}

export function statusFor(code: string): number {
  if (["UNAUTHENTICATED", "INVALID_CREDENTIALS"].includes(code)) return 401;
  if (code === "FORBIDDEN" || code === "CSRF_FAILED") return 403;
  if (code.endsWith("_NOT_FOUND") || code === "PASSPORT_NOT_READY" || code === "REPORT_NOT_READY") return 404;
  if (code === "EMAIL_ALREADY_REGISTERED") return 409;
  if (code === "UPLOAD_TOO_LARGE") return 413;
  if (code === "UNSUPPORTED_CONTENT_TYPE") return 415;
  if (code === "LIVE_OCR_REQUIRED") return 422;
  if (code === "RATE_LIMITED") return 429;
  if (["UPGRADE_REQUIRED", "REPORT_QUOTA_EXCEEDED", "TRIAL_EXPIRED", "ENTITLEMENT_DENIED"].includes(code)) return 402;
  if (code === "PASSWORD_TOO_SHORT" || code === "INVALID_EMAIL" || code === "VALIDATION_FAILED") return 400;
  return 400;
}
