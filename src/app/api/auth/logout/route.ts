import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  assertCsrf,
  parseCookieHeader,
} from "@/server/session";

export async function POST(request: Request) {
  try {
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    assertCsrf(cookies[CSRF_COOKIE], request.headers.get(CSRF_HEADER) ?? undefined);
    const token = cookies[SESSION_COOKIE];
    if (token) await awaitify(resolveCustomerApp().logout(token));
    const response = json({ ok: true }, 200);
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    response.cookies.set(CSRF_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
