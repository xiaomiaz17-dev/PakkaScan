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
    const passport = app.getPassport(tokenFrom(request), id);
    return NextResponse.json(passport);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "PASSPORT_NOT_READY" }, { status: 400 });
  }
}