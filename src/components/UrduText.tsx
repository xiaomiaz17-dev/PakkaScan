"use client";
import { isolateLtrRuns } from "@/lib/bidi";

/**
 * Render Urdu with Latin IDs forced LTR (CNIC, dates, PKR).
 * Complements Unicode LRI/PDI already applied on translated strings.
 */
const SPLIT =
  /(\d{5}[\-\u2010-\u2014\s]\d{7}[\-\u2010-\u2014\s]\d|\b\d{4}-\d{2}-\d{2}\b|\b(?:PKR|Rs\.?)\s*\d[\d,]*(?:\.\d+)?)/gi;

export function UrduText({
  text,
  className,
  style,
}: {
  text: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
}) {
  const raw = isolateLtrRuns(text || "");
  if (!raw) return null;
  const parts = raw.split(SPLIT);
  return (
    <span className={className} style={{ lineHeight: 2.45, display: "inline-block", width: "100%", ...(style || {}) }} lang="ur" dir="rtl">
      {parts.map((part, i) => {
        if (!part) return null;
        if (SPLIT.test(part) || /^\d{5}[-].{7,}[-]\d$/.test(part) || /^(PKR|Rs)/i.test(part.trim()) || /^\d{4}-\d{2}-\d{2}$/.test(part)) {
          SPLIT.lastIndex = 0;
          return (
            <span
              key={i}
              dir="ltr"
              style={{ unicodeBidi: "isolate", display: "inline" }}
            >
              {part.replace(/\u2066|\u2069/g, "")}
            </span>
          );
        }
        SPLIT.lastIndex = 0;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
