import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  assertCsrf,
  parseCookieHeader,
} from "@/server/session";

function tokenFrom(request: Request): string {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE];
  if (!token) throw new Error("UNAUTHENTICATED");
  return token;
}

export async function GET(request: Request) {
  try {
    const properties = await awaitify(resolveCustomerApp().listProperties(tokenFrom(request)));
    return json({ properties });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    assertCsrf(cookies[CSRF_COOKIE], request.headers.get(CSRF_HEADER) ?? undefined);
    const body = await request.json();
    const label = String(body.label ?? "").trim();
    const jurisdiction = String(body.jurisdiction ?? "PUNJAB");
    if (!label) return json({ error: "VALIDATION_FAILED" }, 400);
    const property = await awaitify(
      resolveCustomerApp().createProperty(tokenFrom(request), { label, jurisdiction }),
    );
    return json(property, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
