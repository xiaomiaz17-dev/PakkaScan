import { NextResponse } from "next/server";
import { resolveCustomerApp } from "@/server/customer-app";
import { tokenFrom } from "@/commercial/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const app = resolveCustomerApp();
    const result = app.analyseProperty(tokenFrom(request), id);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "ANALYSIS_FAILED" }, { status: 400 });
  }
}