import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import { SESSION_COOKIE, parseCookieHeader } from "@/server/session";
import { listNotifications } from "@/commercial/notifications";

export async function GET(request: Request) {
  try {
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    const token = cookies[SESSION_COOKIE];
    if (!token) throw new Error("UNAUTHENTICATED");
    const user = (await awaitify(resolveCustomerApp().authenticate(token))) as { id: string };
    return json({ notifications: listNotifications(user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}
