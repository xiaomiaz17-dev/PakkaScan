/**
 * Report catalog. Single source of truth for report types, pricing, and
 * Stripe price ID mappings. Adding a new report = add here + create Stripe product.
 */

export type ReportType = "rental" | "bayana" | "full_dd";

export type ReportDefinition = {
  id: ReportType;
  displayName: string;
  descriptionPkr: string;
  descriptionUsd: string;
  pricePkr: number;              // For display only
  priceUsdCents: number;         // For Stripe charging (Stripe uses cents)
  freeInBeta: boolean;
  eligibleForFreeGrant: boolean; // Can user get 1 free of this?
  stripePriceEnvKey: string;     // Which .env var holds the Stripe Price ID
  includes: string[];
};

export const REPORTS: Record<ReportType, ReportDefinition> = {
  rental: {
    id: "rental",
    displayName: "Rental Safety Check",
    descriptionPkr: "For renters signing a new tenancy.",
    descriptionUsd: "For renters signing a new tenancy.",
    pricePkr: 499,
    priceUsdCents: 499,           // $4.99
    freeInBeta: true,
    eligibleForFreeGrant: true,   // Only Rental gets the free scan
    stripePriceEnvKey: "STRIPE_PRICE_RENTAL",
    includes: ["Tenancy Agreement", "Landlord CNIC verification"],
  },
  bayana: {
    id: "bayana",
    displayName: "Bayana Safety Check",
    descriptionPkr: "Before you hand over any token money.",
    descriptionUsd: "Before you hand over any token money.",
    pricePkr: 1499,
    priceUsdCents: 999,           // $9.99
    freeInBeta: true,
    eligibleForFreeGrant: false,
    stripePriceEnvKey: "STRIPE_PRICE_BAYANA",
    includes: [
      "Bayana / Agreement to Sell",
      "Seller CNIC verification",
      "Current Fard (Ownership Record)",
    ],
  },
  full_dd: {
    id: "full_dd",
    displayName: "Full Property Due Diligence",
    descriptionPkr: "For property purchases at Sale Deed stage.",
    descriptionUsd: "For property purchases at Sale Deed stage.",
    pricePkr: 2999,
    priceUsdCents: 1999,          // $19.99
    freeInBeta: true,
    eligibleForFreeGrant: false,
    stripePriceEnvKey: "STRIPE_PRICE_FULL_DD",
    includes: [
      "Registered Sale Deed",
      "Current Fard",
      "Mutation record",
      "Seller CNIC",
      "Non-Encumbrance Certificate",
    ],
  },
};

export function getReport(id: ReportType): ReportDefinition {
  const report = REPORTS[id];
  if (!report) throw new Error(`Unknown report type: ${id}`);
  return report;
}

export function isValidReportType(id: string): id is ReportType {
  return id in REPORTS;
}

export type PaymentsMode = "beta" | "paid";

export function getPaymentsMode(): PaymentsMode {
  const mode = process.env.PAYMENTS_MODE;
  return mode === "paid" ? "paid" : "beta";
}