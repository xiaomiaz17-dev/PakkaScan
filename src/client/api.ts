/**
 * Browser client for PakkaScan customer APIs.
 * Sends CSRF header on every state-changing request.
 */

export const CSRF_COOKIE = "pakkadeed_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string };

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { csrf?: boolean } = {},
): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers ?? {});
  if (init.csrf) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set(CSRF_HEADER, csrf);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  let payload: any = null;
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: "INVALID_JSON_RESPONSE" };
  }
  if (!response.ok) {
    const error =
      payload && typeof payload.error === "string" ? payload.error : "REQUEST_FAILED";
    return { ok: false, status: response.status, error };
  }
  return { ok: true, status: response.status, data: payload as T };
}

export function publicErrorMessage(code: string): string {
  const map: Record<string, string> = {
    VALIDATION_FAILED: "Please check the form and try again.",
    INVALID_CREDENTIALS: "Email or password is incorrect.",
    EMAIL_ALREADY_REGISTERED: "An account with this email already exists.",
    UNAUTHENTICATED: "Please sign in to continue.",
    FORBIDDEN: "You do not have access to this resource.",
    CSRF_FAILED: "Your session could not be verified. Refresh and try again.",
    UPLOAD_TOO_LARGE: "That file is too large (max 15 MB).",
    UNSUPPORTED_CONTENT_TYPE: "Upload a PDF, JPEG, PNG or text file.",
    LIVE_OCR_REQUIRED: "This scan needs OCR before analysis can finish.",
    NO_DOCUMENTS: "Upload at least one document before analysing.",
    REPORT_NOT_READY: "The report is not ready yet.",
    PASSPORT_NOT_READY: "The Property Passport is not ready yet.",
    PROPERTY_NOT_FOUND: "Property not found.",
    RATE_LIMITED: "Too many attempts. Please wait and try again.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}
