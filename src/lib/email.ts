import { buildContractConcernsEmailHtml } from "./email-clause-block";
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


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Scan Report Email
// Auto-sent after every successful scan.
// Tier-aware: Rental gets a short summary, Bayana/Full DD get the full HTML.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const WHATSAPP_URL = "https://wa.me/923156507067";
const WHATSAPP_DISPLAY = "+92 315 6507067";

const REPORT_TYPE_LABEL: Record<string, string> = {
  rental:  "Rental Safety Check",
  bayana:  "Bayana Safety Check",
  full_dd: "Full Property Due Diligence",
};

const VERDICT_LABEL: Record<string, { text: string; emoji: string; color: string }> = {
  PROCEED:               { text: "Safe to Proceed",          emoji: "\u2705", color: "#16a34a" },
  PROCEED_WITH_CAUTION:  { text: "Proceed with Caution",     emoji: "\u26A0\uFE0F", color: "#d97706" },
  LEGAL_REVIEW_REQUIRED: { text: "Legal Review Required",    emoji: "\u26A0\uFE0F", color: "#d97706" },
  DO_NOT_PROCEED:        { text: "Do Not Proceed",           emoji: "\u{1F6AB}", color: "#dc2626" },
  INCONCLUSIVE:          { text: "Inconclusive",             emoji: "\u2753", color: "#64748b" },
};

export type ScanEmailTier = "rental" | "bayana" | "full_dd";

type EmailRiskFactor = { label: string; points: number; category: string };

function getRiskLabel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score <= 3) return "LOW";
  if (score <= 5) return "MEDIUM";
  if (score <= 7) return "HIGH";
  return "CRITICAL";
}

function getRiskColor(score: number): string {
  if (score <= 3) return "#16a34a";
  if (score <= 5) return "#ca8a04";
  if (score <= 7) return "#ea580c";
  return "#dc2626";
}

function renderRiskHtmlBlock(input: {
  riskScore: number | null | undefined;
  riskFactors?: EmailRiskFactor[];
}): string {
  if (input.riskScore == null) return "";

  const label = getRiskLabel(input.riskScore);
  const color = getRiskColor(input.riskScore);
  const factors = (input.riskFactors ?? []).slice(0, 5);

  const factorsHtml = factors.length > 0
    ? `<ul style="margin:6px 0 0 0;padding-left:16px;color:#475569;font-size:12px;line-height:1.6;">${factors.map((f) => `<li>${f.label} (${f.points > 0 ? "+" : ""}${f.points})</li>`).join("")}</ul>`
    : "";

  return `
    <div style="background:${color}14;border-left:4px solid ${color};border-radius:8px;padding:12px 16px;margin:12px 0 24px 0;">
      <div style="font-size:14px;font-weight:800;color:${color};">Risk Score: ${input.riskScore}/10 (${label} RISK)</div>
      ${factorsHtml}
    </div>`;
}

function renderRiskTextBlock(input: {
  riskScore: number | null | undefined;
  riskFactors?: EmailRiskFactor[];
}): string[] {
  if (input.riskScore == null) return [];

  const label = getRiskLabel(input.riskScore);
  const factors = (input.riskFactors ?? []).slice(0, 5);
  const lines = [`Risk Score  : ${input.riskScore}/10 (${label} RISK)`];

  if (factors.length > 0) {
    lines.push("Risk Factors:");
    for (const factor of factors) {
      lines.push("  - " + factor.label + " (" + (factor.points > 0 ? "+" : "") + factor.points + ")");
    }
  }

  return lines;
}

