import { NextResponse } from "next/server";
import { resolveCustomerApp } from "@/server/customer-app";
import { tokenFrom } from "@/commercial/auth";

export async function GET(request: Request) {
  try {
    const token = tokenFrom(request);
    const user = resolveCustomerApp().authenticate(token) as { id: string };
    
    // Fetch or return notifications for user.id
    
    return NextResponse.json({ notifications: [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "NOTIFICATIONS_FAILED" }, { status: 400 });
  }
}