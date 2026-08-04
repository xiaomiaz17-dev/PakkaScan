import { NextResponse } from "next/server";
import { getReleaseMetadata } from "@/release/metadata";

export function GET() {
  return NextResponse.json(getReleaseMetadata());
}
