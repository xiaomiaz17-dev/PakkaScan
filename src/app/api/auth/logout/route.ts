import { tokenFrom } from "@/commercial/auth";
import { resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import { CSRF_COOKIE, SESSION_COOKIE, csrfCookieOptions, sessionCookieOptions } from "@/server/session";

export async function POST(request: Request) {
  try {
    const token = tokenFrom(request);
    if (token) {
      resolveCustomerApp().logout(token);
    }
    const response = json({ success: true }, 200);
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    response.cookies.set(CSRF_COOKIE, "", { ...csrfCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}