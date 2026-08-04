import { NextResponse } from "next/server";
import { z } from "zod";
import { answerWithEvidence } from "@/intelligence/assistant-policy";

const schema = z.object({
  mode: z.enum(["explain_finding", "summarise_report", "next_steps"]),
  findingText: z.string().max(4000).optional(),
  reportSummary: z.string().max(8000).optional(),
  evidenceRefs: z.array(z.string().min(1)).max(50).optional(),
});

/**
 * Evidence-gated assistant — never invents ownership or legal conclusions.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_ASSISTANT_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }
  const result = answerWithEvidence(parsed.data);
  if (!result.allowed) {
    return NextResponse.json(
      { allowed: false, declinedReason: result.declinedReason },
      { status: 422 },
    );
  }
  return NextResponse.json(result);
}
