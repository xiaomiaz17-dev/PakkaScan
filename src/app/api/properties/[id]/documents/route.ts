import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  assertCsrf,
  parseCookieHeader,
} from "@/server/session";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "text/plain"]);
const MAX = 15 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await Promise.resolve(context.params);
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    assertCsrf(cookies[CSRF_COOKIE], request.headers.get(CSRF_HEADER) ?? undefined);
    const token = cookies[SESSION_COOKIE];
    if (!token) throw new Error("UNAUTHENTICATED");
    const app = resolveCustomerApp();
    const contentTypeHeader = request.headers.get("content-type") ?? "";
    if (contentTypeHeader.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "VALIDATION_FAILED" }, 400);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.byteLength > MAX) throw new Error("UPLOAD_TOO_LARGE");
      const contentType = (file.type || "text/plain").split(";")[0]!;
      const safeType = ALLOWED.has(contentType) ? contentType : "text/plain";
      const doc = await awaitify(
        app.uploadDocument(token, {
          propertyId: params.id,
          fileName: file.name || "document.bin",
          contentType: safeType,
          bytes,
        }),
      );
      return json(doc, 201);
    }
    const body = await request.json();
    const text = String(body.text ?? "");
    const fileName = String(body.fileName ?? "document.txt");
    if (!text.trim()) return json({ error: "VALIDATION_FAILED" }, 400);
    const doc = await awaitify(app.uploadTextDocument(token, { propertyId: params.id, fileName, text }));
    return json(doc, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
