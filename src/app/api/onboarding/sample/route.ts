import { NextResponse } from "next/server";
import { resolveCustomerApp } from "@/server/customer-app";
import { tokenFrom } from "@/commercial/auth";
import type { Jurisdiction } from "@/domain/models";

export async function POST(request: Request) {
  try {
    const token = tokenFrom(request);
    const app = resolveCustomerApp();

    const property = app.createProperty(token, {
      label: "Sample Property",
      jurisdiction: "UK" as Jurisdiction,
    });

    const doc = app.uploadTextDocument(token, {
      propertyId: property.id,
      fileName: "sample-deed.txt",
      text: "Sample property title deed text for initial onboarding verification.",
    });

    return NextResponse.json({ property, doc }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "ONBOARDING_FAILED" }, { status: 400 });
  }
}