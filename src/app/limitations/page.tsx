import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Limitations | PakkaScan",
  description: "What PakkaScan does and does not do — advisory property document analysis for Pakistan.",
};

export default function LimitationsPage() {
  const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "system-ui, sans-serif", color: "#0f172a", lineHeight: 1.6 };
  const h1: React.CSSProperties = { fontSize: 28, fontWeight: 800, marginBottom: 12 };
  const h2: React.CSSProperties = { fontSize: 18, fontWeight: 800, marginTop: 28, marginBottom: 8 };
  const p: React.CSSProperties = { margin: "0 0 12px", color: "#334155", fontSize: 15 };
  const li: React.CSSProperties = { marginBottom: 8, color: "#334155", fontSize: 15 };

  return (
    <main style={wrap}>
      <Link href="/" style={{ color: "#64748b", fontSize: 14 }}>← Home</Link>
      <h1 style={h1}>Limitations</h1>
      <p style={p}>
        PakkaScan is an <strong>advisory</strong> AI document analysis tool for Pakistani property and tenancy paperwork.
        It is not a law firm, not a substitute for a licensed lawyer, and not a government verification service.
      </p>

      <h2 style={h2}>What we do</h2>
      <ul>
        <li style={li}>Read uploaded documents (OCR + structured extraction) in English and Urdu where possible.</li>
        <li style={li}>Flag inconsistencies, missing protections, and risk factors we can see in the text.</li>
        <li style={li}>Apply rules such as CNIC format checks, date logic, and (where data exists) FBR-related valuation context.</li>
        <li style={li}>Issue a reference code, optional PDF passport, and hash-based integrity checks.</li>
      </ul>

      <h2 style={h2}>What we do not do</h2>
      <ul>
        <li style={li}>We do not guarantee a deal is safe, legal, or free of fraud.</li>
        <li style={li}>We do not replace registry search, physical site visit, or independent legal advice.</li>
        <li style={li}>We do not invent official rates or district data when we cannot verify them — unknown stays unknown.</li>
        <li style={li}>We cannot see documents you did not upload, or off-record side agreements.</li>
        <li style={li}>Poor scans, handwriting, and incomplete files reduce what we can confirm.</li>
      </ul>

      <h2 style={h2}>Verdicts</h2>
      <p style={p}>
        Labels such as Proceed, Proceed with Caution, or Do Not Proceed are <strong>decision aids</strong> based on
        evidence in your packet and our rules. Critical risk is escalated deliberately; absence of a flag is not a certificate of clear title.
      </p>

      <h2 style={h2}>Payments & access</h2>
      <p style={p}>
        Pakistan customers may pay via Raast / bank transfer; international customers via card.
        Scan credits are unlocked after payment is confirmed (card automatically; Raast after WhatsApp proof).
      </p>

      <h2 style={h2}>Questions</h2>
      <p style={p}>
        <Link href="/contact">Contact</Link>
        {" · "}
        <Link href="/terms">Terms</Link>
        {" · "}
        <Link href="/privacy">Privacy</Link>
        {" · "}
        <Link href="/sample-report">Sample report</Link>
      </p>
    </main>
  );
}
