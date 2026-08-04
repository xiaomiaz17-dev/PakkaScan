import type { ExecutiveReport } from "./executive-report";

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] as string));
}

export function renderExecutiveReportHtml(report: ExecutiveReport): string {
  const score = report.pakkaScore === null ? "Inconclusive" : `${report.pakkaScore}/100`;
  const findings = report.criticalFindings.map((item) => `<article><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><p><strong>Recommendation:</strong> ${esc(item.recommendation)}</p><p><small>Rule ${esc(item.ruleCode)} · ${esc(item.severity)} · Confidence ${Math.round(item.confidence * 100)}%</small></p></article>`).join("");
  const summary = report.executiveSummary.map((item) => `<li>${esc(item)}</li>`).join("");
  const missing = report.missingEvidence.map((item) => `<li>${esc(item.label)} — ${item.critical ? "Critical" : "Recommended"}</li>`).join("") || "<li>None identified</li>";
  const categories = Object.entries(report.categoryScores).map(([key, value]) => `<tr><td>${esc(key)}</td><td>${esc(value)}/100</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(report.title)}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;line-height:1.5;color:#17211b}header{border-bottom:3px solid #173b2d;padding-bottom:20px}.score{font-size:54px;font-weight:700}.meta{color:#52615a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}section{margin:28px 0}article{border:1px solid #d8dedb;border-radius:10px;padding:16px;margin:12px 0}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #e4e8e6;padding:9px}footer{margin-top:48px;border-top:1px solid #d8dedb;padding-top:14px;color:#52615a;font-size:12px}</style></head><body><header><p class="meta">PakkaDeed™ · Verification ${esc(report.verificationId)}</p><h1>${esc(report.title)}</h1><div class="score">${esc(score)}</div><p><strong>${esc(report.decision)}</strong> · Trust ${esc(report.trustScore)}/100 · Confidence ${esc(report.confidenceScore)}%</p></header><section><h2>Executive summary</h2><ul>${summary}</ul></section><section class="grid"><div><h2>Category scores</h2><table>${categories}</table></div><div><h2>Missing evidence</h2><ul>${missing}</ul></div></section><section><h2>Critical findings</h2>${findings || "<p>No critical or high-severity findings.</p>"}</section><footer>Report ${esc(report.id)} · Passport ${esc(report.passportId)} · Version ${esc(report.version)} · Hash ${esc(report.reportHash)}</footer></body></html>`;
}
