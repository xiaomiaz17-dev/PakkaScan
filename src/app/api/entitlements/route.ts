/**
 * GET /api/entitlements
 *
 * Returns the signed-in user's unused report credits, broken down by type.
 * Used by /scan page to display credit banner and enforce UI-level gating.
 *
 * Response shape:
 *   { credits: [{ type: "rental", count: 1 }], total: 1, byType: {...} }
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUnusedEntitlements } from "@/commercial/billing/entitlement-store";
import type { ReportType } from "@/commercial/billing/reports";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "NOT_SIGNED_IN", credits: [], total: 0 },
        { status: 401 }
      );
    }

    const unused = await getUnusedEntitlements(session.userId);

    // Count by report type
    const byType: Record<string, number> = { rental: 0, bayana: 0, full_dd: 0 };
    for (const ent of unused) {
      byType[ent.report_type] = (byType[ent.report_type] ?? 0) + 1;
    }

    const credits = (Object.keys(byType) as ReportType[])
      .filter((t) => byType[t] > 0)
      .map((t) => ({ type: t, count: byType[t] }));

    return NextResponse.json({
      credits,
      total: unused.length,
      byType,
    });
  } catch (err: any) {
    console.error("[api/entitlements] error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", credits: [], total: 0 },
      { status: 500 }
    );
  }
}