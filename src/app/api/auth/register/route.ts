import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  createCsrfToken,
  csrfCookieOptions,
  sessionCookieOptions,
} from "@/server/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim();
    const displayName = String(body.displayName ?? "").trim();
    const password = String(body.password ?? "");
    if (!email || !displayName || password.length < 10) {
      return json({ error: "VALIDATION_FAILED" }, 400);
    }
    const app = resolveCustomerApp();
    const registered = await awaitify(app.register({ email, displayName, password }));
    const loggedIn = await awaitify(app.login({ email, password }));
    const csrf = createCsrfToken();
    const response = json({ userId: registered.userId, csrf, mode: app.mode }, 201);
    response.cookies.set(SESSION_COOKIE, loggedIn.token, sessionCookieOptions());
    response.cookies.set(CSRF_COOKIE, csrf, csrfCookieOptions());
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
