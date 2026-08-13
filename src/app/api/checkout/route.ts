/**
 * POST /api/checkout
 *
 * Creates a Stripe checkout session for a report purchase.
 * Requires: valid session cookie (JWT).
 *
 * Behavior:
 *   - BETA mode: refuses checkout (returns 400 with redirect to /scan)
 *   - PAID mode: creates Stripe checkout session, returns URL
 *   - If user already has an unused entitlement for the report, redirects to /scan
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../lib/session";
import {
  isValidReportType,
  getPaymentsMode,
  getReport,
} from "../../../commercial/billing/reports";
import { createStripeCheckoutSession } from "../../../commercial/billing/gateways/stripe-gateway";
import {
  getUnusedEntitlements,
  createPurchase,
} from "../../../commercial/billing/entitlement-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via JWT session cookie
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { userId, email } = session;

    // 2. Validate reportType from request body
    const body = await req.json();
    const reportType = body.reportType;
    if (!isValidReportType(reportType)) {
      return NextResponse.json({ error: "INVALID_REPORT_TYPE" }, { status: 400 });
    }

    // 3. Check payments mode
    const mode = getPaymentsMode();
    if (mode === "beta") {
      return NextResponse.json(
        { error: "BETA_MODE_NO_CHECKOUT", redirectTo: "/scan" },
        { status: 400 }
      );
    }

    // 4. If user already has an unused entitlement, skip checkout
    const unused = await getUnusedEntitlements(userId, reportType);
    if (unused.length > 0) {
      return NextResponse.json({
        alreadyEntitled: true,
        redirectTo: "/scan",
        message: "You already have credit for this report.",
      });
    }

    // 5. Create Stripe checkout session
    const report = getReport(reportType);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const { sessionId, url } = await createStripeCheckoutSession({
      userId,
      userEmail: email,
      reportType,
      appUrl,
    });

    // 6. Record pending purchase (audit trail)
    await createPurchase({
      userId,
      gateway: "stripe",
      gatewaySessionId: sessionId,
      reportType,
      amountCents: report.priceUsdCents,
      currency: "usd",
    });

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("[checkout] error:", err);
    return NextResponse.json(
      { error: "CHECKOUT_FAILED", detail: err.message },
      { status: 500 }
    );
  }
}