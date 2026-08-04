import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import { SESSION_COOKIE, parseCookieHeader } from "@/server/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await Promise.resolve(context.params);
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    const token = cookies[SESSION_COOKIE];
    if (!token) throw new Error("UNAUTHENTICATED");
    return json(await awaitify(resolveCustomerApp().getProcessingStatus(token, params.id)));
  } catch (error) {
    return errorResponse(error);
  }
}
