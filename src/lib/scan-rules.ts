export type RuleId =
  | "RISK_STAMP_AFTER_EXEC"
  | "RISK_PREDATORY_FORFEITURE"
  | "RISK_PLOT_MISMATCH"
  | "RISK_GENERAL_POA"
  | "RISK_CNIC_TRANSPOSE"
  | "RISK_OUTSTANDING_DUES"
  | "RISK_TENANCY_STAY"
  | "RISK_TENANCY_LOCKBREAK"
  | "RISK_TENANCY_NOTICE"
  | "RISK_ONE_SIDED_EXIT"
  | "RISK_NO_WITNESS"
  | "RISK_UNDER_DECLARE"
  | "RISK_OTHER";

export function decodeUtf8(s: string): string {
  const x = String(s || "");
  if (!x) return x;
  if (!/[ØÙÃ]/.test(x)) return x;
  try { return Buffer.from(x, "latin1").toString("utf8"); } catch { return x; }
}

export function clipSentence(s: string, max = 280): string {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const cut = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "), slice.lastIndexOf("\u06D4"));
  if (cut >= 80) return slice.slice(0, cut + 1).trim();
  const w = slice.lastIndexOf(" ");
  return (w > 40 ? slice.slice(0, w) : slice).trim();
}

export function ruleIdFromText(blob: string): RuleId {
  const b = String(blob || "").toLowerCase();
  if (/stamp/.test(b) && /after|later than|chronolog/.test(b)) return "RISK_STAMP_AFTER_EXEC";
  if (/forfeit/.test(b)) return "RISK_PREDATORY_FORFEITURE";
  if (/plot|square yard|area mismatch|300|356/.test(b) && /mismatch|differ/.test(b)) return "RISK_PLOT_MISMATCH";
  if (/power of attorney|general poa|mukhtar|unlimited/.test(b)) return "RISK_GENERAL_POA";
  if (/cnic/.test(b) && /transpos|mismatch/.test(b)) return "RISK_CNIC_TRANSPOSE";
  if (/outstanding dues|480,?000/.test(b)) return "RISK_OUTSTANDING_DUES";
  if (/stay|court-waiver|barred from court/.test(b)) return "RISK_TENANCY_STAY";
  if (/lock-?break|self-help|seize/.test(b)) return "RISK_TENANCY_LOCKBREAK";
  if (/notice period|terminat/.test(b)) return "RISK_TENANCY_NOTICE";
  if (/one-?sided exit/.test(b)) return "RISK_ONE_SIDED_EXIT";
  if (/witness/.test(b)) return "RISK_NO_WITNESS";
  if (/under-?declar|below official|dc\/fbr/.test(b)) return "RISK_UNDER_DECLARE";
  return "RISK_OTHER";
}

export function dedupeByRuleId<T extends { rule_id?: string; label?: string; title?: string; concern?: string; quote?: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows || []) {
    const id = r.rule_id || ruleIdFromText([r.label, r.title, r.concern, r.quote].filter(Boolean).join(" "));
    const key = id === "RISK_OTHER" ? "other:" + String(r.label || r.title || "").slice(0, 40).toLowerCase() : id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, rule_id: id });
  }
  return out;
}
export function walkUtf8(v: any, depth = 0): any {
  if (depth > 12 || v == null) return v;
  if (typeof v === "string") return decodeUtf8(v);
  if (Array.isArray(v)) return v.map((x) => walkUtf8(x, depth + 1));
  if (typeof v === "object") {
    const o: any = Array.isArray(v) ? [] : { ...v };
    for (const k of Object.keys(v)) o[k] = walkUtf8(v[k], depth + 1);
    return o;
  }
  return v;
}

export function snapQuote(s: string): string {
  let t = String(s || "").replace(/\s+/g, " ").trim();
  t = t.replace(/^h(?=e balance)/i, "Th");
  t = t.replace(/^he balance/i, "The balance");
  return t;
}