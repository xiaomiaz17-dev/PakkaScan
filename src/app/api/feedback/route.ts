import { json, errorResponse } from "@/server/http";
import { submitFeedback } from "@/commercial/feedback";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  assertCsrf,
  parseCookieHeader,
} from "@/server/session";
import { awaitify, resolveCustomerApp } from "@/server/customer-app";

export async function POST(request: Request) {
  try {
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    assertCsrf(cookies[CSRF_COOKIE], request.headers.get(CSRF_HEADER) ?? undefined);
    const body = await request.json();
    let userId: string | undefined;
    const token = cookies[SESSION_COOKIE];
    if (token) {
      try {
        const user = (await awaitify(resolveCustomerApp().authenticate(token))) as { id?: string };
        userId = user.id;
      } catch {
        /* optional auth */
      }
    }
    const item = submitFeedback({
      userId,
      category: (body.category as "bug" | "idea" | "praise" | "other") || "other",
      message: String(body.message ?? ""),
    });
    return json(item, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