export async function sendScanReportEmail(input: {
  to: string;
  referenceCode: string;
  reportType: string;
  verdict: string | null;
  pakkaScore: number | null;
  nextSteps: Array<{ title: string; detail?: string }>;
  verifyUrl: string;
  riskScore?: number | null;
  riskFactors?: EmailRiskFactor[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const tier = (input.reportType as ScanEmailTier);
  const tierLabel = REPORT_TYPE_LABEL[input.reportType] ?? input.reportType;
  const verdictInfo = input.verdict
    ? (VERDICT_LABEL[input.verdict] ?? { text: input.verdict, emoji: "\u{1F4CB}", color: "#0b132b" })
    : null;
  const scoreText = input.pakkaScore !== null ? String(Math.round(input.pakkaScore)) + "/100" : null;
  const riskSummary = input.riskScore != null ? " | Risk " + input.riskScore + "/10" : "";

  const subject = verdictInfo
    ? `PakkaScan Report: ${verdictInfo.emoji} ${verdictInfo.text}${riskSummary} - Ref ${input.referenceCode}`
    : `PakkaScan Report${riskSummary} - Ref ${input.referenceCode}`;

  const renderArgs = {
    ...input,
    tier,
    tierLabel,
    verdictInfo,
    scoreText,
    riskScore: input.riskScore ?? null,
    riskFactors: input.riskFactors ?? [],
  };

  const html = tier === "rental"
    ? renderRentalReportHtml(renderArgs)
    : renderFullReportHtml(renderArgs);
  const text = tier === "rental"
    ? renderRentalReportText(renderArgs)
    : renderFullReportText(renderArgs);

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
    console.log("[email] Sent " + tier + " report to " + input.to + " ref=" + input.referenceCode + " (id=" + result.data?.id + ")");
    return { ok: true };
  } catch (err: any) {
    console.error("[email] scan report send failed:", err?.message || err);
    return { ok: false, error: err?.message || "Send failed" };
  }
}

// â”€â”€â”€ Shared components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function whatsappHtmlBlock(referenceCode: string): string {
  const prefill = encodeURIComponent("Hi PakkaScan, I have a question about my report " + referenceCode);
  const link = WHATSAPP_URL + "?text=" + prefill;
  return `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:24px 0;">
      <div style="font-size:14px;font-weight:800;color:#166534;margin-bottom:6px;">Questions about your report?</div>
      <div style="font-size:13px;color:#334155;margin-bottom:12px;line-height:1.5;">
        Message us on WhatsApp - usually reply within an hour on weekdays (9am-9pm PKT).
      </div>
      <a href="${link}" style="display:inline-block;padding:10px 20px;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:8px;">Chat on WhatsApp</a>
    </div>`;
}

function whatsappTextBlock(referenceCode: string): string {
  return [
    "",
    "QUESTIONS ABOUT YOUR REPORT?",
    "----------------------------",
    "Message us on WhatsApp - usually reply within an hour on weekdays (9am-9pm PKT).",
    "WhatsApp: " + WHATSAPP_DISPLAY,
    "Or click: " + WHATSAPP_URL + "?text=" + encodeURIComponent("Hi PakkaScan, I have a question about my report " + referenceCode),
  ].join("\n");
}

// â”€â”€â”€ Rental variant: short, minimal, upsell-friendly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderRentalReportHtml(input: {
  referenceCode: string;
  tierLabel: string;
  verdictInfo: { text: string; emoji: string; color: string } | null;
  scoreText: string | null;
  riskScore: number | null;
  riskFactors: EmailRiskFactor[];
  verifyUrl: string;
}): string {
  const verdictBlock = input.verdictInfo ? `
    <div style="background:${input.verdictInfo.color}14;border-left:4px solid ${input.verdictInfo.color};border-radius:8px;padding:16px 20px;margin:24px 0;">
      <div style="font-size:20px;font-weight:900;color:${input.verdictInfo.color};">${input.verdictInfo.emoji} ${input.verdictInfo.text}</div>
      ${input.scoreText ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">PakkaScore: <strong>${input.scoreText}</strong></div>` : ""}
    </div>` : "";

  const riskBlock = renderRiskHtmlBlock({
    riskScore: input.riskScore,
    riskFactors: input.riskFactors,
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your PakkaScan Report</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;">Pakka<span style="color:#16a34a;font-style:italic;">Scan</span></div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;color:#94a3b8;text-transform:uppercase;margin-top:4px;">Legal Due Diligence</div>
    </div>

    <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px 0;">Your Scan Summary</h1>
    <p style="font-size:14px;color:#64748b;margin:0 0 4px 0;">${input.tierLabel}</p>
    <p style="font-size:12px;color:#94a3b8;margin:0 0 24px 0;">Reference: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;">${input.referenceCode}</code></p>

    ${verdictBlock}
    ${riskBlock}

    <p style="font-size:14px;color:#334155;line-height:1.6;margin:16px 0;">
      Your full report - including next steps and detailed findings - is available in your PakkaScan dashboard.
    </p>

    <div style="margin:24px 0;text-align:center;">
      <a href="${input.verifyUrl}" style="display:inline-block;padding:14px 28px;background:#0b132b;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;">View Verification Page</a>
    </div>

    ${whatsappHtmlBlock(input.referenceCode)}

    <div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:12px;color:#64748b;line-height:1.6;">
      <strong style="color:#0f172a;">Keep this email.</strong> Your reference code is your permanent record.
      Share it with your lawyer or agent to verify authenticity at:<br>
      <a href="${input.verifyUrl}" style="color:#0b132b;word-break:break-all;">${input.verifyUrl}</a>
    </div>

    <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;font-size:12px;color:#78350f;">
      <strong>Need more detail?</strong> Upgrade to Bayana Safety Check or Full Due Diligence for cross-document analysis, deeper findings, and richer reports.
    </div>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px 0;">
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">PakkaScan &middot; AI-powered legal due diligence for Pakistani property</p>
  </div>
</body>
</html>`.trim();
}

