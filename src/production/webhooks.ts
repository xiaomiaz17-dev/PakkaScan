import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookEnvelope = { eventId: string; timestamp: number; payload: string; signature: string };

export function signWebhook(eventId: string, timestamp: number, payload: string, secret: string): WebhookEnvelope {
  const signature = createHmac("sha256", secret).update(`${eventId}.${timestamp}.${payload}`).digest("base64url");
  return { eventId, timestamp, payload, signature };
}

export class WebhookReplayGuard {
  private processed = new Set<string>();

  verify(envelope: WebhookEnvelope, secret: string, now = new Date(), toleranceSeconds = 300): boolean {
    if (this.processed.has(envelope.eventId)) return false;
    const age = Math.abs(Math.floor(now.getTime() / 1000) - envelope.timestamp);
    if (age > toleranceSeconds) return false;
    const expected = signWebhook(envelope.eventId, envelope.timestamp, envelope.payload, secret).signature;
    const a = Buffer.from(envelope.signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    this.processed.add(envelope.eventId);
    return true;
  }
}
