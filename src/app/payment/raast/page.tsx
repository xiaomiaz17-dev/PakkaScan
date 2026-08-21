"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const TIERS: Record<string, { label: string; pricePkr: number; reportType: string }> = {
  rental: { label: "Rental Safety Check", pricePkr: 499, reportType: "rental" },
  bayana: { label: "Bayana Safety Check", pricePkr: 1499, reportType: "bayana" },
  full_dd: { label: "Full Property Due Diligence", pricePkr: 2999, reportType: "full_dd" },
};

function RaastInner() {
  const params = useSearchParams();
  const tierKey = (params.get("tier") || "bayana").toLowerCase();
  const tier = TIERS[tierKey] || TIERS.bayana;

  const bankName = process.env.NEXT_PUBLIC_PAY_BANK_NAME || "JazzCash / Raast";
  const accountTitle = process.env.NEXT_PUBLIC_PAY_ACCOUNT_TITLE || "";
  const iban = process.env.NEXT_PUBLIC_PAY_IBAN || "";
  const raastId = process.env.NEXT_PUBLIC_PAY_RAAST_ID || "";
  const qrUrl = process.env.NEXT_PUBLIC_PAY_QR_URL || "/pay/raast-qr.png";
  const wa = process.env.NEXT_PUBLIC_PAY_WHATSAPP || "923156507067";

  const payRef = useMemo(() => {
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PKS-${tier.reportType.toUpperCase()}-${r}`;
  }, [tier.reportType]);

  const waText = encodeURIComponent(
    `Hi PakkaScan, I paid via Raast/bank.\nTier: ${tier.label}\nAmount: Rs ${tier.pricePkr}\nPayment ref: ${payRef}\nMy login email: \nTxn ID / screenshot: (attach)`
  );

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#0f172a" }}>
      <Link href="/#pricing" style={{ color: "#64748b", fontSize: 14 }}>
        ← Back to pricing
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "16px 0 8px" }}>
        Pay with Raast / bank transfer
      </h1>
      <p style={{ color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>
        Pay the amount below, then send proof on WhatsApp with your login email. We unlock your scan after confirmation.
      </p>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20, background: "#f8fafc" }}>
        <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>You are buying</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{tier.label}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#16a34a", marginTop: 8 }}>
          Rs {tier.pricePkr.toLocaleString("en-PK")}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
          Reference (optional note on transfer): <code style={{ fontWeight: 700 }}>{payRef}</code>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Payment details</div>
        {accountTitle ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>ACCOUNT TITLE</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{accountTitle}</div>
          </div>
        ) : null}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>BANK</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{bankName}</div>
        </div>
        {iban ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>IBAN</div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace", wordBreak: "break-all" }}>{iban}</div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#b45309" }}>IBAN will appear here after env is configured on Vercel.</p>
        )}
        {raastId ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>RAAST ID</div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{raastId}</div>
          </div>
        ) : null}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <img
            src={qrUrl}
            alt="Payment page QR"
            width={200}
            height={200}
            style={{ maxWidth: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }}
          />
        </div>
      </div>

      <ol style={{ margin: "0 0 24px", paddingLeft: 20, color: "#334155", lineHeight: 1.6, fontSize: 14 }}>
        <li>Pay exactly <strong>Rs {tier.pricePkr.toLocaleString("en-PK")}</strong> via Raast / JazzCash / bank.</li>
        <li>WhatsApp your <strong>login email</strong>, amount, and screenshot.</li>
        <li>After we confirm, open <Link href="/scan">/scan</Link>.</li>
      </ol>

      <a
        href={`https://wa.me/${wa}?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          padding: "14px 20px",
          background: "#25D366",
          color: "#fff",
          fontWeight: 800,
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        Send payment proof on WhatsApp
      </a>
    </main>
  );
}

export default function RaastPaymentPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
      <RaastInner />
    </Suspense>
  );
}
