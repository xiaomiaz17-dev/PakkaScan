/**
 * GET /api/config/payments
 *
 * Returns the current payments mode ('beta' or 'paid').
 * Called by the frontend to decide whether to render "Buy" or "Scan Free in Beta" buttons.
 *
 * Public endpoint - no authentication needed.
 */

import { NextResponse } from "next/server";
import { getPaymentsMode } from "../../../../commercial/billing/reports";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ mode: getPaymentsMode() });
}