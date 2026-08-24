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
        } catch {
          /* ignore */
        }
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
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: mono ? "ui-monospace, monospace" : "inherit",
            wordBreak: "break-all",
          }}
        >
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

  const [email, setEmail] = useState("");
  const [paidHint, setPaidHint] = useState(false);

  const payRef = useMemo(() => {
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PKS-${tier.reportType.toUpperCase()}-${r}`;
  }, [tier.reportType]);

  const emailOk = email.trim().includes("@");
  const waText = encodeURIComponent(
    [
      "PakkaScan payment proof",
      `Email: ${email.trim().toLowerCase() || "(add login email)"}`,
      `Tier: ${tier.label}`,
      `Amount: Rs ${tier.pricePkr}`,
      `Pay ref: ${payRef}`,
      "Screenshot / Txn ID: (attach)",
    ].join("\n")
  );

  return (
    <main
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "32px 20px 64px",
        fontFamily: "system-ui, sans-serif",
        color: "#0f172a",
      }}
    >
      <Link href="/#pricing" style={{ color: "#64748b", fontSize: 14 }}>
        ← Back to pricing
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "16px 0 8px" }}>Pay with Raast / JazzCash</h1>
      <p style={{ color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
        Three steps: pay the exact amount → send proof → we unlock <Link href="/scan">/scan</Link> on the same email.
      </p>

      <div
        style={{
          background: "#f0fdfa",
          border: "1px solid #99f6e4",
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 20,
          fontSize: 13,
          lineHeight: 1.55,
          color: "#115e59",
        }}
      >
        <strong>Usually unlocked within 15–30 minutes</strong> during business hours after a clear WhatsApp (email + screenshot).
        Sign in once at{" "}
        <Link href="/login" style={{ color: "#0f766e", fontWeight: 700 }}>
          /login
        </Link>{" "}
        with the same email before or after paying.
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20, background: "#f8fafc" }}>
        <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>You are buying</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{tier.label}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#16a34a", marginTop: 8 }}>
          Rs {tier.pricePkr.toLocaleString("en-PK")}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          Put this in transfer notes if you can:{" "}
          <code style={{ fontWeight: 700, marginLeft: 4 }}>{payRef}</code>
          <CopyBtn text={payRef} />
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>1. Payment details</div>
        {accountTitle ? <Row label="Account title" value={accountTitle} /> : null}
        <Row label="Bank" value={bankName} />
        {iban ? (
          <Row label="IBAN" value={iban} mono />
        ) : (
          <p style={{ fontSize: 13, color: "#b45309" }}>IBAN missing — check Vercel env.</p>
        )}
        {raastId ? <Row label="Raast ID" value={raastId} mono /> : null}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Payment QR"
            width={200}
            height={200}
            style={{ maxWidth: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }}
          />
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>Pay in JazzCash / any Raast bank app</div>
        </div>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>2. Your login email</div>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>
          Must match the email you use to sign in. We unlock this account only.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          autoComplete="email"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 15,
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>3. Send proof</div>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px", lineHeight: 1.45 }}>
          After you pay, open WhatsApp. The message is filled in — attach the screenshot and send.
        </p>
        <a
          href={emailOk ? `https://wa.me/${wa}?text=${waText}` : undefined}
          onClick={(e) => {
            if (!emailOk) {
              e.preventDefault();
              alert("Enter the same email you use to sign in on PakkaScan.");
              return;
            }
            setPaidHint(true);
          }}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            padding: "14px 20px",
            background: emailOk ? "#25D366" : "#94a3b8",
            color: "#fff",
            fontWeight: 800,
            borderRadius: 10,
            textDecoration: "none",
            marginBottom: 8,
            cursor: emailOk ? "pointer" : "not-allowed",
          }}
        >
          I&apos;ve paid — send proof on WhatsApp
        </a>
        {paidHint && (
          <p style={{ fontSize: 13, color: "#0f766e", margin: "8px 0 0", lineHeight: 1.45 }}>
            Sent? We&apos;ll unlock after we confirm the transfer. Then open{" "}
            <Link href="/scan" style={{ fontWeight: 700 }}>
              /scan
            </Link>
            .
          </p>
        )}
      </div>

      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
        Overseas: Pay with Card on pricing. Advisory due diligence — not legal advice.{" "}
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
