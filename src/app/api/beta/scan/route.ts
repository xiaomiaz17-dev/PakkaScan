export const maxDuration = 300;
/** Never return a high PakkaScore next to CRITICAL / DO_NOT_PROCEED. */
function clampPakkaScoreForRisk(
  score: number | null | undefined,
  riskLabel: string | null | undefined,
  verdict?: string | null
): number {
  let s = Number(score ?? 0);
  if (!Number.isFinite(s)) s = 0;
  const v = (verdict || "").toUpperCase();
  const hard =
    riskLabel === "CRITICAL" ||
    v === "DO_NOT_PROCEED" ||
    v === "STOP" ||
    v === "BLOCKED" ||
    v === "REJECT";
  if (hard) return Math.min(s, 35);
  if (riskLabel === "HIGH") return Math.min(s, 55);
  return s;
}

function filterMissingEvidenceAgainstSmartFields(
  missing: any,
  smartFields: any
): any {
  if (!missing) return missing;
  const parties = smartFields?.parties || {};
  const hasCnic = (() => {
    const ids = [
      parties.landlord?.cnic, parties.tenant?.cnic,
      parties.seller?.cnic, parties.buyer?.cnic,
      parties.principal?.cnic, parties.attorney?.cnic,
      parties.owner?.cnic,
    ];
    if (ids.some((x: any) => String(x || '').replace(/[^0-9]/g, '').length >= 13)) return true;
    try { return /\b\d{5}-\d{7}-\d\b/.test(JSON.stringify(smartFields || {})); } catch { return false; }
  })();
  const hasNames = !!(
    parties.landlord?.name ||
    parties.tenant?.name ||
    parties.seller?.name
  );
  const hasTerm = !!(
    smartFields?.dates?.start_date ||
    smartFields?.dates?.end_date ||
    smartFields?.dates?.duration_months
  );

  const drop = (item: any): boolean => {
    const text = String(
      typeof item === "string" ? item : item?.label || item?.code || item?.message || ""
    ).toLowerCase();
if (hasCnic && (text.includes("cnic") || text.includes("nicop") || text.includes("identity_document") || text.includes("identity document") || text.includes("seller and buyer"))) return true;
    if (hasNames && (text.includes("identity") || text.includes("party name") || text.includes("party names")))
      return true;
    if (hasTerm && (text.includes("term") || text.includes("duration"))) return true;
    return false;
  };

  if (Array.isArray(missing)) {
    return missing.filter((m) => !drop(m));
  }
  if (typeof missing === "object") {
    const out = { ...missing };
    if (Array.isArray(out.missing)) out.missing = out.missing.filter((m: any) => !drop(m));
    if (Array.isArray(out.items)) out.items = out.items.filter((m: any) => !drop(m));
    if (Array.isArray(out.fields)) out.fields = out.fields.filter((m: any) => !drop(m));
    return out;
  }
  return missing;
}

/** P1-D: detect sale semantics from doc types or financials */
function isSaleBundle(perDocument: any[], mergedSf: any): boolean {
  const typeHit = (perDocument || []).some((d: any) => {
    const t = String(d?.classification?.documentType || "").toUpperCase();
    return /AGREEMENT_TO_SELL|BAYANA|SALE_DEED|REGISTERED_SALE/.test(t);
  });
  if (typeHit) return true;
  const fin = mergedSf?.financials || {};
  const amt = (v: any) => {
    if (v == null) return false;
    if (typeof v === "number") return v > 0;
    if (typeof v === "object") return Number(v.amount || v.value || 0) > 0;
    return /\d{3,}/.test(String(v));
  };
  return !!(amt(fin.total_price) || amt(fin.token_amount) || amt(fin.sale_price) || amt(fin.consideration) || amt(fin.bayana) || amt(fin.token));
}

/** P1-D: drop pure tenancy missing items when pack is sale-oriented */
function filterTenancyOnlyMissing(missing: string[]): string[] {
  if (!missing?.length) return missing || [];
  const tenancyOnly = /monthly\s*rent|security\s*deposit|notice\s*period|landlord|tenant|kiraaya|kiraya|rent\s*amount|advance\s*rent|sub-?let/i;
  return missing.filter((m) => !tenancyOnly.test(String(m)));
}

import { NextResponse } from "next/server";
import { runOcr } from "@/intelligence/ocr-router";
import { classifyFromText } from "@/intelligence/document-classifier";
import { classifyDocument } from "@/ingestion/classifier";
import { analyseDocument } from "@/pipeline/analyse-document";
import { extractSmartFields } from "@/intelligence/llm-extractor";
import { buildEvidence } from "@/evidence/builder";
import { runPhase2Analysis } from "@/intelligence/phase2-pipeline";
import { generateNextSteps, fallbackNextSteps } from "@/intelligence/next-steps-advisor";
import { detectCompleteness } from "@/intelligence/completeness-detector";
import { analyzeCrossDocuments, computeCombinedVerdict, type CrossDocResult } from "@/intelligence/cross-doc-analyzer";
import { translateToUrdu, translateToUrduTimed } from "@/intelligence/urdu-translator";
import { checkRateLimit, recordScan, extractClientIp, getGlobalSpendState } from "@/utils/rate-limiter";
import type { Jurisdiction, DocumentType } from "@/domain/models";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/session";
import { getUnusedEntitlements, consumeEntitlement, recordScanUsage, updateScanSnapshot } from "@/commercial/billing/entitlement-store";
import { sendScanReportEmail } from "@/lib/email";
import type { ReportType } from "@/commercial/billing/reports";
import { computeRiskFactors, mergeRiskFactors } from "@/intelligence/risk-scorer";
import { detectCnicTranspositions, cnicTranspositionsToRiskFactors } from "@/intelligence/cnic-validator";
import { backfillTenancySmartFields } from "@/intelligence/tenancy-completeness";
import { getOfficialValuation, getDeclaredPrice } from "@/intelligence/dc-rate-lookup";
import { extractClauseConcerns, clauseConcernsToRiskFactors, filterMissingAgainstText } from "@/intelligence/clause-concerns";
import { detectSuspiciousClauses, suspiciousClausesToRiskFactors } from "@/intelligence/suspicious-clauses";
import { applyTenancyBackfill } from "@/intelligence/tenancy-backfill";
import { sanitizeRentalNextSteps } from "@/intelligence/sanitize-next-steps";
import { buildOwnershipTimeline, chainFindingsToRiskFactors } from "@/intelligence/chain-of-title";
import { validateTemporalRules, temporalViolationsToRiskFactors } from "@/intelligence/temporal-validator";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
  "text/plain",
]);

/**
 * Verdict severity ranking - lower number = more severe.
 * Used to pick the more severe verdict between per-doc and combined
 * so users always see the strongest warning.
 */
const VERDICT_SEVERITY: Record<string, number> = {
  DO_NOT_PROCEED: 1,
  STOP: 1,
  BLOCKED: 1,
  REJECT: 1,
  LEGAL_REVIEW_REQUIRED: 2,
  PROCEED_WITH_CAUTION: 3,
  PROCEED: 4,
  INCONCLUSIVE: 5,
};

/**
 * Pick the more severe verdict between two candidates.
 * If one is null/undefined, returns the other. If both, returns
 * whichever has the lower severity number (more severe).
 * Unknown verdicts default to severity 5 (least severe).
 */
