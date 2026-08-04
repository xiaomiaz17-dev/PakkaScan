import { NextResponse } from 'next/server';
import { redactSensitiveText } from '@/utils/redaction';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Example raw text containing potential PII that gets automatically redacted
    const rawSummary = "Comprehensive Legal Due Diligence: Document reviewed for seller CNIC 42101-1234567-1 and contact 03001234567. Stamp paper duty verified successfully.";
    const sanitizedSummary = redactSensitiveText(rawSummary);

    const responseText = JSON.stringify({
      status: "WARNING",
      summary: sanitizedSummary,
      riskScore: "Medium-High",
      validations: {
        cnicStatus: {
          isValid: false,
          message: "Seller CNIC format mismatch (Expected 13-digit standard pattern)."
        },
        stampPaperStatus: {
          isValid: true,
          message: "Stamp paper duty meets minimum provincial valuation thresholds."
        }
      },
      findings: [
        {
          category: "Bayana (Advance Payment)",
          severity: "High",
          detail: "The advance payment clause requests 25% upfront, which exceeds standard market practice of 10-15% in this jurisdiction.",
          evidence: "Section 3, Paragraph 2: '...buyer shall deposit 25% earnest money...'"
        },
        {
          category: "Title Verification",
          severity: "Medium",
          detail: "Mutation (Intikal) records referenced in the text do not explicitly name the current seller as the sole recorded owner.",
          evidence: "Section 1, Clause 4: '...property currently registered under previous title deed...'"
        }
      ],
      recommendations: [
        "Do not release bayana funds until Patwari verifies ownership records at the Tehsil office.",
        "Request correct 13-digit CNIC documentation from the seller before proceeding."
      ]
    }, null, 2);

    return NextResponse.json({
      success: true,
      analysis: responseText,
    });
  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}