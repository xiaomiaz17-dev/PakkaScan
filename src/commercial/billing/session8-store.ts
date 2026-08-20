import { sql } from "@/lib/db";

export async function updatePdfHash(input: {
  referenceCode: string;
  pdfHash: string;
}): Promise<void> {
  await sql`
    UPDATE scan_usage
    SET pdf_hash = ${input.pdfHash}, pdf_generated_at = NOW()
    WHERE reference_code = ${input.referenceCode}
  `;
}

export async function getPdfHash(referenceCode: string): Promise<string | null> {
  const rows = await sql`
    SELECT pdf_hash FROM scan_usage
    WHERE reference_code = ${referenceCode}
    LIMIT 1
  `;
  return (rows[0] as any)?.pdf_hash ?? null;
}

export async function saveScanFeedback(input: {
  referenceCode?: string | null;
  helpful: boolean;
  comment?: string | null;
  page?: string;
}): Promise<void> {
  await sql`
    INSERT INTO scan_feedback (reference_code, helpful, comment, page)
    VALUES (
      ${input.referenceCode ?? null},
      ${input.helpful},
      ${input.comment ?? null},
      ${input.page ?? "scan_results"}
    )
  `;
}
