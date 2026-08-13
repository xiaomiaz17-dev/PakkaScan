/**
 * POST /api/webhook/stripe
 *
 * Receives webhook events from Stripe (checkout.session.completed etc.)
 * Verifies signature, then marks the purchase as paid and grants the entitlement.
 *
 * Idempotent: safe to receive the same event multiple times (Stripe retries).
 *
 * IMPORTANT: This route uses the RAW request body for signature verification.
 * Do not parse as JSON before verifying.
 */

import { NextRequest, NextResponse } from "next/server";
import { constructStripeWebhookEvent } from "../../../../commercial/billing/gateways/stripe-gateway";
import {
  markPurchasePaid,
  grantEntitlement,
  getPurchaseBySessionId,
} from "../../../../commercial/billing/entitlement-store";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  }

  // MUST read raw body for signature verification
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = constructStripeWebhookEvent(rawBody, signature);
  } catch (err: any) {
    console.error("[stripe-webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? "";

      // Look up the pending purchase we created when the session was created
      const purchase = await getPurchaseBySessionId(sessionId);
      if (!purchase) {
        console.error("[stripe-webhook] no matching purchase for session:", sessionId);
        // Return 200 so Stripe doesn't retry - this is a data issue, not a Stripe issue
        return NextResponse.json({ received: true, warning: "no matching purchase" });
      }

      // Idempotency: if already processed, no-op
      if (purchase.status === "paid") {
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }

      // Mark purchase paid + grant the entitlement
      const updated = await markPurchasePaid(sessionId, paymentIntent);
      if (updated) {
        await grantEntitlement({
          userId: updated.user_id,
          reportType: updated.report_type,
          source: "purchase",
          purchaseId: updated.id,
        });
        console.log(
          `[stripe-webhook] paid + entitled: user=${updated.user_id}, report=${updated.report_type}`
        );
      }
    }

    // Acknowledge receipt to Stripe
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook] processing error:", err);
    // Return 200 to prevent Stripe retries on non-retryable errors
    // (log for investigation instead)
    return NextResponse.json({ received: true, error: err.message });
  }
}