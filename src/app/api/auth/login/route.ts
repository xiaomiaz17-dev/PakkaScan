import { resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import { assertLoginAllowed } from "@/server/login-rate-limit";
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
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return json({ error: "VALIDATION_FAILED" }, 400);
    assertLoginAllowed(email);
    
    const app = resolveCustomerApp();
    const loggedIn = app.login({ email, password });
    const csrf = createCsrfToken();
    
    const response = json({ userId: loggedIn.userId, csrf }, 200);
    response.cookies.set(SESSION_COOKIE, loggedIn.token, sessionCookieOptions());
    response.cookies.set(CSRF_COOKIE, csrf, csrfCookieOptions());
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}