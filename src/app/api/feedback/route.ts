import { NextRequest, NextResponse } from "next/server";
import { saveScanFeedback } from "@/commercial/billing/session8-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body?.helpful !== "boolean") {
      return NextResponse.json({ error: "helpful_required" }, { status: 400 });
    }
    const comment =
      typeof body.comment === "string" ? body.comment.slice(0, 1000) : null;
    await saveScanFeedback({
      referenceCode: body.referenceCode ? String(body.referenceCode).slice(0, 64) : null,
      helpful: body.helpful,
      comment,
      page: body.page ? String(body.page).slice(0, 64) : "scan_results",
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[feedback] save failed:", err?.message || err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
