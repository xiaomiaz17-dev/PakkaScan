import { NextResponse } from "next/server";
import { resolveCustomerApp } from "@/server/customer-app";
import { tokenFrom } from "@/commercial/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const app = resolveCustomerApp();
    const report = app.getPropertyReport(tokenFrom(request), id);
    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "REPORT_NOT_READY" }, { status: 400 });
  }
}