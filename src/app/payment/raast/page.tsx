"use client";

import { useMemo, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const TIERS: Record<string, { label: string; pricePkr: number; reportType: string }> = {
  rental: { label: "Rental Safety Check", pricePkr: 499, reportType: "rental" },
  bayana: { label: "Bayana Safety Check", pricePkr: 1499, reportType: "bayana" },
  full_dd: { label: "Full Property Due Diligence", pricePkr: 2999, reportType: "full_dd" },
};

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch { /* ignore */ }
      }}
      style={{
        marginLeft: 8,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 6,
        border: "1px solid #cbd5e1",
        background: done ? "#dcfce7" : "#f8fafc",
        color: done ? "#166534" : "#334155",
        cursor: "pointer",
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600, fontFamily: mono ? "ui-monospace, monospace" : "inherit", wordBreak: "break-all" }}>
          {value}
        </span>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

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
      <p style={{ color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
        Pay the exact amount below, then WhatsApp proof with your <strong>login email</strong>.
        We unlock your scan after we confirm the transfer.
      </p>

      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 20, fontSize: 13, lineHeight: 1.5, color: "#1e3a8a" }}>
        <strong>Unlock timing:</strong> During business hours we usually unlock within a few hours of a clear WhatsApp proof.
        Outside those hours it may be next morning. You must be signed in with the same email before we can grant the scan.
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20, background: "#f8fafc" }}>
        <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>You are buying</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{tier.label}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#16a34a", marginTop: 8 }}>
          Rs {tier.pricePkr.toLocaleString("en-PK")}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          Reference (optional on transfer):{" "}
          <code style={{ fontWeight: 700, marginLeft: 4 }}>{payRef}</code>
          <CopyBtn text={payRef} />
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Payment details</div>
        {accountTitle ? <Row label="Account title" value={accountTitle} /> : null}
        <Row label="Bank" value={bankName} />
        {iban ? <Row label="IBAN" value={iban} mono /> : (
          <p style={{ fontSize: 13, color: "#b45309" }}>IBAN missing — check Vercel env.</p>
        )}
        {raastId ? <Row label="Raast ID" value={raastId} mono /> : null}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <img src={qrUrl} alt="Payment QR" width={200} height={200}
            style={{ maxWidth: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }} />
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>QR opens this payment page</div>
        </div>
      </div>

      <ol style={{ margin: "0 0 24px", paddingLeft: 20, color: "#334155", lineHeight: 1.65, fontSize: 14 }}>
        <li>Pay exactly <strong>Rs {tier.pricePkr.toLocaleString("en-PK")}</strong>.</li>
        <li>WhatsApp your <strong>login email</strong>, amount, and screenshot / Txn ID.</li>
        <li>After we confirm, open <Link href="/scan">/scan</Link> (same email).</li>
      </ol>

      <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noopener noreferrer"
        style={{ display: "block", textAlign: "center", padding: "14px 20px", background: "#25D366", color: "#fff", fontWeight: 800, borderRadius: 10, textDecoration: "none", marginBottom: 12 }}>
        Send payment proof on WhatsApp
      </a>
      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
        Overseas customers: use Pay with Card on pricing. Reports are advisory due diligence — not legal advice.{" "}
        <Link href="/limitations">Limitations</Link>.
      </p>
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
