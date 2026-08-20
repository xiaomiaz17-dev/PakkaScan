"use client";


import { PdfHashVerifier } from "@/components/PdfHashVerifier";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Fraunces } from "next/font/google";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import Link from "next/link";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
});

type VerifyResult =
  | { status: "loading" }
  | {
      status: "found";
      referenceCode: string;
      reportType: string;
      scannedAt: string;
      riskScore?: number | null;
      riskLabel?: string | null;
      scoreBreakdown?: string | null;
      verdict?: string | null;
      pakkaScore?: number | null;
      chainOfTitle?: any;
      hasPdfHash?: boolean;
    }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "error" }
  | { status: "sample" };

function formatReportType(rt: string): string {
  const map: Record<string, string> = {
    rental: "Rental Verification",
    bayana: "Bayana Agreement Check",
    full_dd: "Full Due Diligence",
  };
  return map[rt?.toLowerCase()] || "Property Document Report";
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function VerifyResultPage() {
  const params = useParams<{ reference: string }>();
  const reference = (params?.reference || "").toString();
  const [result, setResult] = useState<VerifyResult>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      // Short-circuit for demo/sample reference
      if (reference === "PKS-SAMPLE-2026-DEMO") {
        setResult({ status: "sample" });
        return;
      }
      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(reference)}`, {
          cache: "no-store",
        });
        if (cancelled) return;

        if (res.status === 400) {
          setResult({ status: "invalid" });
          return;
        }
        if (res.status === 404) {
          setResult({ status: "not_found" });
          return;
        }
        if (!res.ok) {
          setResult({ status: "error" });
          return;
        }
        const data = await res.json();
        if (data?.found) {
          setResult({
            status: "found",
            referenceCode: data.referenceCode,
            reportType: data.reportType,
            scannedAt: data.scannedAt,
            riskScore: data.riskScore ?? null,
            riskLabel: data.riskLabel ?? null,
            scoreBreakdown: data.scoreBreakdown ?? null,
            verdict: data.verdict ?? null,
            pakkaScore: data.pakkaScore ?? null,
            chainOfTitle: data.chainOfTitle ?? null,
            hasPdfHash: data.hasPdfHash ?? false,
          });
        } else {
          setResult({ status: "not_found" });
        }
      } catch {
        if (!cancelled) setResult({ status: "error" });
      }
    }
    run();
    return () => { cancelled = true; };
  }, [reference]);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#faf8f5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem",
    }}>
      <div style={{
        maxWidth: 560,
        width: "100%",
        background: "white",
        borderRadius: 16,
        padding: "2.5rem 2rem",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <a href="/verify" style={{
            display: "inline-block",
            fontSize: 14,
            color: "#6b7280",
            textDecoration: "none",
            marginBottom: "1rem",
          }}>
            &larr; Verify another report
          </a>
        </div>

        {result.status === "loading" && (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "#6b7280" }}>
            Checking reference...
          </div>
        )}

        {result.status === "found" && (
          <>
            <div style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 12,
              padding: "1.25rem",
              textAlign: "center",
              marginBottom: "1.5rem",
            }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>&#10003;</div>
              <div className={fraunces.className} style={{
                fontSize: "1.35rem",
                fontWeight: 900,
                color: "#065f46",
                margin: 0,
              }}>
                Authentic PakkaScan Report
              </div>
              <div style={{ fontSize: 13, color: "#047857", marginTop: 4 }}>
                This reference was issued by PakkaScan.
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <MetaRow label="Reference Code" value={result.referenceCode} mono />
              <MetaRow label="Report Type" value={formatReportType(result.reportType)} />
              <MetaRow label="Issued On" value={formatDate(result.scannedAt)} />
              {result.verdict && (
                <MetaRow label="Verdict" value={String(result.verdict).replace(/_/g, " ")} />
              )}
              {result.pakkaScore != null && (
                <MetaRow label="PakkaScore" value={`${result.pakkaScore}/100`} />
              )}
            </div>

            {result.riskScore != null && result.riskLabel && (
              <div style={{
                marginTop: "1.25rem",
                padding: "1rem",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: result.riskLabel === "LOW" ? "#ecfdf5" : result.riskLabel === "CRITICAL" ? "#fef2f2" : result.riskLabel === "HIGH" ? "#fff7ed" : "#fefce8",
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", marginBottom: 6 }}>
                  TRANSACTION RISK SCORE
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>
                  {result.riskScore}<span style={{ fontSize: 14, opacity: 0.7 }}>/10</span>
                  <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 800 }}>{result.riskLabel} RISK</span>
                </div>
                {result.scoreBreakdown && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{result.scoreBreakdown}</div>
                )}
              </div>
            )}

            {result.chainOfTitle?.timeline?.length > 0 && (
              <div style={{ marginTop: "1.25rem", padding: "1rem", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>
                  OWNERSHIP TIMELINE
                  {result.chainOfTitle.isComplete ? " Â· COMPLETE" : " Â· GAPS DETECTED"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.chainOfTitle.timeline.map((ev: any, i: number) => (
                    <div key={i} style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      fontSize: 12,
                      minWidth: 100,
                    }}>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{ev.eventType}</div>
                      <div style={{ color: "#64748b" }}>{ev.date || "Undated"}</div>
                      <div style={{ color: "#334155", marginTop: 2 }}>
                        {ev.transferee?.canonicalName || ev.transferor?.canonicalName || "â€”"}
                      </div>
                    </div>
                  ))}
                </div>
                {(result.chainOfTitle.gaps?.length > 0 || result.chainOfTitle.conflicts?.length > 0) && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#7f1d1d" }}>
                    {[...(result.chainOfTitle.gaps || []), ...(result.chainOfTitle.conflicts || [])]
                      .slice(0, 3)
                      .map((g: any, i: number) => (
                        <div key={i} style={{ marginBottom: 4 }}>
                          <strong>{g.severity || "FLAG"}</strong> â€” {g.message}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16, width: "100%", maxWidth: 420 }}>
              <PdfHashVerifier
                referenceCode={result.referenceCode}
                hasPdfHash={Boolean((result as any).hasPdfHash)}
              />
            </div>
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/verify/${result.referenceCode}` : `https://www.pakkascan.com/verify/${result.referenceCode}`)}`}
                alt="QR code to verify this report"
                width={180}
                height={180}
                style={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <div style={{ fontSize: 12, color: "#6b7280" }}>Scan to verify</div>
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "center" }}>
              <WhatsAppShareButton
                variant="verify"
                referenceCode={result.referenceCode}
                verifyUrl={typeof window !== "undefined" ? `${window.location.origin}/verify/${result.referenceCode}` : `https://www.pakkascan.com/verify/${result.referenceCode}`}
              />
            </div>

            <div style={{
              marginTop: "1.75rem",
              padding: "0.85rem 1rem",
              background: "#f9fafb",
              borderRadius: 10,
              fontSize: 12,
              color: "#6b7280",
              lineHeight: 1.5,
            }}>
              <strong style={{ color: "#374151" }}>Privacy note:</strong> For the
              protection of the original requester, document contents are never
              shown on this page. Only the report holder has access to full details.
            </div>
          </>
        )}

        {result.status === "sample" && (
          <div style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 12,
            padding: "1.5rem",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>&#128196;</div>
            <div className={fraunces.className} style={{
              fontSize: "1.25rem",
              fontWeight: 900,
              color: "#1e3a8a",
              margin: "0 0 0.5rem 0",
            }}>
              Sample Reference
            </div>
            <div style={{ fontSize: 13, color: "#1e40af", marginBottom: "1rem", lineHeight: 1.5 }}>
              <code>PKS-SAMPLE-2026-DEMO</code> is a demonstration reference used on our sample report page. It does not correspond to a real scan.
            </div>
            <Link href="/sample-report" style={{
              display: "inline-block",
              padding: "10px 20px",
              backgroundColor: "#0b132b",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 8,
              textDecoration: "none",
            }}>
              See the sample report &rarr;
            </Link>
          </div>
        )}

        {result.status === "not_found" && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "1.5rem",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>&#10007;</div>
            <div className={fraunces.className} style={{
              fontSize: "1.25rem",
              fontWeight: 900,
              color: "#991b1b",
              margin: "0 0 0.5rem 0",
            }}>
              Reference Not Found
            </div>
            <div style={{ fontSize: 13, color: "#7f1d1d", marginBottom: "1rem" }}>
              <code>{reference}</code> does not match any PakkaScan report.
            </div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Double-check the code, or contact{" "}
              <a href="mailto:support@pakkascan.com" style={{ color: "#059669" }}>
                support@pakkascan.com
              </a>
            </div>
          </div>
        )}

        {result.status === "invalid" && (
          <div style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: "1.5rem",
            textAlign: "center",
          }}>
            <div className={fraunces.className} style={{
              fontSize: "1.15rem",
              fontWeight: 900,
              color: "#92400e",
              marginBottom: 6,
            }}>
              Invalid Reference Format
            </div>
            <div style={{ fontSize: 13, color: "#78350f" }}>
              Expected format: <code>PKS-YYYY-MM-XXXX</code>
            </div>
          </div>
        )}

        {result.status === "error" && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "1.5rem",
            textAlign: "center",
            color: "#991b1b",
          }}>
            Something went wrong. Please try again in a moment.
          </div>
        )}
      </div>
    </main>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.75rem 1rem",
      background: "#f9fafb",
      borderRadius: 8,
      gap: 12,
    }}>
      <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 14,
        color: "#111827",
        fontWeight: 600,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
        letterSpacing: mono ? "0.03em" : "normal",
        textAlign: "right",
      }}>
        {value}
      </span>
    </div>
  );
}




