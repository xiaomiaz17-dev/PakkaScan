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
    const property = app.getProperty(tokenFrom(request), id);
    if (!property) {
      return NextResponse.json({ error: "PROPERTY_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(property);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "UNAUTHENTICATED" }, { status: 401 });
  }
}