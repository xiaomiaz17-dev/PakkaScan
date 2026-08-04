export type OcrRequest = { documentId: string; mimeType: string; bytes: Uint8Array };
export type OcrResponse = { provider: string; text: string; confidence: number; pageCount: number };
export interface OcrProvider { extract(request: OcrRequest): Promise<OcrResponse>; }

export class FixtureOcrProvider implements OcrProvider {
  constructor(private readonly fixtures: Record<string, string>) {}
  async extract(request: OcrRequest): Promise<OcrResponse> {
    const text = this.fixtures[request.documentId];
    if (!text) throw new Error(`No OCR fixture registered for ${request.documentId}`);
    return { provider: "fixture-ocr", text, confidence: 0.99, pageCount: 1 };
  }
}

export type EmailMessage = { to: string; template: "REPORT_READY" | "DOCUMENT_REQUIRED" | "PROCESSING_FAILED"; variables: Record<string, string> };
export interface EmailProvider { send(message: EmailMessage): Promise<{ messageId: string }> }

export class OutboxEmailProvider implements EmailProvider {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<{ messageId: string }> {
    if (!/^\S+@\S+\.\S+$/.test(message.to)) throw new Error("Valid recipient email is required");
    this.sent.push(structuredClone(message));
    return { messageId: `beta-email-${this.sent.length}` };
  }
}
