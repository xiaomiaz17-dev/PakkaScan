import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "24px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "40px 32px",
          textAlign: "center",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
          }}
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#16a34a">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 12px 0",
            letterSpacing: "-0.01em",
          }}
        >
          Payment Received
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#475569",
            lineHeight: 1.6,
            margin: "0 0 24px 0",
          }}
        >
          Your report credit has been added to your account. You can now generate your report.
        </p>

        {searchParams.session_id && (
          <p
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              margin: "0 0 24px 0",
              wordBreak: "break-all",
            }}
          >
            Reference: {searchParams.session_id}
          </p>
        )}

        <Link
          href="/scan"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            backgroundColor: "#16a34a",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "14px",
            borderRadius: "10px",
            textDecoration: "none",
          }}
        >
          Generate Report
        </Link>
      </div>
    </div>
  );
}