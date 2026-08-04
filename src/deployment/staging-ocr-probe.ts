/**
 * PD-032 — Staging OCR health probe.
 * Records connectivity against a staging endpoint without claiming production readiness.
 */

import type { HttpTransport } from "../storage/s3-driver";
import { HttpLiveOcrProvider } from "./live-ocr";

export type StagingOcrProbeOptions = {
  baseUrl: string;
  apiKey: string;
  transport?: HttpTransport;
};

export class StagingOcrProbe {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly transport?: HttpTransport;
  private readonly provider: HttpLiveOcrProvider;
  private consecutiveSuccesses = 0;

  constructor(options: StagingOcrProbeOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.transport = options.transport;
    this.provider = new HttpLiveOcrProvider();
    this.provider.configure({ baseUrl: this.baseUrl, apiKey: this.apiKey });
  }

  getProvider(): HttpLiveOcrProvider {
    return this.provider;
  }

  async probe(): Promise<{ ok: boolean; detail: string }> {
    if (!this.transport) {
      return { ok: false, detail: "No HTTP transport for staging OCR probe" };
    }
    try {
      const response = await this.transport.request({
        method: "GET",
        url: `${this.baseUrl}/health`,
        headers: { authorization: `Bearer ${this.apiKey}` },
      });
      if (response.status >= 200 && response.status < 300) {
        this.consecutiveSuccesses += 1;
        // Only mark the provider connected after the first successful staging probe.
        // Continuous gating is handled by ContinuousProbeGate in production bootstrap.
        if (this.consecutiveSuccesses >= 1) {
          this.provider.markConnected();
        }
        return { ok: true, detail: `staging OCR health → ${response.status}` };
      }
      this.consecutiveSuccesses = 0;
      return { ok: false, detail: `staging OCR health → ${response.status}` };
    } catch (error) {
      this.consecutiveSuccesses = 0;
      return { ok: false, detail: error instanceof Error ? error.message : "staging OCR probe failed" };
    }
  }
}

/** Minimal healthy staging OCR HTTP stub for tests. */
export class StagingOcrHttpStub {
  private healthy = true;

  setHealthy(value: boolean): void {
    this.healthy = value;
  }

  async request(input: { method: string; url: string }): Promise<{ status: number; body: Uint8Array }> {
    if (!this.healthy) return { status: 503, body: new TextEncoder().encode("down") };
    if (input.method === "GET" && input.url.endsWith("/health")) {
      return { status: 200, body: new TextEncoder().encode(JSON.stringify({ status: "ok" })) };
    }
    return { status: 404, body: new TextEncoder().encode("not found") };
  }
}
