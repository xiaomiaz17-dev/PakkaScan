import { NextResponse } from "next/server";
import { resolveCustomerApp } from "@/server/customer-app";
import { tokenFrom } from "@/commercial/auth";
import type { Jurisdiction } from "@/domain/models";

export async function GET(request: Request) {
  try {
    const token = tokenFrom(request);
    const app = resolveCustomerApp();
    const properties = app.listProperties(token);
    return NextResponse.json(properties, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "LIST_PROPERTIES_FAILED" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const token = tokenFrom(request);
    const body = await request.json();
    const label = String(body.label ?? "").trim();
    const jurisdiction = (body.jurisdiction ?? "UK") as Jurisdiction;

    if (!label) {
      return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
    }

    const app = resolveCustomerApp();
    const property = app.createProperty(token, { label, jurisdiction });
    return NextResponse.json(property, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "CREATE_PROPERTY_FAILED" }, { status: 400 });
  }
}