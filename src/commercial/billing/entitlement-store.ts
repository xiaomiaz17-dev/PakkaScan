/**
 * Neon-backed entitlement + purchase store.
 * Uses the same raw SQL pattern as the rest of the app (src/lib/db.ts).
 *
 * Tables:
 *   purchases            - audit trail of every payment attempt
 *   report_entitlements  - what reports a user can generate
 *   scan_usage           - analytics/audit log
 */

import { sql } from "../../lib/db";
import type { ReportType } from "./reports";

export type PurchaseRow = {
  id: string;
  user_id: string;
  gateway: string;
  gateway_session_id: string | null;
  gateway_payment_intent: string | null;
  report_type: ReportType;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  created_at: Date;
  paid_at: Date | null;
  metadata: Record<string, unknown>;
};

export type EntitlementRow = {
  id: string;
  user_id: string;
  report_type: ReportType;
  source: "free_scan" | "purchase" | "beta_grant";
  purchase_id: string | null;
  granted_at: Date;
  used_at: Date | null;
  expires_at: Date | null;
};

// ============================================
// PURCHASES
// ============================================

export async function createPurchase(input: {
  userId: string;
  gateway: string;
  gatewaySessionId: string;
  reportType: ReportType;
  amountCents: number;
  currency: string;
}): Promise<PurchaseRow> {
  const rows = await sql`
    INSERT INTO purchases (user_id, gateway, gateway_session_id, report_type, amount_cents, currency, status)
    VALUES (${input.userId}, ${input.gateway}, ${input.gatewaySessionId}, ${input.reportType}, ${input.amountCents}, ${input.currency}, 'pending')
    RETURNING *
  `;
  return rows[0] as PurchaseRow;
}

export async function markPurchasePaid(
  gatewaySessionId: string,
  paymentIntent: string
): Promise<PurchaseRow | null> {
  const rows = await sql`
    UPDATE purchases
    SET status = 'paid', paid_at = NOW(), gateway_payment_intent = ${paymentIntent}
    WHERE gateway_session_id = ${gatewaySessionId} AND status = 'pending'
    RETURNING *
  `;
  return (rows[0] as PurchaseRow) ?? null;
}

export async function getPurchaseBySessionId(
  gatewaySessionId: string
): Promise<PurchaseRow | null> {
  const rows = await sql`
    SELECT * FROM purchases WHERE gateway_session_id = ${gatewaySessionId} LIMIT 1
  `;
  return (rows[0] as PurchaseRow) ?? null;
}

// ============================================
// ENTITLEMENTS
// ============================================

export async function grantEntitlement(input: {
  userId: string;
  reportType: ReportType;
  source: "free_scan" | "purchase" | "beta_grant";
  purchaseId?: string;
}): Promise<EntitlementRow> {
  const rows = await sql`
    INSERT INTO report_entitlements (user_id, report_type, source, purchase_id)
    VALUES (${input.userId}, ${input.reportType}, ${input.source}, ${input.purchaseId ?? null})
    RETURNING *
  `;
  return rows[0] as EntitlementRow;
}

export async function getUnusedEntitlements(
  userId: string,
  reportType?: ReportType
): Promise<EntitlementRow[]> {
  if (reportType) {
    const rows = await sql`
      SELECT * FROM report_entitlements
      WHERE user_id = ${userId} AND report_type = ${reportType} AND used_at IS NULL
      ORDER BY granted_at ASC
    `;
    return rows as EntitlementRow[];
  }
  const rows = await sql`
    SELECT * FROM report_entitlements
    WHERE user_id = ${userId} AND used_at IS NULL
    ORDER BY granted_at ASC
  `;
  return rows as EntitlementRow[];
}

export async function consumeEntitlement(entitlementId: string): Promise<EntitlementRow | null> {
  const rows = await sql`
    UPDATE report_entitlements
    SET used_at = NOW()
    WHERE id = ${entitlementId} AND used_at IS NULL
    RETURNING *
  `;
  return (rows[0] as EntitlementRow) ?? null;
}

/**
 * Idempotently grant a free Rental Safety Check to a user.
 * Called on new user signup so every user gets exactly one free rental scan.
 */
export async function ensureFreeRentalGrant(userId: string): Promise<void> {
  await sql`
    INSERT INTO report_entitlements (user_id, report_type, source)
    SELECT ${userId}, 'rental', 'free_scan'
    WHERE NOT EXISTS (
      SELECT 1 FROM report_entitlements
      WHERE user_id = ${userId} AND report_type = 'rental' AND source = 'free_scan'
    )
  `;
}

// ============================================
// SCAN USAGE
// ============================================

export async function recordScanUsage(input: {
  userId: string;
  entitlementId: string;
  reportType: ReportType;
}): Promise<void> {
  await sql`
    INSERT INTO scan_usage (user_id, entitlement_id, report_type)
    VALUES (${input.userId}, ${input.entitlementId}, ${input.reportType})
  `;
}