function pickMoreSevereVerdict(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  const sevA = VERDICT_SEVERITY[a] ?? 5;
  const sevB = VERDICT_SEVERITY[b] ?? 5;
  return sevA <= sevB ? a : b;
}

/**
 * Choose the best classification by combining both classifiers.
 * See Path A launch notes for rationale.
 */
function bestClassification(text: string) {
  const [ingestionCandidate] = classifyDocument(text);
  const intelligenceCandidate = classifyFromText(text);

  const criticalTypes = new Set(["TENANCY_AGREEMENT", "AGREEMENT_TO_SELL"]);

  if (criticalTypes.has(ingestionCandidate.documentType) && ingestionCandidate.confidence >= 0.2) {
    return {
      documentType: ingestionCandidate.documentType,
      jurisdiction: ingestionCandidate.jurisdiction as Jurisdiction,
      confidence: ingestionCandidate.confidence,
      reasons: ingestionCandidate.reasons,
    };
  }
  if (criticalTypes.has(intelligenceCandidate.documentType) && intelligenceCandidate.confidence >= 0.7) {
    return {
      documentType: intelligenceCandidate.documentType,
      jurisdiction: "UNKNOWN" as Jurisdiction,
      confidence: intelligenceCandidate.confidence,
      reasons: intelligenceCandidate.matchedCues,
    };
  }
  if (ingestionCandidate.confidence >= intelligenceCandidate.confidence) {
    return {
      documentType: ingestionCandidate.documentType,
      jurisdiction: ingestionCandidate.jurisdiction as Jurisdiction,
      confidence: ingestionCandidate.confidence,
      reasons: ingestionCandidate.reasons,
    };
  }
  return {
    documentType: intelligenceCandidate.documentType,
    jurisdiction: "UNKNOWN" as Jurisdiction,
    confidence: intelligenceCandidate.confidence,
    reasons: intelligenceCandidate.matchedCues,
  };
}

/**
 * Extract missing evidence strings from the phase2 output.
 * Handles both string arrays and object arrays with {label, message, description}.
 */
function stringifyMissing(missing: any): string[] {
  if (!missing) return [];
  if (Array.isArray(missing)) {
    return missing.map((m: any) => {
      if (typeof m === "string") return m;
      return m.label || m.message || m.description || m.field || m.documentType || m.type || m.code || JSON.stringify(m);
    });
  }
  if (missing.missing && Array.isArray(missing.missing)) {
    return stringifyMissing(missing.missing);
  }
  return [];
}

/**
 * Extract finding strings from phase2 output.
 */
