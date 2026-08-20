/**
 * Session 9 — HTML block for email report.
 * Usage in sendScanReportEmail:
 *   import { buildContractConcernsEmailHtml } from "./email-clause-block";
 *   html += buildContractConcernsEmailHtml(clauseConcerns);
 */

import type { ClauseConcerns } from "@/intelligence/clause-concerns";

export function buildContractConcernsEmailHtml(
  concerns: ClauseConcerns | null | undefined
): string {
  if (!concerns) return "";
  const { flagged, missing } = concerns;
  if ((!flagged || flagged.length === 0) && (!missing || missing.length === 0)) return "";

  let html = `<div style="margin:24px 0;padding:16px;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;">
  <div style="font-size:14px;font-weight:800;color:#991b1b;margin-bottom:8px;">Contract Concerns</div>`;

  if (flagged?.length) {
    html += `<div style="font-size:12px;color:#7f1d1d;margin-bottom:10px;">Flagged clauses (${flagged.length})</div>`;
    for (const f of flagged.slice(0, 8)) {
      html += `<div style="margin-bottom:12px;padding:10px;background:#fff;border-radius:8px;border-left:3px solid #f87171;">
        <div style="font-size:12px;font-style:italic;color:#0f172a;margin-bottom:4px;">"${escapeHtml(f.quote)}"</div>
        <div style="font-size:12px;color:#334155;"><strong>Why:</strong> ${escapeHtml(f.concern)}</div>
      </div>`;
    }
  }

  if (missing?.length) {
    html += `<div style="margin-top:12px;padding:12px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;">
      <div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:6px;">Missing standard protections</div>
      <ul style="margin:0;padding-left:18px;font-size:12px;color:#78350f;">`;
    for (const m of missing.slice(0, 8)) {
      html += `<li>${escapeHtml(m)}</li>`;
    }
    html += `</ul></div>`;
  }

  html += `</div>`;
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
