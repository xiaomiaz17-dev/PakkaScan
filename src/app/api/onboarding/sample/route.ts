import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  assertCsrf,
  parseCookieHeader,
} from "@/server/session";
import { SAMPLE_PROPERTY } from "@/commercial/onboarding/sample-property";
import { isEnabled } from "@/commercial/feature-flags";

export async function POST(request: Request) {
  try {
    if (!isEnabled("sample_property")) return json({ error: "FEATURE_DISABLED" }, 403);
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    assertCsrf(cookies[CSRF_COOKIE], request.headers.get(CSRF_HEADER) ?? undefined);
    const token = cookies[SESSION_COOKIE];
    if (!token) throw new Error("UNAUTHENTICATED");
    const app = resolveCustomerApp();
    const property = (await awaitify(
      app.createProperty(token, {
        label: SAMPLE_PROPERTY.label,
        jurisdiction: SAMPLE_PROPERTY.jurisdiction,
      }),
    )) as { id: string };
    await awaitify(
      app.uploadTextDocument(token, {
        propertyId: property.id,
        fileName: SAMPLE_PROPERTY.document.fileName,
        text: SAMPLE_PROPERTY.document.text,
      }),
    );
    try {
      await awaitify(app.analyseProperty(token, property.id));
    } catch {
      // sample may still be useful without full analysis in constrained modes
    }
    return json({ propertyId: property.id }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
