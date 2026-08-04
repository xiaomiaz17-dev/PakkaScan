import { NextResponse } from "next/server";
import { z } from "zod";
import { createProcessingJobs } from "../../../../ingestion/jobs";

const schema = z.object({
  uploadId: z.string().uuid(),
  propertyId: z.string().min(1),
  storageKey: z.string().startsWith("quarantine/"),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    return NextResponse.json({ status: "QUARANTINED", jobs: createProcessingJobs(input) }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_REQUEST", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
