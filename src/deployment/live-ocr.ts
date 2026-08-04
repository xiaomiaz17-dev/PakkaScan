/**
 * Live OCR adapter with provider health, fallback, and real HTTP POST extract.
 * Primary provider remains unconnected until credentials are verified by probe.
 * Memory/fixture fallback is for unit tests only — not production infrastructure.
 */

import type { OcrProvider, OcrRequest, OcrResponse } from "./providers";
import { FixtureOcrProvider } from "./providers";

export type OcrProviderHealth = {
  name: string;
  healthy: boolean;
  latencyMs?: number;
  detail: string;
};

export interface HealthAwareOcrProvider extends OcrProvider {
  health(): Promise<OcrProviderHealth>;
}

export type OcrHttpFetch = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: Uint8Array;
    signal?: AbortSignal;
  },
) => Promise<{ status: number; json(): Promise<unknown> }>;

export type LiveOcrConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxPayloadBytes?: number;
  fetchImpl?: OcrHttpFetch;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_PAYLOAD_BYTES = 15 * 1024 * 1024;

function validateOcrResponse(payload: unknown): OcrResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("OCR_INVALID_RESPONSE: body is not an object");
  }
  const body = payload as Record<string, unknown>;
  const text = body.text;
  const confidence = body.confidence;
  const pageCount = body.pageCount;
  const provider = body.provider;
  if (typeof text !== "string") throw new Error("OCR_INVALID_RESPONSE: text must be a string");
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    throw new Error("OCR_INVALID_RESPONSE: confidence must be a number between 0 and 1");
  }
  if (typeof pageCount !== "number" || !Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error("OCR_INVALID_RESPONSE: pageCount must be a positive integer");
  }
  return {
    provider: typeof provider === "string" ? provider : "http-live-ocr",
    text,
    confidence,
    pageCount,
  };
}

export class HttpLiveOcrProvider implements HealthAwareOcrProvider {
  private connected = false;
  private baseUrl?: string;
  private apiKey?: string;
  private timeoutMs = DEFAULT_TIMEOUT_MS;
  private maxPayloadBytes = DEFAULT_MAX_PAYLOAD_BYTES;
  private fetchImpl?: OcrHttpFetch;

  configure(input: LiveOcrConfig): void {
    if (!input.baseUrl.startsWith("https://") && !input.baseUrl.startsWith("http://localhost")) {
      throw new Error("OCR base URL must be HTTPS (or localhost for staging)");
    }
    if (!input.apiKey.trim()) throw new Error("OCR API key is required");
    this.baseUrl = input.baseUrl.replace(/\/$/, "");
    this.apiKey = input.apiKey;
    this.timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxPayloadBytes = input.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
    this.fetchImpl = input.fetchImpl;
    this.connected = false;
  }

  markConnected(): void {
    if (!this.baseUrl || !this.apiKey) throw new Error("OCR credentials not supplied");
    this.connected = true;
  }

  async health(): Promise<OcrProviderHealth> {
    if (!this.baseUrl) {
      return {
        name: "http-live-ocr",
        healthy: false,
        detail: "OCR base URL and API key not supplied — external credential required",
      };
    }
    if (!this.connected) {
      return {
        name: "http-live-ocr",
        healthy: false,
        detail: "Credentials present but live connection not yet verified",
      };
    }
    return { name: "http-live-ocr", healthy: true, detail: `Verified OCR endpoint ${this.baseUrl}` };
  }

  /**
   * POST /v1/extract with Bearer auth, timeout, payload size limit and schema validation.
   */
  async extract(request: OcrRequest): Promise<OcrResponse> {
    if (!this.connected || !this.baseUrl || !this.apiKey) {
      throw new Error("NOT_CONNECTED: Live OCR provider is not verified. Supply and verify credentials before use.");
    }
    if (request.bytes.byteLength === 0) throw new Error("OCR_EMPTY_PAYLOAD");
    if (request.bytes.byteLength > this.maxPayloadBytes) {
      throw new Error(`OCR_PAYLOAD_TOO_LARGE: max ${this.maxPayloadBytes} bytes`);
    }

    const fetchImpl = this.fetchImpl ?? defaultFetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetchImpl(`${this.baseUrl}/v1/extract`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": request.mimeType || "application/octet-stream",
          "x-document-id": request.documentId,
          accept: "application/json",
        },
        body: request.bytes,
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error("OCR_UNAUTHORIZED");
      }
      if (response.status === 413) {
        throw new Error("OCR_PAYLOAD_TOO_LARGE");
      }
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`OCR_HTTP_${response.status}`);
      }
      const payload = await response.json();
      return validateOcrResponse(payload);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") throw new Error(`OCR_TIMEOUT: exceeded ${this.timeoutMs}ms`);
        throw error;
      }
      throw new Error("OCR_UNKNOWN_FAILURE");
    } finally {
      clearTimeout(timer);
    }
  }
}

async function defaultFetch(
  url: string,
  init: { method: string; headers: Record<string, string>; body: Uint8Array; signal?: AbortSignal },
): Promise<{ status: number; json(): Promise<unknown> }> {
  if (typeof fetch !== "function") {
    throw new Error("OCR_FETCH_UNAVAILABLE: global fetch is not available");
  }
  const response = await fetch(url, {
    method: init.method,
    headers: init.headers,
    body: Buffer.from(init.body),
    signal: init.signal,
  });
  return {
    status: response.status,
    json: async () => response.json(),
  };
}

export class FallbackOcrProvider implements HealthAwareOcrProvider {
  constructor(
    private readonly primary: HealthAwareOcrProvider,
    private readonly fallback: OcrProvider,
    private readonly preferFallbackWhenUnhealthy = true,
  ) {}

  async health(): Promise<OcrProviderHealth> {
    const primary = await this.primary.health();
    if (primary.healthy) return primary;
    return {
      name: "fallback-ocr",
      healthy: true,
      detail: `Primary unhealthy (${primary.detail}); fallback available`,
    };
  }

  async extract(request: OcrRequest): Promise<OcrResponse> {
    const primaryHealth = await this.primary.health();
    if (primaryHealth.healthy) {
      try {
        return await this.primary.extract(request);
      } catch {
        // Fall through to secondary after primary failure.
      }
    } else if (!this.preferFallbackWhenUnhealthy) {
      throw new Error(`Primary OCR unhealthy: ${primaryHealth.detail}`);
    }
    return this.fallback.extract(request);
  }
}

export function createDefaultOcrStack(fixtures: Record<string, string> = {}): HealthAwareOcrProvider {
  const live = new HttpLiveOcrProvider();
  const fixture = new FixtureOcrProvider(fixtures);
  return new FallbackOcrProvider(live, fixture, true);
}
