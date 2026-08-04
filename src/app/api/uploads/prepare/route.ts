import { NextResponse } from "next/server";
import { z } from "zod";
import { UploadValidationError, validateUpload } from "../../../../ingestion/security";

const schema = z.object({
  propertyId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    return NextResponse.json({ upload: validateUpload(body) }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_REQUEST", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
