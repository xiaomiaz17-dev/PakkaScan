import Link from "next/link";

export default function PaymentCancelPage() {
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
            backgroundColor: "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
          }}
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#d97706">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
          Payment Cancelled
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#475569",
            lineHeight: 1.6,
            margin: "0 0 24px 0",
          }}
        >
          No charge was made. You can try again whenever you're ready.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/#pricing"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#0b132b",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              borderRadius: "10px",
              textDecoration: "none",
            }}
          >
            Back to Pricing
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#f1f5f9",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: "14px",
              borderRadius: "10px",
              textDecoration: "none",
              border: "1px solid #e2e8f0",
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}