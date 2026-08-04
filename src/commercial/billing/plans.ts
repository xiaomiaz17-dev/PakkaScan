/**
 * Subscription and entitlement boundaries.
 * Stripe credentials are never hard-coded; configure via env at deploy time.
 */

export type PlanId = "free" | "pro" | "team" | "enterprise";

export type Entitlement =
  | "SAMPLE_PROPERTY"
  | "FULL_REPORT"
  | "PASSPORT"
  | "TEAM_SEATS"
  | "REVIEW_QUEUE"
  | "API_ACCESS"
  | "PRIORITY_SUPPORT";

export type PlanDefinition = {
  id: PlanId;
  displayName: string;
  entitlements: Entitlement[];
  reportQuota: number | "unlimited";
  trialDays: number;
  /** Stripe price id resolved from env — never embedded secrets */
  stripePriceEnvKey?: string;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    displayName: "Explore",
    entitlements: ["SAMPLE_PROPERTY"],
    reportQuota: 0,
    trialDays: 0,
  },
  pro: {
    id: "pro",
    displayName: "Professional",
    entitlements: ["FULL_REPORT", "PASSPORT", "PRIORITY_SUPPORT"],
    reportQuota: 1,
    trialDays: 0,
    stripePriceEnvKey: "STRIPE_PRICE_PRO",
  },
  team: {
    id: "team",
    displayName: "Team",
    entitlements: ["FULL_REPORT", "PASSPORT", "TEAM_SEATS", "REVIEW_QUEUE", "PRIORITY_SUPPORT"],
    reportQuota: "unlimited",
    trialDays: 14,
    stripePriceEnvKey: "STRIPE_PRICE_TEAM",
  },
  enterprise: {
    id: "enterprise",
    displayName: "Enterprise",
    entitlements: ["FULL_REPORT", "PASSPORT", "TEAM_SEATS", "REVIEW_QUEUE", "API_ACCESS", "PRIORITY_SUPPORT"],
    reportQuota: "unlimited",
    trialDays: 0,
  },
};

export function hasEntitlement(planId: PlanId, entitlement: Entitlement): boolean {
  return PLANS[planId].entitlements.includes(entitlement);
}

export function resolveStripePriceId(planId: PlanId, env: Record<string, string | undefined> = process.env): string | null {
  const key = PLANS[planId].stripePriceEnvKey;
  if (!key) return null;
  const value = env[key]?.trim();
  return value && value.length > 0 ? value : null;
}

export type StripeBoundaryConfig = {
  configured: boolean;
  publishableKeyPresent: boolean;
  secretKeyPresent: boolean;
  webhookSecretPresent: boolean;
  missing: string[];
};

/** Inspect Stripe env without requiring credentials in tests or local dev. */
export function inspectStripeBoundary(env: Record<string, string | undefined> = process.env): StripeBoundaryConfig {
  const missing: string[] = [];
  const publishableKeyPresent = !!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const secretKeyPresent = !!env.STRIPE_SECRET_KEY;
  const webhookSecretPresent = !!env.STRIPE_WEBHOOK_SECRET;
  if (!publishableKeyPresent) missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  if (!secretKeyPresent) missing.push("STRIPE_SECRET_KEY");
  if (!webhookSecretPresent) missing.push("STRIPE_WEBHOOK_SECRET");
  return {
    configured: missing.length === 0,
    publishableKeyPresent,
    secretKeyPresent,
    webhookSecretPresent,
    missing,
  };
}
