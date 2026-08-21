import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  grantEntitlement,
  createPurchase,
  markPurchasePaid,
} from "@/commercial/billing/entitlement-store";
import {
  isValidReportType,
  getReport,
  type ReportType,
} from "@/commercial/billing/reports";

export const runtime = "nodejs";

/**
 * POST /api/admin/grant-entitlement
 * Header: x-admin-grant-secret: <ADMIN_GRANT_SECRET>
 * Body: { "email": "user@...", "reportType": "bayana"|"rental"|"full_dd", "note": "txn id" }
 *
 * Customer must Sign in once first (users row required).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_GRANT_SECRET;
  if (!secret || req.headers.get("x-admin-grant-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const reportTypeRaw = String(body.reportType || "").trim();
    const note = String(body.note || "").trim().slice(0, 200);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    if (!isValidReportType(reportTypeRaw)) {
      return NextResponse.json({ error: "invalid_report_type" }, { status: 400 });
    }
    const reportType = reportTypeRaw as ReportType;

    const users = await sql`
      SELECT id, email FROM users WHERE lower(email) = ${email} LIMIT 1
    `;
    if (!users.length) {
      return NextResponse.json(
        {
          error: "user_not_found",
          message: "User must Sign in on pakkascan.com once before we can unlock.",
        },
        { status: 404 }
      );
    }

    const userId = String((users[0] as { id: string }).id);
    const report = getReport(reportType);
    const sessionId = `raast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const purchase = await createPurchase({
      userId,
      gateway: "raast",
      gatewaySessionId: sessionId,
      reportType,
      amountCents: report.pricePkr * 100,
      currency: "pkr",
    });

    await markPurchasePaid(sessionId, note || "raast_manual");

    const ent = await grantEntitlement({
      userId,
      reportType,
      source: "purchase",
      purchaseId: purchase.id,
    });

    return NextResponse.json({
      ok: true,
      email,
      reportType,
      entitlementId: ent.id,
      purchaseId: purchase.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "server_error";
    console.error("[admin/grant-entitlement]", message);
    return NextResponse.json({ error: "server_error", detail: message }, { status: 500 });
  }
}
