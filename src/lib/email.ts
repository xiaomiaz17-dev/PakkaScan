/**
 * Email sender via Resend.
 *
 * For now uses onboarding@resend.dev as sender (no domain setup needed).
 * Once pakkascan.com is verified in Resend, we swap to hello@pakkascan.com.
 */

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY || "";
const resend = apiKey ? new Resend(apiKey) : null;

// Sender: Resend default for now (works without domain verification).
// Change to "PakkaScan <hello@pakkascan.com>" after domain is verified in Resend dashboard.
const FROM_ADDRESS = process.env.RESEND_FROM || "PakkaScan <onboarding@resend.dev>";

/**
 * Send a magic link email.
 */
export async function sendMagicLinkEmail(input: {
  to: string;
  magicLinkUrl: string;
  ipAddress: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const subject = "Your PakkaScan sign-in link";
  const html = renderMagicLinkHtml({
    magicLinkUrl: input.magicLinkUrl,
    ipAddress: input.ipAddress,
  });
  const text = renderMagicLinkText({
    magicLinkUrl: input.magicLinkUrl,
    ipAddress: input.ipAddress,
  });

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.warn("[email] Resend returned error:", result.error);
      return { ok: false, error: result.error.message };
    }
    console.log("[email] Sent magic link to " + input.to + " (id=" + result.data?.id + ")");
    return { ok: true };
  } catch (err: any) {
    console.error("[email] Send failed:", err?.message || err);
    return { ok: false, error: err?.message || "Send failed" };
  }
}

