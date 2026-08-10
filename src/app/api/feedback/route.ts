import { NextResponse } from "next/server";
import { resolveCustomerApp } from "@/server/customer-app";
import { tokenFrom } from "@/commercial/auth";

export async function POST(request: Request) {
  try {
    const token = tokenFrom(request);
    const user = resolveCustomerApp().authenticate(token) as { id?: string };
    const body = await request.json();
    
    // Process feedback here using user.id if needed
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "FEEDBACK_FAILED" }, { status: 400 });
  }
}