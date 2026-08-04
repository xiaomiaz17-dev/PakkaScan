import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import { SESSION_COOKIE, parseCookieHeader } from "@/server/session";

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await Promise.resolve(context.params);
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    const token = cookies[SESSION_COOKIE];
    if (!token) throw new Error("UNAUTHENTICATED");
    const app = resolveCustomerApp();
    const property = await awaitify(app.getProperty(token, params.id));
    const documents = await awaitify(
      (app as any).listDocuments
        ? (app as any).listDocuments(token, params.id)
        : Promise.resolve([]),
    ).catch(async () => {
      // BetaApplication path: list via getProperty only
      return [];
    });
    return json({ property, documents });
  } catch (error) {
    return errorResponse(error);
  }
}