function stringifyFindings(findings: any): string[] {
  if (!Array.isArray(findings)) return [];
  return findings.map((f: any) => {
    if (typeof f === "string") return f;
    return f.message || f.description || f.label || f.code || JSON.stringify(f);
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tier-based response filtering.
// Rental: minimal report - no cross-doc, no combined verdict, next steps capped at 3
// Bayana: adds cross-doc + combined verdict, next steps capped at 5
// Full DD: everything, no caps
// Assistant Q&A is removed for ALL tiers - users are directed to WhatsApp support.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function filterResponseByTier(payload: any, tier: string): any {
  const filtered = { ...payload };

  // Cap next steps by tier
  if (filtered.phase2?.nextSteps && Array.isArray(filtered.phase2.nextSteps)) {
    const maxSteps = tier === "rental" ? 3 : tier === "bayana" ? 5 : 10;
    filtered.phase2 = {
      ...filtered.phase2,
      nextSteps: filtered.phase2.nextSteps.slice(0, maxSteps),
    };
  }

  // Rental multi-file: keep crossDoc / combinedVerdict when computed.


  // Only Full DD gets the deep-dive explanations (category scores, timeline, evidence appendix)
  if (tier !== "full_dd" && filtered.phase2) {
    filtered.phase2 = {
      ...filtered.phase2,
      explanations: null,
    };
  }

  // Assistant Q&A removed for ALL tiers - direct users to WhatsApp
  if (filtered.phase2) {
    delete filtered.phase2.assistant;
  }

  return filtered;
}

function collectDocText(d: any): string {
  const o = d?.ocr || {};
  return [o.text, o.rawText, d?.ocrText, d?.text, d?.rawText, d?.extractedText]
    .map((x) => String(x || "").trim())
    .filter((s) => s.length > 0)
    .join("\n");
}
function collectAllText(docs: any[]): string {
  return (docs || []).map(collectDocText).filter(Boolean).join("\n\n");
}

function filterNextStepsAgainstFields(steps: any[], fields: any): any[] {
  const f = fields || {};
  const rent = f.financials?.monthlyRentPkr || f.financials?.rentPkr;
  const dep = f.financials?.securityDepositPkr || f.financials?.depositPkr;
  const addr = f.property?.address || f.property?.location;
  return (steps || []).filter((s) => {
    const t = `${s?.title || ""} `.toLowerCase();
    if (rent && /rent|کرایہ/.test(t) && /missing|add |clarif/.test(t)) return false;
    if (dep && /deposit|سیکیورٹی/.test(t) && /missing|add |clarif/.test(t)) return false;
    if (addr && /address|پتہ/.test(t) && /missing|add |include/.test(t)) return false;
    return true;
  });
}

export async function POST(request: Request) {
  const _t_scan_total = Date.now();

  try {
    // --- Authentication + Entitlement Gate ---
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "NOT_SIGNED_IN", message: "Please sign in to use PakkaScan." },
        { status: 401 }
      );
    }

    const unused = await getUnusedEntitlements(session.userId);
    if (unused.length === 0) {
      console.log(`[beta/scan] No entitlement for user=${session.userId}, returning 402`);
      return NextResponse.json(
        {
          error: "NO_ENTITLEMENT",
          message: "You need to purchase a scan credit before analysing documents.",
          redirectTo: "/#pricing",
        },
        { status: 402 }
      );
    }

    // Pick cheapest entitlement first (rental < bayana < full_dd)
    const priceOrder: Record<ReportType, number> = { rental: 1, bayana: 2, full_dd: 3 };
    let entitlementToUse = unused.sort(
      (a, b) => (priceOrder[a.report_type] ?? 99) - (priceOrder[b.report_type] ?? 99)
    )[0];
    console.log(`[beta/scan] Using entitlement id=${entitlementToUse.id} type=${entitlementToUse.report_type} source=${entitlementToUse.source}`);

    // --- Per-tier file count limits ---
    // Rental ($4.99): 2 files (Tenancy + CNIC)
    // Bayana ($9.99): 3 files (Bayana + Fard + CNIC)
    // Full DD ($19.99): 5 files (Sale Deed + Fard + Mutation + CNIC + NEC)
    const tierFileLimits: Record<ReportType, number> = {
      rental: 4,
      bayana: 5,
      full_dd: 5,
    };
    const maxFilesForTier = tierFileLimits[entitlementToUse.report_type] ?? 1;

    // We need to check the file count AFTER parsing formData, so we defer this check.
    // Store the limit for use after formData parsing.
    let _tierFileLimit = maxFilesForTier;
    let _tierName = entitlementToUse.report_type;

    // Rate limit check - runs before any work
    const clientIp = extractClientIp(request);
    const limitCheck = checkRateLimit(clientIp);
    if (!limitCheck.allowed) {
      const statusCode = limitCheck.reason === "global_daily_cap" ? 503 : 429;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (limitCheck.retryAfterSeconds) {
        headers["Retry-After"] = String(limitCheck.retryAfterSeconds);
      }
      console.log("[beta/scan] Rate limited: " + limitCheck.reason + " (ip=" + clientIp + ")");
      return new Response(
        JSON.stringify({
          error: limitCheck.reason.toUpperCase(),
          message: limitCheck.message,
          retryAfterSeconds: limitCheck.retryAfterSeconds,
        }),
        { status: statusCode, headers }
      );
    }

    // Log current global spend state periodically for visibility
    const spendState = getGlobalSpendState();
    if (spendState.scanCount > 0 && spendState.scanCount % 10 === 0) {
      console.log("[beta/scan] Global spend today: " + spendState.scanCount + " scan(s), ~GBP " + spendState.estimatedSpendGbp + " / GBP " + spendState.capGbp);
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const rawHints = formData.getAll("documentTypeHints");
    const documentTypeHints: string[] = rawHints.map((h) => (typeof h === "string" ? h : ""));

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "NO_DOCUMENTS" }, { status: 400 });
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: "UNSUPPORTED_CONTENT_TYPE", details: file.type }, { status: 400 });
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "UPLOAD_TOO_LARGE" }, { status: 413 });
      }
    }

    // One credit per analysis session. Prefer explicit preferredTier from client if user owns it.
    {
      const nFiles = files.length;
      const preferredRaw = String(formData.get("preferredTier") || formData.get("reportType") || "").trim().toLowerCase();
      const preferred = (["rental", "bayana", "full_dd"].includes(preferredRaw) ? preferredRaw : "") as ReportType | "";
      let eligible = unused.filter((e) => (tierFileLimits[e.report_type] ?? 1) >= nFiles);
      if (eligible.length === 0) {
        const bestCap = Math.max(...unused.map((e) => tierFileLimits[e.report_type] ?? 1));
        return NextResponse.json({
          error: "TOO_MANY_FILES",
          message: `You uploaded ${nFiles} file(s). Each credit covers one analysis of up to ${bestCap} file(s). Remove files or buy a higher tier.`,
          tierLimit: bestCap,
          uploaded: nFiles,
        }, { status: 400 });
      }
      if (preferred) {
        const match = eligible.filter((e) => e.report_type === preferred);
        if (match.length) eligible = match;
      }
      eligible.sort((a, b) => (priceOrder[a.report_type] ?? 99) - (priceOrder[b.report_type] ?? 99));
      entitlementToUse = eligible[0];
      _tierFileLimit = tierFileLimits[entitlementToUse.report_type] ?? 1;
      _tierName = entitlementToUse.report_type;
      console.log(`[beta/scan] Session credit id=${entitlementToUse.id} type=${entitlementToUse.report_type} files=${nFiles} preferred=${preferred || "auto"}`);
    }

    // Enforce tier file count limit
    if (files.length > _tierFileLimit) {
      console.log(`[beta/scan] Too many files: ${files.length} uploaded, tier=${_tierName} allows max ${_tierFileLimit}`);
      return NextResponse.json(
        {
          error: "TOO_MANY_FILES",
          message: `Your ${_tierName === "rental" ? "Rental Safety Check" : _tierName === "bayana" ? "Bayana Safety Check" : "Full Property Due Diligence"} credit allows up to ${_tierFileLimit} file${_tierFileLimit === 1 ? "" : "s"}. You uploaded ${files.length}. Please remove ${files.length - _tierFileLimit} file${files.length - _tierFileLimit === 1 ? "" : "s"} or upgrade your credit.`,
          tierLimit: _tierFileLimit,
          uploaded: files.length,
        },
        { status: 400 }
      );
    }

    console.log(`[beta/scan] Received ${files.length} file(s)`);

    const perDocument: any[] = await Promise.all(
      files.map(async (file, fileIndex) => {
        const documentId = randomUUID();
        const buf = Buffer.from(await file.arrayBuffer());

        console.log(`[beta/scan] OCR starting: ${file.name} (${file.type}, ${file.size} bytes)`);

        const _t_ocr = Date.now();
        const ocr = await runOcr([{ buf, mimeType: file.type }]);
        console.log(`[timing] OCR (${file.name}): ${Date.now() - _t_ocr}ms`);

        console.log(
          `[beta/scan] OCR complete: engine=${ocr.engineUsed}, ` +
          `confidence=${ocr.confidence.toFixed(1)}%, language=${ocr.language}, ` +
          `pages=${ocr.pageCount}, chars=${ocr.text.length}`
        );

        if (!ocr.text || ocr.text.trim().length < 20) {
          return {
            documentId,
            fileName: file.name,
            status: "ocr_failed",
            ocr,
            error: "LIVE_OCR_REQUIRED",
          };
        }

        // If user pre-tagged this file with a document type, use it directly.
        // Otherwise fall back to auto-classification.
        const userHint = documentTypeHints[fileIndex] || "";
        let classification;
        if (userHint) {
          classification = {
            documentType: userHint as DocumentType,
            jurisdiction: "UNKNOWN" as Jurisdiction,
            confidence: 1.0,
            reasons: ["User-provided document type"],
          };
        } else {
          classification = bestClassification(ocr.text);
        }
        console.log(
          `[beta/scan] Classified: ${classification.documentType} ` +
          `(${(classification.confidence * 100).toFixed(0)}%) - ${classification.jurisdiction}`
        );

        const _t_analyse = Date.now();
        const analysed = analyseDocument({
          documentId,
          text: ocr.text,
          jurisdictionHint: classification.jurisdiction,
          documentTypeHint: classification.documentType,
        });
        console.log(`[timing] AnalyseDocument (${file.name}): ${Date.now() - _t_analyse}ms`);

        console.log(
          `[beta/scan] Extracted ${analysed.extracted.fields.length} field(s), ` +
          `${analysed.evidence.length} evidence, ${analysed.observations.length} observation(s)`
        );

        const _t_smart = Date.now();
        const smartFields = backfillTenancySmartFields(
          await extractSmartFields(classification.documentType, ocr.text),
          ocr.text || ""
        );
        console.log(`[timing] SmartFields LLM (${file.name}): ${Date.now() - _t_smart}ms`);

        // Detect if this is a complete/partial/template document
        const completeness = detectCompleteness(classification.documentType, smartFields);
        console.log(
          `[beta/scan] Completeness: ${completeness.status} (` +
          `${completeness.criticalFieldsPresent}/${completeness.criticalFieldsTotal} critical fields)`
        );

        return {
          documentId,
          fileName: file.name,
          status: "ok",
          smartFields,
          completeness,
          ocr: {
            engineUsed: ocr.engineUsed,
            confidence: ocr.confidence,
            language: ocr.language,
            pageCount: ocr.pageCount,
            charCount: ocr.text.length,
          },
          classification: {
            documentType: classification.documentType,
            jurisdiction: classification.jurisdiction,
            confidence: classification.confidence,
            reasons: classification.reasons,
          },
          extracted: {
            schemaVersion: analysed.extracted.schemaVersion,
            fields: analysed.extracted.fields,
            warnings: analysed.extracted.warnings,
          },
          observations: analysed.observations,
        };
      })
    );

    const combinedEvidence = perDocument
      .filter((d) => d.status === "ok")
      .flatMap((d) =>
        buildEvidenceFromExtracted(d.documentId, d.extracted!.fields, d.classification!.documentType)
      );

    const firstJurisdiction =
      (perDocument.find((d) => d.status === "ok")?.classification?.jurisdiction as Jurisdiction) ||
      ("UNKNOWN" as Jurisdiction);

    let phase2: ReturnType<typeof runPhase2Analysis> | null = null;
    let nextSteps: any[] = [];
    let crossDoc: CrossDocResult | null = null;
    let combinedVerdict: { verdict: string; posture: string; reasoning: string } | null = null;

    if (combinedEvidence.length > 0) {
      const _t_phase2 = Date.now();
      phase2 = runPhase2Analysis({
        evidence: combinedEvidence,
        jurisdiction: firstJurisdiction,
        rawTextHint: perDocument.find((d) => d.status === "ok")?.ocr && "text_present",
      });
      console.log(`[timing] Phase2Analysis: ${Date.now() - _t_phase2}ms`);
      console.log(
        `[beta/scan] Phase 2: verdict=${phase2.analysis.decision}, ` +
        `posture=${phase2.posture}, findings=${phase2.analysis.findings.length}, ` +
        `missing=${phase2.missingEvidence?.missing?.length ?? 0}`
      );

      const firstOk = perDocument.find((d) => d.status === "ok");
      const missingStrings = stringifyMissing(phase2.missingEvidence);
      const findingsStrings = stringifyFindings(phase2.analysis.findings);
      const successfulDocs = perDocument.filter(
        (d) => d.status === "ok" && d.smartFields && !d.smartFields.extractionError
      );

      // P1-B: run NextSteps + CrossDoc in parallel
      const nextStepsPromise = (async (): Promise<any[]> => {
        if (firstOk && firstOk.smartFields && !firstOk.smartFields.extractionError) {
          try {
            const _t_next = Date.now();
            const advisorResult = await generateNextSteps({
              documentType: firstOk.classification.documentType,
              verdict: phase2!.analysis.decision,
              pakkaScore: phase2!.analysis.pakkaScore ?? 0,
              extractedFacts: firstOk.smartFields,
              missingEvidence: missingStrings,
              findings: findingsStrings,
            });
            console.log(`[timing] NextSteps LLM: ${Date.now() - _t_next}ms`);
            if (advisorResult.steps.length > 0) {
              console.log(`[beta/scan] Next-steps: ${advisorResult.steps.length} step(s) via ${advisorResult.model}`);
              return advisorResult.steps;
            }
            console.warn(`[beta/scan] Next-steps advisor returned no steps: ${advisorResult.error}. Using fallback.`);
            return fallbackNextSteps(missingStrings, findingsStrings);
          } catch (err: any) {
            console.warn(`[beta/scan] Next-steps advisor threw:`, err?.message || err);
            return fallbackNextSteps(missingStrings, findingsStrings);
          }
        }
        return [];
      })();

      const crossDocPromise = (async (): Promise<CrossDocResult | null> => {
        if (successfulDocs.length < 2) return null;
        try {
          const _t_cross = Date.now();
          const result = await analyzeCrossDocuments(
            successfulDocs.map((d) => ({
              fileName: d.fileName,
              documentType: d.classification?.documentType || "UNKNOWN",
              smartFields: d.smartFields,
            }))
          );
          console.log(`[timing] CrossDoc LLM: ${Date.now() - _t_cross}ms`);
          console.log(
            `[beta/scan] Cross-doc: ${result.crossChecks.length} check(s), ` +
            `critical mismatch: ${result.hasCriticalMismatch}`
          );
          return result;
        } catch (err: any) {
          console.warn("[beta/scan] Cross-doc analysis threw:", err?.message || err);
          return {
            crossChecks: [],
            overallAssessment: "Cross-document analysis could not complete.",
            hasCriticalMismatch: false,
            error: err?.message || "unknown error",
          };
        }
      })();

      const [nsResult, cdResult] = await Promise.all([nextStepsPromise, crossDocPromise]);
      nextSteps = nsResult;
      crossDoc = cdResult;

      // Post-process cross-doc (same logic as before)
      if (crossDoc && successfulDocs.length >= 2) {
        const perDocVerdicts: string[] = [];
        if (phase2?.analysis?.decision) perDocVerdicts.push(phase2.analysis.decision);
        for (const d of successfulDocs) {
          if (d.completeness?.status === "template") perDocVerdicts.push("PROCEED_WITH_CAUTION");
        }
        const _types = successfulDocs.map((d: any) => String(d.classification?.documentType || "").toUpperCase());
        const _sameTenancyBundle =
          _types.length >= 2 &&
          _types.every(
            (t: string) =>
              !t || t === "UNKNOWN" || t.includes("TENANCY") || t.includes("RENTAL") || t.includes("LEASE")
          );
        if (_sameTenancyBundle && crossDoc.hasCriticalMismatch) {
          const realClash = (crossDoc.crossChecks || []).some(
            (c: any) =>
              String(c.status).toLowerCase() === "mismatch" &&
              String(c.severity).toLowerCase() === "critical"
          );
          if (!realClash) {
            crossDoc.hasCriticalMismatch = false;
            console.log("[beta/scan] Cross-doc: ignored critical flag on same-tenancy page bundle");
          }
        }
        if (crossDoc?.crossChecks?.length) {
          crossDoc.crossChecks = crossDoc.crossChecks.filter((c: any) => {
            const cat = String(c.category || "").toLowerCase();
            const detail = String(c.detail || c.finding || c.message || "").toLowerCase();
            if (cat === "date" || detail.includes("fard")) {
              if (detail.includes("future") && detail.includes("precedes")) return false;
              if (detail.includes("future") && detail.includes("typical document")) return false;
            }
            return true;
          });
          crossDoc.hasCriticalMismatch = crossDoc.crossChecks.some(
            (c: any) =>
              String(c.status).toLowerCase() === "mismatch" &&
              String(c.severity).toLowerCase() === "critical"
          );
        }
        // P1-date-future-false-positive: drop "future" date mismatches when date is not after today (PK)
        if (crossDoc?.crossChecks?.length) {
          const todayPk = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
          crossDoc.crossChecks = crossDoc.crossChecks.filter((c: any) => {
            const cat = String(c.category || "").toLowerCase();
            const detail = String((c as any).detail || c.finding || (c as any).message || "").toLowerCase();
            if (cat !== "date" && !detail.includes("future")) return true;
            if (!/future|falls in the future|relative to the current/i.test(detail)) return true;
            const iso = detail.match(/\d{4}-\d{2}-\d{2}/g) || [];
            // If all extracted dates are <= today PK, not a real future anomaly
            if (iso.length && iso.every((d: string) => d <= todayPk)) return false;
            return true;
          });
          crossDoc.hasCriticalMismatch = crossDoc.crossChecks.some(
            (c: any) =>
              String(c.status).toLowerCase() === "mismatch" &&
              String(c.severity).toLowerCase() === "critical"
          );
        }
        combinedVerdict = computeCombinedVerdict(perDocVerdicts, crossDoc.hasCriticalMismatch);
        console.log(
          `[beta/scan] Combined verdict: ${combinedVerdict.verdict} - ${combinedVerdict.reasoning}`
        );
      }
    }

    // Level 1 Urdu translation.
    // Collect all user-facing English strings and translate them in ONE batched LLM call.
    const translationInputs: Record<string, string> = {};

    if (phase2?.analysis?.decision) {
      const verdictHeadline = (() => {
        const v = phase2.analysis.decision as string;
        const p = phase2.posture as string;
        if (v === "PROCEED" || p === "CLEAR") return "This document looks safe to move forward with.";
        if (
          v === "DO_NOT_PROCEED" ||
          v === "STOP" ||
          v === "BLOCKED" ||
          v === "REJECT" ||
          p === "STOP" ||
          p === "BLOCKED"
        )
          return "Serious issues found. Do not release money or sign.";
        return "Some evidence is missing. See What To Do Next.";
      })();
      translationInputs["verdictHeadline"] = verdictHeadline;
    }

    if (combinedVerdict?.reasoning) {
      translationInputs["combinedReasoning"] = combinedVerdict.reasoning;
    }

    if (crossDoc?.overallAssessment) {
      translationInputs["crossDocAssessment"] = crossDoc.overallAssessment;
    }

    perDocument.forEach((d, i) => {
      if (d.status === "ok" && d.smartFields?.summary) {
        translationInputs["docSummary_" + i] = d.smartFields.summary;
      }
    });

    nextSteps.forEach((step: any, i: number) => {
      if (step?.title) translationInputs["nextStepTitle_" + i] = step.title;
      if (step?.detail) translationInputs["nextStepDetail_" + i] = step.detail;
    });

    let urduTranslations: Record<string, string> = {};
    let urduByNextStepTitle: Record<string, { title?: string; detail?: string }> = {};
    if (Object.keys(translationInputs).length > 0) {
      try {
        const _t_urdu = Date.now();
        urduTranslations = await translateToUrduTimed(translationInputs, 12000);
        console.log(`[timing] UrduTranslation LLM: ${Date.now() - _t_urdu}ms`);
        console.log(
          `[beta/scan] Urdu: translated ${Object.keys(urduTranslations).length}/${Object.keys(translationInputs).length} string(s)`
        );
        urduByNextStepTitle = {};
        (nextSteps || []).forEach((step: any, i: number) => {
          const tt = String(step?.title || "").trim();
          if (!tt) return;
          urduByNextStepTitle[tt] = {
            title: urduTranslations["nextStepTitle_" + i],
            detail: urduTranslations["nextStepDetail_" + i],
          };
        });
      } catch (err: any) {
        console.warn("[beta/scan] Urdu translation threw:", err?.message || err);
      }
    }


    // Record scan for rate limit tracking (regardless of outcome)
    recordScan(clientIp);

    // Consume the entitlement (one per scan session, not per file)
    let scanReferenceCode: string | null = null;
    try {
      await consumeEntitlement(entitlementToUse.id);
      scanReferenceCode = await recordScanUsage({
        userId: session.userId,
        entitlementId: entitlementToUse.id,
        reportType: entitlementToUse.report_type,
      });
      console.log(`[beta/scan] Entitlement consumed: id=${entitlementToUse.id} ref=${scanReferenceCode}`);

      const emailRiskResult = computeRiskFactors({
        pakkaScore: phase2?.analysis?.pakkaScore ?? 0,
        findings: stringifyFindings(phase2?.analysis?.findings),
        missing: stringifyMissing(phase2?.missingEvidence),
        smartFields: perDocument.find((d: any) => d.status === "ok" && d.smartFields && !d.smartFields.extractionError)?.smartFields ?? null,
        rawText: (perDocument || []).map((d: any) => d?.ocr?.text || d?.ocrText || d?.text || "").filter(Boolean).join("\n"),
      });

      // Send scan report email - awaited but never fails the scan response
      if (scanReferenceCode && session?.email) {
        const _verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.pakkascan.com"}/verify/${scanReferenceCode}`;
        const _verdict   = pickMoreSevereVerdict(phase2?.analysis?.decision, combinedVerdict?.verdict);
        const _score     = phase2?.analysis?.pakkaScore ?? null;
        const _steps     = (nextSteps ?? []) as Array<{ title: string; detail?: string }>;
                try {
          const emailResult = await sendScanReportEmail({
            to:            session.email,
            referenceCode: scanReferenceCode,
            reportType:    entitlementToUse.report_type,
            verdict:       _verdict,
            pakkaScore:    _score,
            nextSteps:     _steps,
            verifyUrl:     _verifyUrl,
            riskScore:     emailRiskResult.riskScore,
            riskFactors:   emailRiskResult.riskFactors,
          });
          if (!emailResult.ok) console.warn("[beta/scan] scan report email failed:", emailResult.error);
        } catch (err: any) {
          console.warn("[beta/scan] scan report email threw:", err?.message || err);
        }
      }
    } catch (err: any) {
      console.error(`[beta/scan] Failed to consume entitlement: ${err?.message || err}`);
      // Don't fail the scan - user already got their report
    }

    console.log(`[timing] SCAN_TOTAL: ${Date.now() - _t_scan_total}ms`);

    // --- Risk Score computation (Session 4) ---
    // --- Chain of Title (Sessions 3-5) ---
    let chainOfTitle: ReturnType<typeof buildOwnershipTimeline> | null = null;
    let chainFindings: string[] = [];
    try {
      const chainDocs = perDocument
        .filter((d: any) => d.status === "ok" && d.smartFields && !d.smartFields.extractionError)
        .map((d: any) => ({
          documentId: d.documentId,
          documentType: d.classification?.documentType || "UNKNOWN",
          fileName: d.fileName,
          smartFields: d.smartFields,
        }));
      if (chainDocs.length > 0) {
        chainOfTitle = buildOwnershipTimeline(chainDocs);
        const temporal = validateTemporalRules(chainOfTitle.timeline, chainDocs);
        chainFindings = [
          ...chainOfTitle.findings,
          ...temporal.map((v) => v.message),
        ];
        (chainOfTitle as any).temporalViolations = temporal;
        console.log(`[beta/scan] Chain of Title: events=${chainOfTitle.timeline.length}, gaps=${chainOfTitle.gaps.length}, conflicts=${chainOfTitle.conflicts.length}, entities=${chainOfTitle.entities.length}, temporal=${temporal.length}`);
      }
    } catch (err: any) {
      console.warn("[beta/scan] chain of title failed:", err?.message || err);
    }

    const _findingsStr = [
      ...stringifyFindings(phase2?.analysis?.findings),
      ...chainFindings,
    ];
    const _missingStr  = stringifyMissing(phase2?.missingEvidence);
    const _firstSmartFields = perDocument.find((d: any) => d.status === "ok" && d.smartFields && !d.smartFields.extractionError)?.smartFields ?? null;
    const _mergedSmartFields = (() => {
      const packs = (perDocument || [])
        .filter((d: any) => d.status === "ok" && d.smartFields && !d.smartFields.extractionError)
        .map((d: any) => d.smartFields);
      if (!packs.length) return _firstSmartFields;
      const base: any = { ...(_firstSmartFields || {}), ...packs[packs.length - 1] };
      base.financials = {};
      base.parties = {};
      base.dates = {};
      base.property = {};
      for (const p of packs) {
        base.financials = { ...base.financials, ...(p.financials || {}) };
        base.parties = { ...base.parties, ...(p.parties || {}) };
        base.dates = { ...base.dates, ...(p.dates || {}) };
        base.property = { ...base.property, ...(p.property || {}) };
      }
      const amt = (v: any) => (typeof v === "number" ? v : Number(v?.amount || v?.value || 0));
      for (const p of packs) {
        const f = p.financials || {};
        if (amt(f.monthly_rent) && amt(f.monthly_rent) >= amt(base.financials.monthly_rent)) {
          base.financials.monthly_rent = f.monthly_rent;
        }
        if (amt(f.security_deposit) && amt(f.security_deposit) >= amt(base.financials.security_deposit)) {
          base.financials.security_deposit = f.security_deposit;
        }
        if (amt(f.rent) && !base.financials.monthly_rent) base.financials.monthly_rent = f.rent;
      }
      return base;
    })();
    console.log(
      "[beta/scan] smartFields merge financials=",
      Object.keys(_mergedSmartFields?.financials || {}),
      "rent=",
      _mergedSmartFields?.financials?.monthly_rent || _mergedSmartFields?.financials?.rent || null
    );
    // Session 7: DC rate / official valuation lookup (silent if no match)
    let valuationComparison: any = null;
    let officialValuationPkr: number | null = null;
    let declaredPricePkr: number | null = null;
    try {
      declaredPricePkr = getDeclaredPrice(_mergedSmartFields || _firstSmartFields);
      const valuation = await getOfficialValuation(_mergedSmartFields || _firstSmartFields);
      if (valuation.matched) {
        officialValuationPkr = valuation.officialValuePkr;
        valuationComparison = {
          declaredPricePkr,
          officialValuePkr: valuation.officialValuePkr,
          ratio: declaredPricePkr && valuation.officialValuePkr
            ? declaredPricePkr / valuation.officialValuePkr
            : null,
          match: valuation.match,
          confidence: valuation.confidence,
          areaUsed: valuation.areaUsed,
          ratePkr: valuation.ratePkr,
          rateUnit: valuation.rateUnit,
        };
        console.log(
          `[beta/scan] DC valuation: official=${valuation.officialValuePkr} declared=${declaredPricePkr} ratio=${valuationComparison.ratio} match=${valuation.matchReason}`
        );
      } else {
        console.log(`[beta/scan] DC valuation: no match (${valuation.reason})`);
      }
    } catch (err: any) {
      console.warn("[beta/scan] DC valuation lookup failed:", err?.message || err);
    }

    applyTenancyBackfill(_mergedSmartFields, collectAllText(perDocument));
    const ocrBlobForRisk = collectAllText(perDocument || []);
    console.log("[beta/scan] ocrBlob len=" + ocrBlobForRisk.length + " stampFlag=" + !!(_mergedSmartFields && (_mergedSmartFields as any)._stampEvidence) + " attested=" + /attested|oath|wasil|hundred\s+rupees|rs\.?\s*100|central\s*park/i.test(ocrBlobForRisk));
    let riskResult = computeRiskFactors({
      pakkaScore: phase2?.analysis?.pakkaScore ?? 0,
      findings: _findingsStr,
      missing: _missingStr,
      smartFields: _mergedSmartFields,
      rawText: ocrBlobForRisk,
      officialValuationPkr,
      declaredPricePkr,
    });

        {
      const failed = (perDocument || []).filter(function(d) {
        return d && (d.status !== "ok" || (d.smartFields && d.smartFields.extractionError) || d.error);
      });
      if (failed.length > 0) {
        riskResult = mergeRiskFactors(riskResult, failed.map(function(d) {
          var name = String((d && (d.fileName || d.name)) || "file").slice(0, 60);
          var reason = String((d && d.smartFields && d.smartFields.extractionError) || (d && d.error) || (d && d.status) || "unreadable").slice(0, 80);
          return { label: "Document read failure: " + name + " - " + reason, points: -3, category: "document" };
        }));
      }
    }
    // Strongly weight chain-of-title + temporal findings into the risk score
    if (chainOfTitle) {
      const chainFactors = chainFindingsToRiskFactors(chainOfTitle);
      const temporalFactors = temporalViolationsToRiskFactors(
        (chainOfTitle as any).temporalViolations || []
      );
      riskResult = mergeRiskFactors(riskResult, [...chainFactors, ...temporalFactors]);
    }
    // Cross-doc CRITICAL mismatches always affect risk (not only when chainOfTitle exists)
    if (crossDoc?.crossChecks?.length) {
      const xdFactors = crossDoc.crossChecks
        .filter((c: any) => {
          const st = String(c.status || "").toLowerCase();
          const sev = String(c.severity || "").toLowerCase();
          return st === "mismatch" && (sev === "critical" || sev === "high");
        })
        .map((c: any) => {
          const cat = String(c.category || "property").toLowerCase();
          const detail = String(c.detail || c.finding || c.message || "");
          const lower = (cat + " " + detail).toLowerCase();
          // Date / stamp chronology is severe in PK title practice
          let pts = -3;
          if (/date|stamp|chronolog|backdat|execut/.test(lower)) pts = -4;
          return {
            label: ("Critical mismatch (" + String(c.category || "property") + "): " + detail.slice(0, 220)),
            points: pts,
            category: "legal" as const,
          };
        });
      if (xdFactors.length) {
        riskResult = mergeRiskFactors(riskResult, xdFactors);
        console.log("[beta/scan] cross-doc risk factors applied:", xdFactors.length);
      }
    }

    console.log(`[beta/scan] Risk: score=${riskResult.riskScore}/10 (${riskResult.riskLabel}), factors=${riskResult.riskFactors.length}, breakdown=${riskResult.scoreBreakdown}`);
    // ALIGN: clamp phase2 pakkaScore for API + UI consistency
    const _alignVerdict =
      combinedVerdict?.verdict ||
      phase2?.analysis?.decision ||
      "";
    const _rawPakka = phase2?.analysis?.pakkaScore ?? 0;
    const alignedPakkaScore = clampPakkaScoreForRisk(
      _rawPakka,
      riskResult.riskLabel,
      _alignVerdict
    );
    if (phase2?.analysis) (phase2.analysis as any).pakkaScore = alignedPakkaScore;
    // ALIGN: drop missingEvidence that contradicts smartFields
    const _sfAlign =
      _firstSmartFields ||
      perDocument?.find((d: any) => d.status === "ok" && d.smartFields)?.smartFields;
    if (phase2?.missingEvidence) {
      const allSf = (perDocument || [])
        .filter((d: any) => d?.status === "ok" && d.smartFields)
        .map((d: any) => d.smartFields);
      const pack = allSf.length
        ? { parties: Object.assign({}, ...allSf.map((s: any) => s.parties || {})), _docs: allSf }
        : (_mergedSmartFields || _sfAlign);
      phase2.missingEvidence = filterMissingEvidenceAgainstSmartFields(
        phase2.missingEvidence,
        pack
      );
    }


    
    // Session 9: suspicious clauses from LLM smartFields
    // Session 9 hybrid: LLM smartFields + rule-based OCR scan
    const _clauseOcrBlob = (perDocument || [])
      .map((d: any) => d?.ocr?.text || d?.ocrText || d?.text || d?.extractedText || "")
      .filter(Boolean)
      .join("\n\n");
    const clauseConcerns = extractClauseConcerns(_mergedSmartFields, _clauseOcrBlob);
    // P1-D: server sale-bundle override — strip tenancy-only noise on sale packs
    const _saleBundle = isSaleBundle(perDocument, _mergedSmartFields);
    if (_saleBundle && clauseConcerns?.missing?.length) {
      clauseConcerns.missing = filterTenancyOnlyMissing(clauseConcerns.missing);
      console.log("[beta/scan] P1-D sale-bundle: filtered clauseConcerns.missing ->", clauseConcerns.missing.length);
    }
    if (_saleBundle && phase2?.missingEvidence && Array.isArray((phase2.missingEvidence as any).missing)) {
      const me = phase2.missingEvidence as { missing: any[] };
      me.missing = me.missing.filter((item: any) => {
        const text = String(item?.label || item?.code || item?.message || item || "");
        return !/monthly\s*rent|security\s*deposit|notice\s*period|landlord|tenant|kiraaya|kiraya|rent\s*amount|advance\s*rent|sub-?let/i.test(text);
      });
      console.log("[beta/scan] P1-D sale-bundle: filtered phase2.missingEvidence.missing ->", me.missing.length);
    }
    const _hasHighClause = (clauseConcerns?.flagged || []).some((f: any) => {
      const s = String(f.severity || "").toLowerCase();
      return s === "high" || s === "critical";
    });
    if (combinedVerdict && (_hasHighClause || riskResult?.riskLabel === "HIGH" || riskResult?.riskLabel === "CRITICAL") && combinedVerdict.verdict === "PROCEED") {
      combinedVerdict = {
        verdict: "PROCEED WITH CAUTION",
        posture: "CAUTIOUS",
        reasoning: "Pages are consistent, but flagged clauses are one-sided. Do not treat this as a green light until those terms are changed or accepted in writing.",
      };
    }
    const ocrBlob = (perDocument || [])
      .map((d: any) => d?.ocr?.text || d?.ocrText || d?.text || "")
      .filter(Boolean)
      .join("\n");
    const ruleHits = detectSuspiciousClauses({
      ocrText: ocrBlob,
      smartFields: _mergedSmartFields,
    });
    // Map rule hits into clauseConcerns.flagged shape
    for (const h of ruleHits.clauses) {
      const already = clauseConcerns.flagged.some(
        (f: any) => (f.quote || "").toLowerCase().includes((h.evidence || h.title || "").toLowerCase().slice(0, 40))
      );
      if (!already) {
        clauseConcerns.flagged.push({
          quote: h.evidence || h.title,
          concern: h.message,
          severity: h.severity === "CRITICAL" ? "critical" : h.severity === "HIGH" ? "high" : "medium",
          title: h.title,
        });
      }
    }
    console.log(
      `[beta/scan] clauses: suspicious=${clauseConcerns.flagged.length} missing=${clauseConcerns.missing.length} (llm+rules ruleHits=${ruleHits.clauses.length})`
    );
    if (clauseConcerns?.flagged?.length > 1) {
      const seen = new Set<string>();
      clauseConcerns.flagged = clauseConcerns.flagged.filter((f: any) => {
        const blob = `${f.title || ""} ${f.concern || ""}`.toLowerCase();
        const key = /power of attorney|lawful attorney|general\s*\/?\s*unlimited|\bpoa\b/i.test(blob)
          ? "poa_cluster"
          : blob.slice(0, 80);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    riskResult = mergeRiskFactors(riskResult, clauseConcernsToRiskFactors(clauseConcerns));
    {
      const _cnicBlob = ocrBlobForRisk || "";
      if (_cnicBlob.length < 20) {
        console.warn("[beta/scan] P1-E: ocrBlobForRisk empty/short - CNIC transposition check skipped");
      }
      const cnicHits = detectCnicTranspositions(_cnicBlob);
      if (cnicHits.length) {
        console.log("[beta/scan] P1-E: CNIC transposition hits=" + cnicHits.length);
        riskResult = mergeRiskFactors(riskResult, cnicTranspositionsToRiskFactors(cnicHits) as any);
      }
    }
    const highClause = (clauseConcerns?.flagged || []).some((f: any) => {
      const s = String(f.severity || "").toLowerCase();
      return s === "high" || s === "critical";
    });
    if (highClause) {
      if (combinedVerdict && String(combinedVerdict.verdict || "").replace(/_/g, " ") === "PROCEED") {
        combinedVerdict = {
          verdict: "PROCEED WITH CAUTION",
          posture: "CAUTIOUS",
          reasoning: "Pages are consistent, but flagged clauses are one-sided. Do not treat this as a green light until those terms are changed or accepted in writing.",
        };
      }
      if (phase2?.analysis) {
        const d = String((phase2.analysis as any).decision || "").toUpperCase().replace(/_/g, " ");
        if (d === "PROCEED" || d === "CLEAR") {
          (phase2.analysis as any).decision = "PROCEED_WITH_CAUTION";
        }
      }
    }
    // Feature 3c: translate clause concerns (computed after main Urdu batch)
    try {
      const clauseUrduInputs: Record<string, string> = {};
      (clauseConcerns?.flagged || []).forEach((c: any, i: number) => {
        if (c?.concern) clauseUrduInputs["clauseConcern_" + i] = String(c.concern);
        if (c?.title) clauseUrduInputs["clauseTitle_" + i] = String(c.title);
      });
      (clauseConcerns?.missing || []).forEach((m: string, i: number) => {
        if (m) clauseUrduInputs["missingProtection_" + i] = String(m);
      });
      if (Object.keys(clauseUrduInputs).length > 0) {
        const more = await translateToUrduTimed(clauseUrduInputs, 12000);
        urduTranslations = { ...urduTranslations, ...more };
        console.log(`[beta/scan] Urdu clauses: ${Object.keys(more).length} string(s)`);
      }
    } catch (e: any) {
      console.warn("[beta/scan] clause Urdu translate failed:", e?.message || e);
    }

    riskResult = mergeRiskFactors(riskResult, suspiciousClausesToRiskFactors(ruleHits) as any);
    // Final UX filter: stamp noise + missing-list vs OCR
    const _finalOcr = String(typeof ocrBlobForRisk !== "undefined" ? ocrBlobForRisk : "") + " " + String(typeof _clauseOcrBlob !== "undefined" ? _clauseOcrBlob : "");
    const _hasStampPaper = !!((_mergedSmartFields as any)?._stampEvidence) || /attested|oath\s*commissioner|wasil|hundred\s+rupees|rs\.?\s*[=:]?\s*100|central\s*park|stamp\s*paper/i.test(_finalOcr);
    if (_hasStampPaper) {
      const kept = (riskResult.riskFactors || []).filter((x: any) => !/stamp\s*\/\s*registration|formalities\s*unclear|rent-law formalities/i.test(String(x?.label || "")));
      riskResult = mergeRiskFactors({ riskScore: 1, riskLabel: "LOW" as const, riskFactors: [], scoreBreakdown: "Base 1" }, kept);
    }
    if (clauseConcerns?.missing?.length) {
      const _summaryBlob = [
        _finalOcr,
        ...((perDocument || []).map((d: any) => String(d?.smartFields?.summary || d?.summary || ""))),
        String((_mergedSmartFields as any)?.summary || ""),
      ].join("\n");
      clauseConcerns.missing = filterMissingAgainstText(clauseConcerns.missing, _summaryBlob);
    }
    console.log(`[beta/scan] Risk final: score=${riskResult.riskScore}/10 factors=${(riskResult.riskFactors||[]).length} stampPaper=${_hasStampPaper}`);

    const rawPayload = {
      success: true,
      referenceCode: scanReferenceCode,
      tier: entitlementToUse.report_type,
      documents: perDocument,
      crossDoc,
      combinedVerdict,
      urduTranslations,
      riskScore: Math.round(Number(riskResult.riskScore) || 0),
      riskFactors: riskResult.riskFactors,
      // Align label to displayed (rounded) score: 7+ = HIGH
      riskLabel: (() => {
        const s = Math.round(Number(riskResult.riskScore) || 0);
        if (s < 4) return "LOW";
        if (s < 7) return "MEDIUM";
        if (s < 9) return "HIGH";
        return "CRITICAL";
      })(),
      scoreBreakdown: riskResult.scoreBreakdown,
      chainOfTitle: chainOfTitle,
      valuationComparison: valuationComparison,
      clauseConcerns,
      phase2: phase2 && {
        classification: phase2.classification,
        observations: phase2.observations,
        result: phase2.analysis,
        explanations: phase2.explanations,
        posture: phase2.posture,
        missingEvidence: phase2.missingEvidence,
        tenancyJurisdiction: phase2.tenancyJurisdiction,
        propertyJurisdiction: phase2.propertyJurisdiction,
        assistant: {
          allowed: phase2.assistant.allowed,
          text: phase2.assistant.text,
          citations: phase2.assistant.citations,
          declinedReason: phase2.assistant.declinedReason,
        },
        nextSteps: sanitizeRentalNextSteps(nextSteps, _mergedSmartFields, collectAllText(perDocument)),
      },
    };

    // Persist risk + chain snapshot for public verify page
    if (scanReferenceCode) {
      try {
        await updateScanSnapshot({
          referenceCode: scanReferenceCode,
          riskScore: Math.round(Number(riskResult.riskScore) || 0),
          riskLabel: riskResult.riskLabel,
          scoreBreakdown: riskResult.scoreBreakdown,
          verdict: (combinedVerdict?.verdict || phase2?.analysis?.decision || null) as string | null,
          pakkaScore: typeof alignedPakkaScore === "number" ? alignedPakkaScore : (phase2?.analysis?.pakkaScore ?? null),
          chainOfTitle: chainOfTitle,
      publicSummary: {
        riskFactors: (riskResult.riskFactors || []).slice(0, 8).map((f: any) => ({
          label: String(f.label || "").slice(0, 220),
          points: f.points,
          category: f.category,
        })),
        valuation: valuationComparison
          ? {
              declaredPricePkr: valuationComparison.declaredPricePkr ?? null,
              officialValuePkr: valuationComparison.officialValuePkr ?? null,
              ratio: valuationComparison.ratio ?? null,
              section111: valuationComparison.section111 ?? null,
            }
          : null,
        missingProtections: (typeof clauseConcerns !== "undefined" && clauseConcerns?.missing ? clauseConcerns.missing : []).slice(0, 8).map((m: any) => String(m).slice(0, 160)),
        clauseFlagCount: typeof clauseConcerns !== "undefined" && clauseConcerns?.flagged ? clauseConcerns.flagged.length : 0,
      },
        });
      } catch (err: any) {
        console.warn("[beta/scan] snapshot persist failed:", err?.message || err);
      }
    }

    // Prioritise top critical cross-doc mismatches in What To Do Next
    if (crossDoc?.crossChecks?.length) {
      const topXd = crossDoc.crossChecks
        .filter((c: any) => String(c.status || "").toLowerCase() === "mismatch" && ["critical", "high"].includes(String(c.severity || "").toLowerCase()))
        .sort((a: any, b: any) => (String(b.severity).toLowerCase() === "critical" ? 1 : 0) - (String(a.severity).toLowerCase() === "critical" ? 1 : 0))[0];
      if (topXd) {
        const detail = String((topXd as any).detail || topXd.finding || (topXd as any).message || "").slice(0, 200);
        const cat = String(topXd.category || "property");
        const title =
          /area|sq\.?\s*y|dimension|size/i.test(detail + cat)
            ? "Re-verify plot size / allotment record before paying balance"
            : `Resolve critical ${cat} mismatch before proceeding`;
        const step = {
          priority: "high",
          title,
          detail: detail || "Cross-document critical mismatch must be resolved in writing before transferring funds.",
        };
        const already = (nextSteps || []).some((s: any) => /mismatch|plot size|allotment|re-verify plot/i.test(String(s?.title || "")));
        if (!already) nextSteps = [step, ...(nextSteps || [])];
      }
    }
    nextSteps = sanitizeRentalNextSteps(nextSteps, _mergedSmartFields, collectAllText(perDocument));
    // Cap DO FIRST (priority=high) to 2 so users are not flooded
    {
      let highLeft = 2;
      nextSteps = (nextSteps || []).map((s: any) => {
        const p = String(s?.priority || "").toLowerCase();
        if (p === "high" || p === "do_first" || p === "do first") {
          if (highLeft > 0) {
            highLeft--;
            return { ...s, priority: "high" };
          }
          return { ...s, priority: "medium" };
        }
        return s;
      });
    }
    if (phase2) (phase2 as any).nextSteps = nextSteps;
    // Realign Urdu next-step keys by English title (handles inject + sanitize reorder)
    {
      const kept: Record<string, string> = {};
      for (const [k, v] of Object.entries(urduTranslations || {})) {
        if (!/^nextStep(Title|Detail)_\d+$/.test(k)) kept[k] = v;
      }
      (nextSteps || []).forEach((step: any, i: number) => {
        const tt = String(step?.title || "").trim();
        const hit = tt ? urduByNextStepTitle[tt] : undefined;
        if (hit?.title) kept["nextStepTitle_" + i] = hit.title;
        if (hit?.detail) kept["nextStepDetail_" + i] = hit.detail;
      });
      // Static Urdu for injected plot-size card if still missing
      if (/plot size|allotment|Re-verify plot/i.test(String(nextSteps?.[0]?.title || "")) && !kept["nextStepTitle_0"]) {
        kept["nextStepTitle_0"] = "ادائیگی سے پہلے پلاٹ کا رقبہ / الاٹمنٹ ریکارڈ دوبارہ تصدیق کریں";
        kept["nextStepDetail_0"] = "فارڈ اور بیعانہ/فروخت معاہدے میں رقبے کا فرق ہے۔ بقیہ رقم ادا کرنے سے پہلے درست فارڈ یا ترمیم شدہ معاہدہ حاصل کریں۔";
      }
      urduTranslations = kept;
    }
    // Payload was built before inject — write final nextSteps + urdu into response
    if ((rawPayload as any).phase2) {
      (rawPayload as any).phase2.nextSteps = nextSteps;
    }
    (rawPayload as any).nextSteps = nextSteps;
    if ((rawPayload as any).urduTranslations) {
      (rawPayload as any).urduTranslations = urduTranslations;
    }
    const filteredPayload = filterResponseByTier(rawPayload, entitlementToUse.report_type);
    console.log(`[beta/scan] Tier-filtered response for tier=${entitlementToUse.report_type}`);
    return NextResponse.json(filteredPayload);
  } catch (error: any) {
    console.error("[beta/scan] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        details: process.env.NODE_ENV === "development" ? String(error?.message || error) : undefined,
      },
      { status: 500 }
    );
  }
}

function buildEvidenceFromExtracted(documentId: string, fields: any[], documentType: any) {
  return buildEvidence({
    documentId,
    documentType,
    jurisdiction: "UNKNOWN" as Jurisdiction,
    schemaVersion: "1.0.0",
    fields,
    warnings: [],
  }) as any;
}