function renderMagicLinkHtml(input: { magicLinkUrl: string; ipAddress: string | null }): string {
  const ipLine = input.ipAddress
    ? "<p style=\"color:#94a3b8;font-size:12px;margin:16px 0 0 0\">This request came from IP " + input.ipAddress + ". If you did not request this, you can safely ignore this email.</p>"
    : "";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Sign in to PakkaScan</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;">Pakka<span style="color:#16a34a;font-style:italic;">Scan</span></div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;color:#94a3b8;text-transform:uppercase;margin-top:4px;">Legal Due Diligence</div>
    </div>

    <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 12px 0;">Sign in to PakkaScan</h1>
    <p style="font-size:15px;color:#475569;line-height:1.5;margin:0 0 24px 0;">Click the button below to sign in. This link is valid for 15 minutes and can only be used once.</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${input.magicLinkUrl}" style="display:inline-block;padding:14px 32px;background-color:#0b132b;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:10px;">Sign in to PakkaScan</a>
    </div>

    <p style="font-size:13px;color:#64748b;margin:24px 0 0 0;line-height:1.5;">Or paste this link into your browser:<br><a href="${input.magicLinkUrl}" style="color:#0b132b;word-break:break-all;">${input.magicLinkUrl}</a></p>

    ${ipLine}

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px 0;">
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">PakkaScan &middot; AI-powered legal due diligence for Pakistani property</p>
  </div>
</body>
</html>
  `.trim();
}

function renderMagicLinkText(input: { magicLinkUrl: string; ipAddress: string | null }): string {
  const ipLine = input.ipAddress
    ? "\n\nThis request came from IP " + input.ipAddress + ". If you did not request this, ignore this email."
    : "";
  return [
    "Sign in to PakkaScan",
    "",
    "Click this link to sign in (valid for 15 minutes, one-time use):",
    input.magicLinkUrl,
    ipLine,
    "",
    "--",
    "PakkaScan - AI-powered legal due diligence for Pakistani property",
  ].join("\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// Scan Report Email
// Auto-sent after every successful scan.
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_TYPE_LABEL: Record<string, string> = {
  rental:  "Rental Safety Check",
  bayana:  "Bayana Safety Check",
  full_dd: "Full Property Due Diligence",
};

const VERDICT_LABEL: Record<string, { text: string; emoji: string; color: string }> = {
  PROCEED:               { text: "Safe to Proceed",          emoji: "✅", color: "#16a34a" },
  PROCEED_WITH_CAUTION:  { text: "Proceed with Caution",     emoji: "⚠️", color: "#d97706" },
  LEGAL_REVIEW_REQUIRED: { text: "Legal Review Required",    emoji: "⚠️", color: "#d97706" },
  DO_NOT_PROCEED:        { text: "Do Not Proceed",           emoji: "🚫", color: "#dc2626" },
  INCONCLUSIVE:          { text: "Inconclusive",             emoji: "❓", color: "#64748b" },
};

export async function sendScanReportEmail(input: {
  to: string;
  referenceCode: string;
  reportType: string;
  verdict: string | null;
  pakkaScore: number | null;
  nextSteps: Array<{ title: string; detail?: string }>;
  verifyUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const tierLabel  = REPORT_TYPE_LABEL[input.reportType]  ?? input.reportType;
  const verdictInfo = input.verdict ? (VERDICT_LABEL[input.verdict] ?? { text: input.verdict, emoji: "📋", color: "#0b132b" }) : null;
  const scoreText  = input.pakkaScore !== null ? String(Math.round(input.pakkaScore)) + "/100" : null;

  const subject = verdictInfo
    ? `PakkaScan Report: ${verdictInfo.emoji} ${verdictInfo.text} — Ref ${input.referenceCode}`
    : `PakkaScan Report — Ref ${input.referenceCode}`;

  const html = renderScanReportHtml({ ...input, tierLabel, verdictInfo, scoreText });
  const text = renderScanReportText({ ...input, tierLabel, verdictInfo, scoreText });

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.warn("[email] scan report Resend error:", result.error);
      return { ok: false, error: result.error.message };
    }
    console.log("[email] Sent scan report to " + input.to + " ref=" + input.referenceCode + " (id=" + result.data?.id + ")");
    return { ok: true };
  } catch (err: any) {
    console.error("[email] scan report send failed:", err?.message || err);
    return { ok: false, error: err?.message || "Send failed" };
  }
}

function renderScanReportHtml(input: {
  to: string;
  referenceCode: string;
  tierLabel: string;
  verdictInfo: { text: string; emoji: string; color: string } | null;
  pakkaScore: number | null;
  scoreText: string | null;
  nextSteps: Array<{ title: string; detail?: string }>;
  verifyUrl: string;
}): string {
  const verdictBlock = input.verdictInfo ? `
    <div style="background:${input.verdictInfo.color}14;border-left:4px solid ${input.verdictInfo.color};border-radius:8px;padding:16px 20px;margin:24px 0;">
      <div style="font-size:20px;font-weight:900;color:${input.verdictInfo.color};">${input.verdictInfo.emoji} ${input.verdictInfo.text}</div>
      ${input.scoreText ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">PakkaScore: <strong>${input.scoreText}</strong></div>` : ""}
    </div>` : "";

  const stepsHtml = input.nextSteps.length > 0 ? `
    <h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:32px 0 12px 0;">What To Do Next</h2>
    <ol style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.6;">
      ${input.nextSteps.slice(0, 5).map(s => `<li style="margin-bottom:8px;"><strong>${s.title}</strong>${s.detail ? `<br><span style="color:#64748b;">${s.detail}</span>` : ""}</li>`).join("")}
    </ol>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your PakkaScan Report</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;">Pakka<span style="color:#16a34a;font-style:italic;">Scan</span></div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;color:#94a3b8;text-transform:uppercase;margin-top:4px;">Legal Due Diligence</div>
    </div>

    <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px 0;">Your Scan Report is Ready</h1>
    <p style="font-size:14px;color:#64748b;margin:0 0 4px 0;">${input.tierLabel}</p>
    <p style="font-size:12px;color:#94a3b8;margin:0 0 24px 0;">Reference: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;">${input.referenceCode}</code></p>

    ${verdictBlock}

    ${stepsHtml}

    <div style="margin:32px 0;text-align:center;">
      <a href="${input.verifyUrl}" style="display:inline-block;padding:14px 28px;background:#0b132b;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;">View Verification Page</a>
    </div>

    <div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:12px;color:#64748b;line-height:1.6;">
      <strong style="color:#0f172a;">Keep this email.</strong> Your reference code is your permanent record of this scan.
      Share it with your lawyer or agent to verify authenticity at:<br>
      <a href="${input.verifyUrl}" style="color:#0b132b;word-break:break-all;">${input.verifyUrl}</a>
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px 0;">
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">PakkaScan &middot; AI-powered legal due diligence for Pakistani property</p>
  </div>
</body>
</html>`.trim();
}

function renderScanReportText(input: {
  to: string;
  referenceCode: string;
  tierLabel: string;
  verdictInfo: { text: string; emoji: string; color: string } | null;
  pakkaScore: number | null;
  scoreText: string | null;
  nextSteps: Array<{ title: string; detail?: string }>;
  verifyUrl: string;
}): string {
  const lines: string[] = [
    "PakkaScan — Your Scan Report",
    "================================",
    "",
    "Report type : " + input.tierLabel,
    "Reference   : " + input.referenceCode,
  ];
  if (input.verdictInfo) {
    lines.push("Verdict     : " + input.verdictInfo.emoji + " " + input.verdictInfo.text);
  }
  if (input.scoreText) {
    lines.push("PakkaScore  : " + input.scoreText);
  }
  if (input.nextSteps.length > 0) {
    lines.push("", "WHAT TO DO NEXT", "---------------");
    input.nextSteps.slice(0, 5).forEach((s, i) => {
      lines.push((i + 1) + ". " + s.title);
      if (s.detail) lines.push("   " + s.detail);
    });
  }
  lines.push(
    "",
    "VERIFY THIS SCAN",
    "----------------",
    "Share this link with your lawyer or agent to verify authenticity:",
    input.verifyUrl,
    "",
    "Keep this email as your permanent record of this scan.",
    "",
    "--",
    "PakkaScan - AI-powered legal due diligence for Pakistani property"
  );
  return lines.join("\n");
}