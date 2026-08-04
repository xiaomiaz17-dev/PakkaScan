import { NextResponse } from "next/server";
import { z } from "zod";
import { runPhase2Analysis } from "@/intelligence/phase2-pipeline";
import type { DocumentType, Evidence, Jurisdiction } from "@/domain/models";

const evidenceSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  documentType: z.string().min(1),
  field: z.string().min(1),
  value: z.string(),
  normalizedValue: z.string().optional(),
  confidence: z.number().min(0).max(1),
  page: z.number().int().positive().optional(),
});

const requestSchema = z.object({
  jurisdiction: z.enum([
    "PAKISTAN_FEDERAL",
    "PUNJAB",
    "ISLAMABAD_CDA",
    "SINDH",
    "KHYBER_PAKHTUNKHWA",
    "FOREIGN",
    "UNKNOWN",
  ]),
  evidence: z.array(evidenceSchema).max(200),
  rawTextHint: z.string().max(20_000).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_ANALYSIS_REQUEST", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const evidence = parsed.data.evidence.map(
    (item) =>
      ({
        ...item,
        documentType: item.documentType as DocumentType,
      }) satisfies Evidence,
  );

  const out = runPhase2Analysis({
    evidence,
    jurisdiction: parsed.data.jurisdiction as Jurisdiction,
    rawTextHint: parsed.data.rawTextHint,
  });

  return NextResponse.json({
    classification: out.classification,
    observations: out.observations,
    result: out.analysis,
    explanations: out.explanations,
    posture: out.posture,
    missingEvidence: out.missingEvidence,
    tenancyJurisdiction: out.tenancyJurisdiction,
    propertyJurisdiction: out.propertyJurisdiction,
    assistant: {
      allowed: out.assistant.allowed,
      text: out.assistant.text,
      citations: out.assistant.citations,
      declinedReason: out.assistant.declinedReason,
    },
  });
}
