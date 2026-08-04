import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import { SESSION_COOKIE, parseCookieHeader } from "@/server/session";

export async function GET(request: Request) {
  try {
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    const token = cookies[SESSION_COOKIE];
    if (!token) return json({ authenticated: false }, 401);
    const user = await awaitify(resolveCustomerApp().authenticate(token));
    return json({ authenticated: true, user });
  } catch (error) {
    return errorResponse(error);
  }
}
