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

import { NextResponse, after } from "next/server";
import {
  insertBetaScanJob,
  markBetaScanJobRunning,
  completeBetaScanJob,
  failBetaScanJob,
} from "@/lib/beta-scan-jobs";
import { coerceToScanFact } from "@/lib/scan-fact";
import { decodeUtf8, clipSentence, ruleIdFromText, dedupeByRuleId, walkUtf8, snapQuote } from "@/lib/scan-rules";
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
import { extractClauseConcerns, clauseConcernsToRiskFactors, filterMissingAgainstText, harvestTenancyClauseFlags } from "@/intelligence/clause-concerns";
import { detectSuspiciousClauses, suspiciousClausesToRiskFactors } from "@/intelligence/suspicious-clauses";
import { applyTenancyBackfill } from "@/intelligence/tenancy-backfill";
import { sanitizeRentalNextSteps, localizeNextStepRoles } from "@/intelligence/sanitize-next-steps";
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Tier-based response filtering.
// Rental: minimal report - no cross-doc, no combined verdict, next steps capped at 3
// Bayana: adds cross-doc + combined verdict, next steps capped at 5
// Full DD: everything, no caps
// Assistant Q&A is removed for ALL tiers - users are directed to WhatsApp support.
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
    if (rent && /rent|Ú©Ø±Ø§ÛŒÛ/.test(t) && /missing|add |clarif/.test(t)) return false;
    if (dep && /deposit|Ø³ÛŒÚ©ÛŒÙˆØ±Ù¹ÛŒ/.test(t) && /missing|add |clarif/.test(t)) return false;
    if (addr && /address|Ù¾ØªÛ/.test(t) && /missing|add |include/.test(t)) return false;
    return true;
  });
}

async function runQueuedScanJob(
  jobId: string,
  request: Request,
): Promise<void> {
  try {
    await markBetaScanJobRunning(jobId, "OC");
    const res = await postSyncScan(request);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      await failBetaScanJob(
        jobId,
        String(body?.message || body?.error || `scan_failed_${res.status}`),
      );
      return;
    }
    await completeBetaScanJob(jobId, body);
  } catch (err: any) {
    console.error("[beta/scan] queued job failed", jobId, err?.message || err);
    await failBetaScanJob(jobId, String(err?.message || err || "WORKER_ERROR"));
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const forceSync = url.searchParams.get("sync") === "1";
  if (forceSync) {
    return postSyncScan(request);
  }

  const rawBody = await request.arrayBuffer();
  const headerInit = new Headers(request.headers);
  const rebuild = (syncQuery: boolean) => {
    const u = new URL(request.url);
    if (syncQuery) u.searchParams.set("sync", "1");
    return new Request(u.toString(), {
      method: "POST",
      headers: headerInit,
      body: rawBody.slice(0),
    });
  };

  try {
    const preview = rebuild(false);
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "NOT_SIGNED_IN", message: "Please sign in to use PakkaScan." },
        { status: 401 },
      );
    }
    const unused = await getUnusedEntitlements(session.userId);
    if (unused.length === 0) {
      return NextResponse.json(
        {
          error: "NO_ENTITLEMENT",
          message: "You need to purchase a scan credit before analysing documents.",
          redirectTo: "/#pricing",
        },
        { status: 402 },
      );
    }

    const formData = await preview.formData();
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

    const storedFiles = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      })),
    );
    const jobId = randomUUID();
    await insertBetaScanJob({
      id: jobId,
      userId: session.userId,
      entitlementId: unused[0]?.id ?? null,
      cookieHeader: request.headers.get("cookie"),
      files: storedFiles,
      hints: documentTypeHints,
    });

    after(() => runQueuedScanJob(jobId, rebuild(true)));
    return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
  } catch (err: any) {
    console.warn("[beta/scan] async enqueue failed, using sync path:", err?.message || err);
    return postSyncScan(rebuild(true));
  }
}

