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
    const status = app.getProperty(tokenFrom(request), id);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "STATUS_NOT_FOUND" }, { status: 400 });
  }
}