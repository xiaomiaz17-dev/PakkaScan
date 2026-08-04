import { json } from "@/server/http";
import { inspectStripeBoundary, PLANS } from "@/commercial/billing/plans";

export async function GET() {
  const stripe = inspectStripeBoundary();
  return json({
    plans: Object.values(PLANS).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      entitlements: p.entitlements,
      reportQuota: p.reportQuota,
      trialDays: p.trialDays,
    })),
    stripe: {
      configured: stripe.configured,
      missing: stripe.missing,
    },
  });
}