function renderRentalReportText(input: {
  referenceCode: string;
  tierLabel: string;
  verdictInfo: { text: string; emoji: string; color: string } | null;
  scoreText: string | null;
  riskScore: number | null;
  riskFactors: EmailRiskFactor[];
  verifyUrl: string;
}): string {
  const lines: string[] = [
    "PakkaScan - Your Scan Summary",
    "================================",
    "",
    "Report type : " + input.tierLabel,
    "Reference   : " + input.referenceCode,
  ];
  if (input.verdictInfo) lines.push("Verdict     : " + input.verdictInfo.emoji + " " + input.verdictInfo.text);
  if (input.scoreText) lines.push("PakkaScore  : " + input.scoreText);
  lines.push(...renderRiskTextBlock({ riskScore: input.riskScore, riskFactors: input.riskFactors }));
  lines.push(
    "",
    "Your full report is available in your PakkaScan dashboard.",
    "",
    "VERIFY THIS SCAN",
    "----------------",
    input.verifyUrl,
  );
  lines.push(whatsappTextBlock(input.referenceCode));
  lines.push(
    "",
    "NEED MORE DETAIL?",
    "-----------------",
    "Upgrade to Bayana Safety Check or Full Due Diligence for cross-document analysis and richer reports.",
    "",
    "--",
    "PakkaScan - AI-powered legal due diligence for Pakistani property"
  );
  return lines.join("\n");
}

// â”€â”€â”€ Full variant: Bayana + Full DD get everything â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function renderFullReportHtml(input: {
  referenceCode: string;
  tierLabel: string;
  verdictInfo: { text: string; emoji: string; color: string } | null;
  scoreText: string | null;
  riskScore: number | null;
  riskFactors: EmailRiskFactor[];
  nextSteps: Array<{ title: string; detail?: string }>;
  verifyUrl: string;
}): string {
  const verdictBlock = input.verdictInfo ? `
    <div style="background:${input.verdictInfo.color}14;border-left:4px solid ${input.verdictInfo.color};border-radius:8px;padding:16px 20px;margin:24px 0;">
      <div style="font-size:20px;font-weight:900;color:${input.verdictInfo.color};">${input.verdictInfo.emoji} ${input.verdictInfo.text}</div>
      ${input.scoreText ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">PakkaScore: <strong>${input.scoreText}</strong></div>` : ""}
    </div>` : "";

  const riskBlock = renderRiskHtmlBlock({
    riskScore: input.riskScore,
    riskFactors: input.riskFactors,
  });

  const stepsHtml = input.nextSteps.length > 0 ? `
    <h2 style="font-size:16px;font-weight:800;color:#0f172a;margin:32px 0 12px 0;">What To Do Next</h2>
    <ol style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.6;">
      ${input.nextSteps.map(s => `<li style="margin-bottom:8px;"><strong>${s.title}</strong>${s.detail ? `<br><span style="color:#64748b;">${s.detail}</span>` : ""}</li>`).join("")}
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
    ${riskBlock}

    ${stepsHtml}

    <div style="margin:32px 0;text-align:center;">
      <a href="${input.verifyUrl}" style="display:inline-block;padding:14px 28px;background:#0b132b;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;">View Verification Page</a>
    </div>

    ${whatsappHtmlBlock(input.referenceCode)}

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

function renderFullReportText(input: {
  referenceCode: string;
  tierLabel: string;
  verdictInfo: { text: string; emoji: string; color: string } | null;
  scoreText: string | null;
  riskScore: number | null;
  riskFactors: EmailRiskFactor[];
  nextSteps: Array<{ title: string; detail?: string }>;
  verifyUrl: string;
}): string {
  const lines: string[] = [
    "PakkaScan - Your Scan Report",
    "================================",
    "",
    "Report type : " + input.tierLabel,
    "Reference   : " + input.referenceCode,
  ];
  if (input.verdictInfo) lines.push("Verdict     : " + input.verdictInfo.emoji + " " + input.verdictInfo.text);
  if (input.scoreText) lines.push("PakkaScore  : " + input.scoreText);
  lines.push(...renderRiskTextBlock({ riskScore: input.riskScore, riskFactors: input.riskFactors }));
  if (input.nextSteps.length > 0) {
    lines.push("", "WHAT TO DO NEXT", "---------------");
    input.nextSteps.forEach((s, i) => {
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
  );
  lines.push(whatsappTextBlock(input.referenceCode));
  lines.push(
    "",
    "Keep this email as your permanent record of this scan.",
    "",
    "--",
    "PakkaScan - AI-powered legal due diligence for Pakistani property"
  );
  return lines.join("\n");
}