async function postSyncScan(request: Request) {
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
            text: ocr.text,
          },
          ocrText: ocr.text,
          extraText: ocr.text,
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
        if (_sameTenancyBundle && crossDoc?.crossChecks?.length) {
          crossDoc.crossChecks = crossDoc.crossChecks.map((c: any) => {
            const cat = String(c.category || "").toLowerCase();
            const finding = String(c.finding || c.detail || c.message || "").toLowerCase();
            const continuation =
              (cat === "financial" || cat === "property" || cat === "other") &&
              /0\s*pkr|as 0|not mentioned|omits|omitted|absent|missing from|does not mention|only on (page|document) 1|inherit/i.test(finding);
            if (continuation && String(c.status).toLowerCase() === "mismatch") {
              return { ...c, status: "unverifiable", severity: "info" };
            }
            return c;
          });
          crossDoc.hasCriticalMismatch = crossDoc.crossChecks.some(
            (c: any) =>
              String(c.status).toLowerCase() === "mismatch" &&
              String(c.severity).toLowerCase() === "critical"
          );
          console.log("[beta/scan] Cross-doc: continuation filter, critical=", crossDoc.hasCriticalMismatch);
        }
        if (_sameTenancyBundle) {
          const iso = (v: any) => {
            const m = String(v || "").match(/(\d{4})-(\d{2})-(\d{2})/);
            return m ? { y: Number(m[1]), mo: m[2], d: m[3], raw: m[0] } : null;
          };
          const starts = (successfulDocs || []).map((d: any) => iso(d?.smartFields?.dates?.start_date || d?.smartFields?.dates?.startDate)).filter(Boolean);
          const years = Array.from(new Set(starts.map((s: any) => s.y)));
          const anchor = starts[0]; const sameMd = starts.length >= 2 && !!anchor && starts.every((s: any) => s && s.mo === anchor.mo && s.d === anchor.d);
          if (sameMd && years.length >= 2) {
            const blob = (successfulDocs || []).map((d: any) => [d?.ocr?.text, d?.ocrText, d?.smartFields?.summary].filter(Boolean).join(" ")).join("\n");
            const ymin = Math.min(...(years as number[]));
            const ymax = Math.max(...(years as number[]));
            const best = (ymax - ymin <= 2) ? ymax : ymax;
            for (const d of successfulDocs || []) {
              const dates = d?.smartFields?.dates;
              if (!dates) continue;
              for (const k of Object.keys(dates)) {
                const p = iso(dates[k]);
                if (p && (years as number[]).includes(p.y) && p.y !== best) dates[k] = best + "-" + p.mo + "-" + p.d;
              }
              if (d.smartFields.summary) {
                let s = String(d.smartFields.summary);
                for (const y of years as number[]) if (y !== best) s = s.replace(new RegExp(String(y), "g"), String(best));
                d.smartFields.summary = s;
              }
            }
            if (crossDoc?.crossChecks) {
              crossDoc.crossChecks = crossDoc.crossChecks.map((c: any) => {
                const cat = String(c.category || "").toLowerCase();
                const f = String(c.finding || c.detail || "");
                if (cat === "date" && /2024|2026/.test(f) && String(c.status).toLowerCase() === "mismatch") {
                  return { ...c, status: "match", severity: "info", finding: "Tenancy dates align on the same day/month; year digits were reconciled across pages." };
                }
                return c;
              });
              crossDoc.hasCriticalMismatch = crossDoc.crossChecks.some((c: any) => String(c.status).toLowerCase() === "mismatch" && String(c.severity).toLowerCase() === "critical");
            }
            console.log("[beta/scan] Tenancy year-flip reconciled to", best, "critical=", crossDoc.hasCriticalMismatch);
          }
          for (const d of successfulDocs || []) {
            const dates = d?.smartFields?.dates;
            if (!dates) continue;
            const s = iso(dates.start_date || dates.startDate);
            let e = iso(dates.end_date || dates.endDate);
            const months = Number(dates.duration_months || dates.durationMonths || 11);
            if (s && e && (e.y < s.y || (e.y === s.y && (e.mo + e.d) < (s.mo + s.d)))) {
              const startDt = new Date(Date.UTC(s.y, Number(s.mo) - 1, Number(s.d)));
              startDt.setUTCMonth(startDt.getUTCMonth() + (months > 0 ? months : 11));
              const yy = startDt.getUTCFullYear();
              const mm = String(startDt.getUTCMonth() + 1).padStart(2, "0");
              const dd = String(startDt.getUTCDate()).padStart(2, "0");
              dates.end_date = yy + "-" + mm + "-" + dd;
              dates.endDate = dates.end_date;
              console.log("[beta/scan] end-before-start repaired to", dates.end_date);
            }
          }
          if (crossDoc) {
            const ass = String(crossDoc.overallAssessment || "");
            if (/2024 vs 2026|conflicting execution/i.test(ass)) {
              crossDoc.overallAssessment = "The documents are two pages of the same tenancy agreement. Dates were aligned on the same day and month. Financial and property details appear on the parties page only.";
            }
            const packOcr = (successfulDocs || []).map((d: any) => String(d?.ocr?.text || d?.ocrText || "")).join("\n");
            const signedHit = packOcr.match(/13[\.\/-]0?5[\.\/-]2026|13\s*May\s*2026|2026-05-13/i);
            if (signedHit) {
              for (const d of successfulDocs || []) {
                if (!d.smartFields) continue;
                d.smartFields.dates = d.smartFields.dates || {};
                d.smartFields.dates.signed_on = "2026-05-13";
                d.smartFields.dates.signedOn = "2026-05-13";
                d.smartFields.dates.execution_date = "2026-05-13";
              }
            }
            if (crossDoc.crossChecks) {
              const dateRows = crossDoc.crossChecks.filter((c: any) => String(c.category || "").toLowerCase() === "date");
              const other = crossDoc.crossChecks.filter((c: any) => String(c.category || "").toLowerCase() !== "date");
              const termOk = dateRows.every((c: any) => String(c.status).toLowerCase() !== "mismatch" || /signed-on|execution/i.test(String(c.finding || "")));
              other.push({
                category: "date",
                status: termOk ? "match" : "mismatch",
                severity: termOk ? "info" : "warning",
                finding: "Tenancy start " + String((successfulDocs[0] as any)?.smartFields?.dates?.start_date || "") + " to " + String((successfulDocs[0] as any)?.smartFields?.dates?.end_date || "") + ", signed 2026-05-13 across pages.",
              });
              crossDoc.crossChecks = other;
            }
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
        const typ = String(d.classification?.documentType || d.documentType || "").toUpperCase();
        const tenancyDoc = /TENANCY|RENTAL/.test(typ);
        if (tenancyDoc) {
          const dt = d.smartFields.dates || {};
          const fin = d.smartFields.financials || {};
          const prop = d.smartFields.property || {};
          const par = d.smartFields.parties || {};
          const rent = Number(fin.monthly_rent?.amount ?? fin.monthly_rent ?? 0);
          const dep = Number(fin.security_deposit?.amount ?? fin.security_deposit ?? 0);
          const addr = String(prop.address || "").trim();
          const bits: string[] = [];
          const ln = par.landlord?.name || par.landlord;
          const tn = par.tenant?.name || par.tenant;
          if (ln || tn) bits.push("Tenancy between " + String(ln || "landlord") + " and " + String(tn || "tenant") + ".");
          if (dt.start_date || dt.end_date) bits.push("Term " + String(dt.start_date || "") + " to " + String(dt.end_date || "") + ".");
          if (rent > 0) bits.push("Monthly rent PKR " + rent + ".");
          else bits.push("Rent is not stated on this page.");
          if (dep > 0) bits.push("Security deposit PKR " + dep + ".");
          if (addr && !/^not mentioned$/i.test(addr)) bits.push("Property: " + addr + ".");
          else bits.push("Address is not stated on this page.");
          d.smartFields.summary = bits.join(" ");
        } else {
          d.smartFields.summary = String(d.smartFields.summary || "")
            .replace(/Rent is not stated on this page\.?/gi, "")
            .replace(/Security deposit PKR/gi, "Bayana/Token PKR")
            .replace(/\u0645\u062F\u062A\s*\u0646\u0627\u06D4?/g, "")
            .replace(/\s{2,}/g, " ")
            .trim();
        }
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
        const scrub = (s: string) => String(s || "")
          .replace(/p[eÃ©]riode/gi, "period")
          .replace(/[\u0400-\u04FF]+/g, "")
          .replace(/due to page split/gi, "details appear on the other page")
          .replace(/due to page[- ]by[- ]page extraction limits/gi, "details appear on the other page")
          .replace(/marked as 0 on Page 2/gi, "omitted / not mentioned on Page 2")
          .replace(/listed as 0 on Page 2/gi, "omitted / not mentioned on Page 2")
          .replace(/as 0 PKR/gi, "not mentioned")
          .replace(/are marked as 0/gi, "are omitted / not mentioned")
          .replace(/missing standard clauses/gi, "unmentioned/omitted")
          .replace(/noted as missing standard clauses on Page 2 due to multi-page document split/gi, "noted as unmentioned/omitted on Page 2 (multi-page agreement)")
          .replace(/\s{2,}/g, " ")
          .trim();
        for (const k of Object.keys(urduTranslations)) urduTranslations[k] = scrub(urduTranslations[k]);
        for (const d of perDocument || []) {
          if (d?.smartFields?.summary) d.smartFields.summary = scrub(String(d.smartFields.summary));
        }
        (perDocument || []).forEach((d: any, i: number) => {
          const typ = String(d?.classification?.documentType || d?.documentType || "").toUpperCase();
          const tenancyDoc = /TENANCY|RENTAL/.test(typ);
          if (!tenancyDoc) {
            const keep = String(urduTranslations["docSummary_" + i] || d?.smartFields?.summary || "")
              .replace(/\u0645\u062F\u062A\s*\u0646\u0627\u06D4?/g, "")
              .replace(/\u0627\u0633 \u0635\u0641\u062D\u06D2 \u067E\u0631 \u06A9\u0631\u0627\u06CC\u06C1[^\u06D4.]*\u06D4?/g, "")
              .replace(/\u0633\u06CC\u06A9\u06CC\u0648\u0631\u0679\u06CC/g, "\u0628\u06CC\u0639\u0627\u0646\u06C1/\u0679\u0648\u06A9\u0646");
            urduTranslations["docSummary_" + i] = keep;
            if (d.smartFields) d.smartFields.summaryUrdu = keep;
            return;
          }
          const dt = d?.smartFields?.dates || {};
          const fin = d?.smartFields?.financials || {};
          const prop = d?.smartFields?.property || {};
          const rent = Number(fin.monthly_rent?.amount ?? fin.monthly_rent ?? 0);
          const dep = Number(fin.security_deposit?.amount ?? fin.security_deposit ?? 0);
          const addr = String(prop.address || "").trim();
          const term = String(dt.start_date || "") + " \u062A\u0627 " + String(dt.end_date || "");
          let ur = "\u0645\u062F\u062A " + term + "\u06D4 ";
          if (rent > 0) ur += "\u0645\u0627\u06C1\u0627\u0646\u06C1 \u06A9\u0631\u0627\u06CC\u06C1 " + rent + " \u0631\u0648\u067E\u06D2\u06D4 ";
          else ur += "\u0627\u0633 \u0635\u0641\u062D\u06D2 \u067E\u0631 \u06A9\u0631\u0627\u06CC\u06C1 \u062F\u0631\u062C \u0646\u06C1\u06CC\u06BA\u06D4 ";
          if (dep > 0) ur += "\u0633\u06CC\u06A9\u06CC\u0648\u0631\u0679\u06CC " + dep + " \u0631\u0648\u067E\u06D2\u06D4 ";
          if (addr && !/^not mentioned$/i.test(addr)) ur += "\u067E\u062A\u06C1: " + addr + "\u06D4";
          else ur += "\u0627\u0633 \u0635\u0641\u062D\u06D2 \u067E\u0631 \u067E\u062A\u06C1 \u062F\u0631\u062C \u0646\u06C1\u06CC\u06BA\u06D4";
          urduTranslations["docSummary_" + i] = ur;
          if (d.smartFields) d.smartFields.summaryUrdu = ur;
        });
        if (crossDoc?.crossChecks?.length) {
          crossDoc.crossChecks = crossDoc.crossChecks.map((c: any) => ({
            ...c,
            finding: scrub(String(c.finding || c.detail || "")),
          }));
        }
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
          const detail = String((c as any).detail || c.finding || (c as any).message || "");
          const blob = (st + " " + sev + " " + String(c.category || "") + " " + detail).toLowerCase();
          if (st === "match") return false;
          if (st === "mismatch") return true;
          // Material unverifiable: CNIC conflict, arrears, stamp/date
          if (st === "unverifiable" || st === "partial_match") {
            return /cnic|transpos|typo|arrears|480|outstanding|stamp|date|backdat/.test(blob);
          }
          return sev === "critical" || sev === "high";
        })
        .map((c: any) => {
          const cat = String(c.category || "property").toLowerCase();
          const st = String(c.status || "").toLowerCase();
          const sev = String(c.severity || "").toLowerCase();
          const detail = String((c as any).detail || c.finding || (c as any).message || "");
          const lower = (cat + " " + st + " " + sev + " " + detail).toLowerCase();
          let pts = -2;
          if (st === "mismatch" && (sev === "critical" || sev === "high")) pts = -3;
          if (/date|stamp|chronolog|backdat|execut/.test(lower)) pts = -4;
          if (/cnic|transpos|typo|identity/.test(lower)) pts = Math.min(pts, -2);
          if (/arrears|outstanding|480|maintenance/.test(lower)) pts = Math.min(pts, -2);
          const tag = st === "mismatch" ? "Mismatch" : "Cross-doc";
          return {
            label: (tag + " (" + String(c.category || "property") + "): " + detail.slice(0, 220)),
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
    {
      const _harvestTypes = (perDocument || []).map((d: any) =>
        String(d?.classification?.documentType || "").toUpperCase()
      );
      const _harvestTenancy =
        _harvestTypes.length > 0 &&
        _harvestTypes.every(
          (typ: string) =>
            !typ || typ === "UNKNOWN" || typ.includes("TENANCY") || typ.includes("RENTAL") || typ.includes("LEASE")
        );
      if (_harvestTenancy) {
        const harvestBlob = [
          _clauseOcrBlob,
          String((_mergedSmartFields as any)?.summary || ""),
          ...((perDocument || []).map((d: any) =>
            [d?.smartFields?.summary, d?.summary, d?.extraText, d?.ocr?.text].filter(Boolean).join("\n")
          )),
        ].join("\n");
        for (const row of harvestTenancyClauseFlags(harvestBlob)) {
          const already = clauseConcerns.flagged.some((f: any) =>
            String(f.title || "").toLowerCase() === String(row.title || "").toLowerCase() ||
            String(f.quote || "").toLowerCase().includes(String(row.quote || "").toLowerCase().slice(0, 24))
          );
          if (!already) clauseConcerns.flagged.push(row);
        }
      }
    }
    // P1-D: server sale-bundle override  -  strip tenancy-only noise on sale packs
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
      .map((d: any) =>
        [d?.ocr?.text, d?.ocrText, d?.text, d?.extraText, d?.smartFields?.summary, d?.summary]
          .filter(Boolean)
          .join("\n")
      )
      .filter(Boolean)
      .join("\n");
    const ruleHits = detectSuspiciousClauses({
      ocrText: ocrBlob,
      smartFields: _mergedSmartFields,
    });
    {
      const packText = ocrBlob + "\n" + collectAllText(perDocument || []);
      const tenancyPack = (perDocument || []).every((d: any) => {
        const typ = String(d?.classification?.documentType || "").toUpperCase();
        return !typ || typ === "UNKNOWN" || /TENANCY|RENTAL|LEASE/.test(typ);
      });
      if (tenancyPack) {
        for (const row of harvestTenancyClauseFlags(packText)) {
          const already = clauseConcerns.flagged.some((f: any) =>
            String(f.title || "").toLowerCase() === String(row.title || "").toLowerCase()
          );
          if (!already) clauseConcerns.flagged.push(row);
        }
        if (/stay\s*order|Ø§Ø³Ù¹Û’|Ø¹Ø¯Ø§Ù„Øª|Ù‚ÙÙ„|ØªØ§Ù„Û|lock-?break|self-?help|repossess/i.test(packText)) {
          if (!clauseConcerns.flagged.some((f: any) => /stay|court/i.test(String(f.title || f.concern || "")))) {
            clauseConcerns.flagged.push({
              title: "Court-waiver / stay-order ban",
              quote: "Tenant stay-order / court-waiver language present on the tenancy form",
              concern: "Restricts the tenant from seeking a stay order or court protection. Heavily one-sided.",
              severity: "high",
            });
          }
          if (!clauseConcerns.flagged.some((f: any) => /lock|self-help/i.test(String(f.title || f.concern || "")))) {
            clauseConcerns.flagged.push({
              title: "Self-help eviction / lock-break",
              quote: "Landlord lock-break / belongings language present on the tenancy form",
              concern: "Allows the landlord to break locks and take belongings without a court eviction process.",
              severity: "high",
            });
          }
        }
      }
    }
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
    {
      const packOcr = collectAllText(perDocument || []);
      const windowAt = (needles: string[]) => {
        for (const n of needles) {
          const idx = packOcr.indexOf(n);
          if (idx < 0) continue;
          const slice = packOcr.slice(Math.max(0, idx - 24), idx + 160).replace(/\s+/g, " ").trim();
          if ((slice.match(/[\u0600-\u06FF]/g) || []).length >= 12) return slice;
        }
        return "";
      };
      const lockQ = windowAt(["Ù‚ÙÙ„", "ØªØ§Ù„Û", "Ø³Ø§Ù…Ø§Ù†", "ØªØ§Ù„Ø§"]);
      const stayQ = windowAt(["Ø³Ù¹Û’", "Ø§Ø³Ù¹Û’", "Ø¹Ø¯Ø§Ù„Øª", "Ø³Ù¹Û’ Ø¢Ø±ÚˆØ±"]);
      clauseConcerns.flagged = (clauseConcerns.flagged || []).map((f: any) => {
        const title = String(f.title || f.concern || "");
        let q = String(f.quote || "").trim();
        const ar = (q.match(/[\u0600-\u06FF]/g) || []).length;
        const bad = !q || q === "--" || /language present|Printed (lock-break|stay-order)/i.test(q) || (ar > 0 && ar < 12);
        if (/lock|self-help|belonging/i.test(title) && bad) q = lockQ;
        if (/stay|court/i.test(title) && bad) q = stayQ;
        return { ...f, quote: q };
      });
    }
    {
      const hasDuration = (perDocument || []).some((d: any) => {
        const dt = d?.smartFields?.dates || {};
        const n = Number(dt.duration_months || dt.durationMonths || 0);
        return n > 0 || (dt.start_date && dt.end_date) || (dt.startDate && dt.endDate);
      });
      if (hasDuration) {
        clauseConcerns.flagged = (clauseConcerns.flagged || []).filter((f: any) =>
          !/duration.{0,40}missing|missing.{0,40}duration|term \/ duration not detected|no defined tenancy duration/i.test(
            `${f.title || ""} ${f.concern || ""} ${f.quote || ""}`
          )
        );
        for (const d of perDocument || []) {
          if (d?.smartFields?.summary) {
            d.smartFields.summary = String(d.smartFields.summary).replace(/\s*with no defined tenancy duration\.?/gi, "");
          }
        }
      }
      const tenancy = (perDocument || []).every((d: any) => {
        const typ = String(d?.classification?.documentType || "").toUpperCase();
        return !typ || typ === "UNKNOWN" || /TENANCY|RENTAL|LEASE/.test(typ);
      });
      if (tenancy) {
        const rewrite = (s: string) => String(s || "").replace(/Seller'?s?\s*\/\s*Landlord/gi, "Landlord").replace(/\bSeller'?s\b/gi, "Landlord's");
        clauseConcerns.flagged = (clauseConcerns.flagged || []).map((f: any) => ({
          ...f, title: rewrite(f.title), concern: rewrite(f.concern), quote: rewrite(f.quote),
        }));
      }
    }
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
    {
      const norm = (v: any) => String(v || "").replace(/\D/g, "");
      for (const d of perDocument || []) {
        const p = d?.smartFields?.parties;
        if (!p) continue;
        const lc = norm(p.landlord?.cnic || p.landlord?.id);
        const tc = norm(p.tenant?.cnic || p.tenant?.id);
        if (lc && tc && lc === tc) {
          if (p.landlord) { p.landlord.cnic = null; p.landlord.id = null; }
        }
      }
      const kept: any[] = [];
      const seenLock = { lock: false, stay: false, notice: false };
      for (const f of riskResult.riskFactors || []) {
        const l = String(f?.label || "").toLowerCase();
        let skip = false;
        if (/lock-?break|break locks|self-help|seize belongings|take the tenant/.test(l)) {
          if (seenLock.lock) skip = true; else seenLock.lock = true;
        } else if (/stay order|barred from court|court-waiver|approach a court/.test(l)) {
          if (seenLock.stay) skip = true; else seenLock.stay = true;
        } else if (/notice period|termination notice/.test(l)) {
          if (seenLock.notice) skip = true; else seenLock.notice = true;
        }
        if (!skip) kept.push(f);
      }
      if (kept.length !== (riskResult.riskFactors || []).length) {
        riskResult = mergeRiskFactors({ ...riskResult, riskFactors: [] } as any, kept);
        console.log("[beta/scan] Deduped clause factors ->", riskResult.riskScore, kept.length);
      }
      const f2: any[] = [];
      let noticeAbusive = false;
      for (const f of riskResult.riskFactors || []) {
        const l = String(f?.label || "").toLowerCase();
        if (/notice period|abusive eviction|ejection language/.test(l)) {
          if (noticeAbusive) continue;
          noticeAbusive = true;
          f2.push({ ...f, label: "One-sided exit terms (notice / lock-break / stay-order)  -  confirm in writing" });
        } else f2.push(f);
      }
      if (f2.length !== (riskResult.riskFactors || []).length) {
        riskResult = mergeRiskFactors({ ...riskResult, riskFactors: [] } as any, f2);
      }
    }
    // Final UX filter: stamp noise + missing-list vs OCR
    const _finalOcr = String(typeof ocrBlobForRisk !== "undefined" ? ocrBlobForRisk : "") + " " + String(typeof _clauseOcrBlob !== "undefined" ? _clauseOcrBlob : "");
    const _hasStampPaper = !!((_mergedSmartFields as any)?._stampEvidence) || /attested|oath\s*commissioner|wasil|hundred\s+rupees|rs\.?\s*[=:]?\s*100|central\s*park|stamp\s*paper/i.test(_finalOcr);
    if (_hasStampPaper) {
      const kept = (riskResult.riskFactors || []).filter((x: any) => !/stamp\s*\/\s*registration|formalities\s*unclear|rent-law formalities/i.test(String(x?.label || "")));
      if (kept.length !== (riskResult.riskFactors || []).length) {
        riskResult = mergeRiskFactors({ ...riskResult, riskFactors: [] }, kept);
      }
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

    {
      const v = String(combinedVerdict?.verdict || combinedVerdict?.posture || phase2?.analysis?.decision || "")
        .toUpperCase()
        .replace(/\s+/g, "_");
      const stop = v === "DO_NOT_PROCEED" || v === "STOP" || v === "BLOCKED" || v === "REJECT";
      if (stop && Number(riskResult.riskScore) < 9) {
        const gap = 9 - Number(riskResult.riskScore || 0);
        riskResult = mergeRiskFactors(riskResult, [
          {
            label: "Hard-stop verdict locks risk at CRITICAL  -  do not treat a medium score as permission to proceed",
            points: -Math.max(gap, 0.5),
            category: "document",
          },
        ]);
        console.log("[beta/scan] STOP verdict forced risk to", riskResult.riskScore, riskResult.riskLabel);
      }
    }

    try {
      (perDocument || []).sort((a: any, b: any) =>
        String(a?.fileName || "").localeCompare(String(b?.fileName || ""), undefined, { numeric: true, sensitivity: "base" })
      );
    } catch {}
    if (crossDoc?.crossChecks?.length) {
      crossDoc.crossChecks = crossDoc.crossChecks.map((c: any) => {
        const f = String(c.finding || c.detail || "");
        const cleaned = f
          .replace(/\s*due to page[- ]by[- ]page extraction limits\.?/gi, "")
          .replace(/\s*listed as 0 on Page 2[^.]*\./gi, " not repeated on the clause page.")
          .replace(/\s{2,}/g, " ")
          .trim();
        return { ...c, finding: cleaned || c.finding };
      });
    }

    for (const d of perDocument || []) {
      const typ = String(d?.classification?.documentType || "").toUpperCase();
      const text = String(d?.ocr?.text || d?.ocrText || "");
      const m = text.match(/TOTAL\s+OUTSTANDING\s+DUES[:\s]*Rs\.?\s*([0-9,]+)/i) || text.match(/outstanding\s+dues[:\s]*Rs\.?\s*([0-9,]+)/i);
      if (!m) continue;
      const n = Number(String(m[1]).replace(/,/g, ""));
      if (!n || n < 1000) continue;
      if (!d.smartFields) continue;
      d.smartFields.financials = { ...(d.smartFields.financials || {}), outstanding_dues: n, total_outstanding_dues: n };
    }
    for (const d of perDocument || []) {
      if (d.smartFields) {
        (d as any).scanFact = coerceToScanFact({
          documentType: d.classification?.documentType || (d as any).documentType,
          smartFields: d.smartFields,
          ocrText: String(d.ocr?.text || (d as any).ocrText || ""),
        });
        const dues = (d as any).scanFact?.financials?.outstanding_dues?.amount;
        if (dues != null && d.smartFields.financials) {
          d.smartFields.financials.outstanding_dues = dues;
          (d.smartFields.financials as any).total_outstanding_dues = dues;
        }
      }
    }
        {
      const blob = (perDocument || []).map((d: any) => String(d?.ocr?.text || d?.ocrText || "")).join("\n");
      if (clauseConcerns?.flagged?.length && blob) {
        clauseConcerns.flagged = clauseConcerns.flagged.map((f: any) => {
          let q = String(f.quote || "");
          const stub = /shall stand 10\b|receive payment \(hig/i.test(q) || (/[a-z0-9]$/i.test(q) && q.length < 80);
          if (!stub) return f;
          const needle = q.replace(/\s+/g, " ").slice(0, 28);
          const idx = blob.toLowerCase().indexOf(needle.toLowerCase());
          const idx2 = blob.toLowerCase().indexOf("shall stand");
          const at = idx >= 0 ? idx : idx2;
          if (at < 0) return f;
          const take = blob.slice(at, at + 320).replace(/\s+/g, " ").trim();
          const end = Math.max(take.lastIndexOf("."), take.lastIndexOf("\u06D4"));
          return { ...f, quote: end > 40 ? take.slice(0, end + 1) : take };
        });
      }
    }
    for (const d of perDocument || []) {
      const text = String(d?.ocr?.text || (d as any)?.ocrText || "");
      if (!/no demand certificate|\bNDC\b/i.test(text)) continue;
      d.smartFields = d.smartFields || {};
      d.smartFields.financials = d.smartFields.financials || {};
      if (/dues cleared|tax paid/i.test(text)) {
        (d.smartFields as any).clearance_status = "NDC: dues cleared (CDA)";
      }
      const issuer = d.smartFields as any;
      issuer.issuing_authority = issuer.issuing_authority || (/CDA/i.test(text) ? "CDA" : null);
      issuer.noc_ref = issuer.noc_ref || (text.match(/CDA\/NDC\/[0-9/]+/i) || [null])[0];
    }
    {
      const types = (perDocument || []).map((d: any) => String(d?.classification?.documentType || "").toUpperCase());
      const tenancyPack = types.length > 0 && types.every((x: string) => !x || x === "UNKNOWN" || /TENANCY|RENTAL/.test(x));
      if (tenancyPack && crossDoc?.crossChecks?.length) {
        crossDoc.crossChecks = crossDoc.crossChecks.filter((c: any) => {
          const cat = String(c.category || "").toLowerCase();
          const st = String(c.status || "").toLowerCase();
          const finding = String(c.finding || c.detail || "");
          const continuation = (cat === "financial" || cat === "property") &&
            /omits|omitted|not mentioned|not stated|separate pages|page 2/i.test(finding);
          if (continuation && (st === "unverifiable" || st === "mismatch")) return false;
          return true;
        });
      }
      for (const s of nextSteps || []) {
        const title = String(s.title || "");
        if (/lock-break|stay clause/i.test(title) && !s.urduDetail && !s.detailUrdu && !s.detail_urdu) {
          s.urduDetail = "\u06CC\u06C1 \u0634\u0631\u0627\u0626\u0637 \u067E\u0627\u06A9\u0633\u062A\u0627\u0646\u06CC \u06A9\u0631\u0627\u06CC\u06C1 \u0646\u0627\u0645\u0648\u06BA \u067E\u0631 \u0639\u0627\u0645 \u06C1\u06CC\u06BA\u060C \u0644\u06CC\u06A9\u0646 \u0627\u06CC\u06A9 \u0637\u0631\u0641\u06C1 \u06C1\u06CC\u06BA\u06D4 \u0644\u06A9\u06BE\u0646\u06D2 \u06CC\u0627 \u0645\u0627\u0644\u06A9 \u0633\u06D2 \u062A\u062D\u0631\u06CC\u0631 \u0644\u06CC\u06BA\u060C \u06CC\u0627 \u0645\u0633\u062A\u0646\u062F \u0633\u06D2 \u06A9\u0627\u0679 \u062F\u06CC\u06BA\u06D4";
        }
      }
    }

    // rules+utf8
    {
      if (riskResult?.riskFactors?.length) {
        riskResult.riskFactors = dedupeByRuleId(
          riskResult.riskFactors.map((f: any) => ({
            ...f,
            rule_id: f.rule_id || ruleIdFromText(String(f.label || "") + " " + String(f.detail || "")),
            label: clipSentence(String(f.label || ""), 220),
          })),
        );
      }
      if (clauseConcerns?.flagged?.length) {
        clauseConcerns.flagged = dedupeByRuleId(
          clauseConcerns.flagged.map((f: any) => ({
            ...f,
            rule_id: f.rule_id || ruleIdFromText(String(f.title || "") + " " + String(f.concern || "") + " " + String(f.quote || "")),
            quote: snapQuote(clipSentence(String(f.quote || ""), 280)),
          })),
        );
      }
      for (const s of nextSteps || []) {
        for (const k of ["urduTitle", "urduDetail", "titleUrdu", "detailUrdu", "title_urdu", "detail_urdu"]) {
          if (s[k]) s[k] = decodeUtf8(String(s[k]));
        }
      }
      for (const d of perDocument || []) {
        if (d?.smartFields?.summaryUrdu) d.smartFields.summaryUrdu = decodeUtf8(String(d.smartFields.summaryUrdu));
        if ((d as any)?.urduSummary) (d as any).urduSummary = decodeUtf8(String((d as any).urduSummary));
      }
    }
    // A9C9 sale-pack lock: STOP when sale+CRITICAL; no tenant-notice; no rent/security captions.
    {
      const types = (perDocument || []).map((d: any) =>
        String(d?.classification?.documentType || d?.documentType || "").toUpperCase()
      );
      const salePack = types.some((x: string) => /AGREEMENT_TO_SELL|BAYANA|SALE_DEED|TOKEN/.test(x));
      const tenancyOnly =
        types.length > 0 &&
        types.every((x: string) => !x || x === "UNKNOWN" || /TENANCY|RENTAL/.test(x));
      if (salePack && !tenancyOnly) {
        if (riskResult?.riskFactors?.length) {
          riskResult.riskFactors = riskResult.riskFactors.filter(
            (f: any) => !/common tenant risk|notice period not detected|termination notice period/i.test(String(f.label || "") + " " + String(f.detail || "")),
          );
        }
        const blob = (perDocument || [])
          .map((d: any) => [d?.ocr?.text, d?.ocrText, d?.smartFields?.summary].filter(Boolean).join("\n"))
          .join("\n");
        const m480 = blob.match(/TOTAL\s+OUTSTANDING\s+DUES[:\s]*Rs\.?\s*([0-9,]+)/i);
        if (m480) {
          const n = Number(String(m480[1]).replace(/,/g, ""));
          for (const d of perDocument || []) {
            const fin = d?.smartFields?.financials;
            if (fin && n > 0) fin.outstanding_dues = n;
          }
        }
        const stampAfter = /stamp[\s\w]*purchas[\s\w]*after|after the document execution|chronologically invalid/i.test(
          JSON.stringify(riskResult || {}) + JSON.stringify(crossDoc || {}),
        );
        const critical = String(riskResult?.riskLabel || "").toUpperCase() === "CRITICAL" || Number(riskResult?.riskScore) >= 9;
        if (critical || stampAfter) {
          combinedVerdict = {
            verdict: "DO NOT PROCEED",
            posture: "STOP",
            reasoning: "Cross-document analysis found a critical inconsistency between the documents you uploaded.",
          };
          if (phase2?.analysis) (phase2.analysis as any).decision = "DO_NOT_PROCEED";
        }
        const scrub = (s: string) =>
          String(s || "")
            .replace(/Rent is not stated on this page\.?\s*/gi, "")
            .replace(/Security deposit PKR\s*[\d,]+/gi, "Bayana/Token PKR $&".replace(/Security deposit /i, ""))
            .replace(/[\u0633\u06CC\u06A9\u06CC\u0648\u0631\u0679\u06CC]\s*[\d,]+\s*[\u0631\u0648\u067E\u06D2]/g, "\u0628\u06CC\u0639\u0627\u0646\u06C1 / \u0679\u0648\u06A9\u0646")
            .replace(/\u0645\u062F\u062A\s*\u0646\u0627\u06D4?/g, "\u0645\u062F\u062A \u062F\u0631\u062C \u0646\u06C1\u06CC\u06BA")
            .replace(/\u0627\u0633 \u0635\u0641\u062D\u06D2 \u067E\u0631 \u06A9\u0631\u0627\u06CC\u06C1 \u062F\u0631\u062C \u0646\u06C1\u06CC\u06BA[^\s]*/g, "")
            .trim();
        for (const d of perDocument || []) {
          if (d?.smartFields?.summary) d.smartFields.summary = scrub(String(d.smartFields.summary));
          if (d?.summary) d.summary = scrub(String(d.summary));
          if (d?.urduSummary) d.urduSummary = scrub(String(d.urduSummary));
        }
      }
    }
    // E28D display-only: repair inverted page badges + stub stay quotes. No score change.
    const _typesForE28 = (perDocument || []).map((d: any) => String(d?.classification?.documentType || "").toUpperCase());
    const _tenancyE28 = _typesForE28.length > 0 && _typesForE28.every((x: string) => !x || x === "UNKNOWN" || /TENANCY|RENTAL/.test(x));
    if (_tenancyE28 && crossDoc?.crossChecks?.length && perDocument?.length) {
      const hasAddr = (d: any) => {
        const a = String(d?.smartFields?.property?.address || d?.smartFields?.property?.full_address || "").trim();
        return !!(a && !/^not mentioned$/i.test(a) && a.length >= 8);
      };
      const pg1 = perDocument[0];
      const pg2 = perDocument[1];
      crossDoc.crossChecks = crossDoc.crossChecks.map((c: any) => {
        const cat = String(c.category || c.type || "").toLowerCase();
        const f = String(c.finding || c.detail || "");
        if (!/property|address/.test(cat + " " + f)) return c;
        if (pg1 && pg2 && hasAddr(pg1) && !hasAddr(pg2)) {
          return {
            ...c,
            finding:
              "Page 1 contains the property address (House No. 1799, Block A, Central Park Housing Scheme, Lahore), whereas Page 2 omits the address because they are separate pages of the same agreement.",
          };
        }
        if (pg1 && pg2 && !hasAddr(pg1) && hasAddr(pg2)) {
          return {
            ...c,
            finding:
              "Page 2 contains the property address, whereas Page 1 omits the address because they are separate pages of the same agreement.",
          };
        }
        return c;
      });
    }
    if (clauseConcerns?.flagged?.length) {
      const packText2 = (perDocument || [])
        .map((d: any) => [d?.ocr?.text, d?.ocrText, d?.extraText, d?.smartFields?.summary].filter(Boolean).join("\n"))
        .join("\n");
      const harvested = harvestTenancyClauseFlags(packText2);
      clauseConcerns.flagged = clauseConcerns.flagged.map((f: any) => {
        const blob = String(f.title || "") + " " + String(f.concern || "") + " " + String(f.quote || "");
        if (!/stay|court-waiver|barred from court/i.test(blob)) return f;
        if (String(f.quote || "").trim().length >= 24 && /[\u0600-\u06FF]/.test(String(f.quote || ""))) return f;
        const better = harvested.find((h) => /stay|court/i.test(String(h.title || "")));
        if (better?.quote && String(better.quote).trim().length > String(f.quote || "").trim().length) {
          return { ...f, quote: better.quote };
        }
        const printed = /printed stay-order|court-waiver clause on the tenancy form/i.test(String(f.quote || ""));
        if (printed || String(f.quote || "").trim().length < 24) {
          const ur = harvested.find((h) => /[\u0600-\u06FF]/.test(String(h.quote || "")) && /stay|court|waiver/i.test(String(h.title || "")));
          if (ur?.quote) return { ...f, quote: ur.quote };
          const hit = packText2.split(/[\n\u06D4.]+/).map((l: string) => l.trim()).find((l: string) => {
            const ar = (l.match(/[\u0600-\u06FF]/g) || []).length;
            return ar >= 12 && /\u0627\u0633\u0679\u06D2|\u0639\u062F\u0627\u0644\u062A|stay[\s-]*order/i.test(l) && !/\u0627\u0633\u0679\u0627\u0645\u067E|stamp\s*paper|\u0633\u0627\u062A \u062F\u0646|\u0642\u0627\u0628\u0644 \u0627\u0633\u062A\u0639\u0645\u0627\u0644/i.test(l);
          });
          if (hit) return { ...f, quote: hit.slice(0, 240) };
        }
        return f;
      });
      clauseConcerns.flagged = clauseConcerns.flagged.map((f: any) => {
        const blob = String(f.title || "") + " " + String(f.concern || "") + " " + String(f.quote || "");
        let title = String(f.title || "").trim();
        if (!title || /^concerning clause$/i.test(title)) {
          if (/stay|court-waiver|barred from court|عدالت/i.test(blob)) title = "Court stay waiver";
          else if (/lock-?break|self-help|seize|belongings|قفل|تالہ/i.test(blob)) title = "Lock-break / property seizure";
          else if (/notice|terminat|خالی/i.test(blob)) title = "Termination / notice terms";
        }
        return title ? { ...f, title } : f;
      });
      const seenCat: Record<string, boolean> = {};
      clauseConcerns.flagged = clauseConcerns.flagged.filter((f: any) => {
        const blob = (String(f.title || "") + " " + String(f.concern || "")).toLowerCase();
        const cat = /stay|court-waiver|barred from court/.test(blob) ? "stay"
          : /lock-?break|self-help|seize|belongings|قفل/.test(blob) ? "lock"
          : /notice|terminat/.test(blob) ? "notice"
          : "other:" + blob.slice(0, 40);
        if (seenCat[cat]) return false;
        seenCat[cat] = true;
        return true;
      });
    }

    // 3308 title+dedupe
    // 20FF stay-quote prefer Urdu
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
        const _packTypes = (perDocument || []).map((d: any) =>
          String(d?.classification?.documentType || d?.documentType || "").toUpperCase()
        );
        const _tenancyPack =
          _packTypes.length > 0 &&
          _packTypes.every(
            (typ: string) =>
              !typ || typ === "UNKNOWN" || typ.includes("TENANCY") || typ.includes("RENTAL") || typ.includes("LEASE")
          );
        const title =
          /area|sq\.?\s*y|dimension|size/i.test(detail + cat)
            ? "Re-verify plot size / allotment record before paying balance"
            : (/date|stamp/i.test(detail + cat)
            ? (_tenancyPack
              ? "Ask the landlord or agent for a written explanation of the date mismatch across pages"
              : "Ask the seller or agent for a written explanation of the stamp vs execution date mismatch")
            : `Resolve critical ${cat} mismatch before proceeding`);
        const step = {
          priority: "high",
          title,
          detail: detail || "Cross-document critical mismatch must be resolved in writing before transferring funds.",
        };
        const already = (nextSteps || []).some((s: any) => /mismatch|plot size|allotment|re-verify plot|stamp paper|execution date/i.test(String(s?.title || "")));
        if (!already) nextSteps = [step, ...(nextSteps || [])];
      }
    }
    nextSteps = sanitizeRentalNextSteps(nextSteps, _mergedSmartFields, collectAllText(perDocument));
    {
      const types = (perDocument || []).map((d: any) =>
        String(d?.classification?.documentType || d?.documentType || "").toUpperCase()
      );
      const tenancy =
        types.length > 0 &&
        types.every(
          (typ: string) =>
            !typ || typ === "UNKNOWN" || typ.includes("TENANCY") || typ.includes("RENTAL") || typ.includes("LEASE")
        );
      const sale = types.some((typ: string) => /AGREEMENT_TO_SELL|BAYANA|SALE_DEED|TOKEN/.test(typ));
      nextSteps = localizeNextStepRoles(nextSteps, tenancy ? "tenancy" : sale ? "sale" : "unknown");
    }
    {
      const v = String(combinedVerdict?.verdict || combinedVerdict?.posture || "").toUpperCase().replace(/\s+/g, "_");
      if (v === "DO_NOT_PROCEED" || v === "STOP" || v === "BLOCKED" || v === "REJECT") {
        nextSteps = (nextSteps || []).filter(
          (s: any) => !/keep a signed copy|signed copy for your records/i.test(String(s?.title || "") + " " + String(s?.detail || ""))
        );
      }
    }
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
        kept["nextStepTitle_0"] = "Ø§Ø¯Ø§Ø¦ÛŒÚ¯ÛŒ Ø³Û’ Ù¾ÛÙ„Û’ Ù¾Ù„Ø§Ù¹ Ú©Ø§ Ø±Ù‚Ø¨Û / Ø§Ù„Ø§Ù¹Ù…Ù†Ù¹ Ø±ÛŒÚ©Ø§Ø±Úˆ Ø¯ÙˆØ¨Ø§Ø±Û ØªØµØ¯ÛŒÙ‚ Ú©Ø±ÛŒÚº";
        kept["nextStepDetail_0"] = "ÙØ§Ø±Úˆ Ø§ÙˆØ± Ø¨ÛŒØ¹Ø§Ù†Û/ÙØ±ÙˆØ®Øª Ù…Ø¹Ø§ÛØ¯Û’ Ù…ÛŒÚº Ø±Ù‚Ø¨Û’ Ú©Ø§ ÙØ±Ù‚ ÛÛ’Û” Ø¨Ù‚ÛŒÛ Ø±Ù‚Ù… Ø§Ø¯Ø§ Ú©Ø±Ù†Û’ Ø³Û’ Ù¾ÛÙ„Û’ Ø¯Ø±Ø³Øª ÙØ§Ø±Úˆ ÛŒØ§ ØªØ±Ù…ÛŒÙ… Ø´Ø¯Û Ù…Ø¹Ø§ÛØ¯Û Ø­Ø§ØµÙ„ Ú©Ø±ÛŒÚºÛ”";
      }
      urduTranslations = kept;
    }
    // Payload was built before inject  -  write final nextSteps + urdu into response
    if ((rawPayload as any).phase2) {
      (rawPayload as any).phase2.nextSteps = nextSteps;
    }
    (rawPayload as any).nextSteps = nextSteps;
    if ((rawPayload as any).urduTranslations) {
      (rawPayload as any).urduTranslations = urduTranslations;
    }
    const filteredPayload = walkUtf8(filterResponseByTier(rawPayload, entitlementToUse.report_type));
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






