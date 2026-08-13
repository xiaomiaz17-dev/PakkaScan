/**
 * Stripe payment gateway implementation.
 * International customers (UK / EU / US diaspora) pay in USD.
 *
 * Env vars required:
 *   STRIPE_SECRET_KEY        - sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET    - whsec_...
 *   STRIPE_PRICE_RENTAL      - price_...
 *   STRIPE_PRICE_BAYANA      - price_...
 *   STRIPE_PRICE_FULL_DD     - price_...
 */

import Stripe from "stripe";
import { getReport, type ReportType } from "../reports";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  stripeClient = new Stripe(key);
  return stripeClient;
}

export async function createStripeCheckoutSession(input: {
  userId: string;
  userEmail: string;
  reportType: ReportType;
  appUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripeClient();
  const report = getReport(input.reportType);
  const priceId = process.env[report.stripePriceEnvKey];

  if (!priceId) {
    throw new Error(`Stripe price not configured: ${report.stripePriceEnvKey}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: input.userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${input.appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.appUrl}/payment/cancel`,
    metadata: {
      userId: input.userId,
      reportType: input.reportType,
    },
    payment_intent_data: {
      metadata: {
        userId: input.userId,
        reportType: input.reportType,
      },
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { sessionId: session.id, url: session.url };
}

export function constructStripeWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}