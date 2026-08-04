import { awaitify, resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  assertCsrf,
  parseCookieHeader,
} from "@/server/session";
import { canRunFullAnalysis, recordReportUsage } from "@/commercial/billing/entitlements";
import { getPlanState, setPlanState } from "@/commercial/billing/plan-store";
import { notify } from "@/commercial/notifications";
import { isSamplePropertyLabel } from "@/commercial/onboarding/sample-property";

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await Promise.resolve(context.params);
    const cookies = parseCookieHeader(request.headers.get("cookie"));
    assertCsrf(cookies[CSRF_COOKIE], request.headers.get(CSRF_HEADER) ?? undefined);
    const token = cookies[SESSION_COOKIE];
    if (!token) throw new Error("UNAUTHENTICATED");
    const app = resolveCustomerApp();
    const user = (await awaitify(app.authenticate(token))) as { id: string };
    const property = (await awaitify(app.getProperty(token, params.id))) as { id: string; label: string };
    const plan = getPlanState(user.id);
    // Sample properties may analyse on free plan for first-run education
    if (!isSamplePropertyLabel(property.label)) {
      const gate = canRunFullAnalysis(plan);
      if (!gate.allowed) {
        return json({ error: gate.reason ?? "ENTITLEMENT_DENIED" }, 402);
      }
    }
    const result = await awaitify(app.analyseProperty(token, params.id));
    if (!isSamplePropertyLabel(property.label)) {
      setPlanState(recordReportUsage(plan));
    }
    notify(user.id, {
      kind: "report_ready",
      title: "Report ready",
      body: `Analysis finished for ${property.label}. Open your report and Property Passport.`,
    });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
