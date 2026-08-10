import { NextResponse } from "next/server";
import { resolveCustomerApp } from "@/server/customer-app";
import { tokenFrom } from "@/commercial/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const textInput = formData.get("text") as string | null;
    const fileName = (formData.get("fileName") as string) || file?.name || "document.pdf";

    const app = resolveCustomerApp();
    const token = tokenFrom(request);

    let doc;
    if (file) {
      const bytes = Buffer.from(await file.arrayBuffer());
      doc = app.uploadDocument(token, {
        propertyId: id,
        fileName,
        contentType: file.type || "application/pdf",
        bytes,
      });
    } else if (textInput) {
      doc = app.uploadTextDocument(token, { propertyId: id, fileName, text: textInput });
    } else {
      return NextResponse.json({ error: "NO_DOCUMENTS" }, { status: 400 });
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "UPLOAD_TOO_LARGE" }, { status: 400 });
  }
}