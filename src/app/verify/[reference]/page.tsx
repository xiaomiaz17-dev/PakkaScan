"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Fraunces } from "next/font/google";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
});

type VerifyResult =
  | { status: "loading" }
  | { status: "found"; referenceCode: string; reportType: string; scannedAt: string }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "error" };

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