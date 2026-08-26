"use client";

import type { ReactNode } from "react";
import { isolateLtrRuns } from "@/lib/bidi";
import { UrduText } from "@/components/UrduText";

/**
 * Feature 3c — dual-language layout
 * Desktop >=768px: EN | UR when urdu present
 * Mobile: stacked EN then UR
 * No urdu -> full-width English only
 */

const URDU_FONT =
  '"Noto Nastaliq Urdu", "Urdu Typesetting", "Jameel Noori Nastaleeq", serif';

export function BilingualGrid({
  english,
  urdu,
  labelEn,
  labelUr,
  dense,
}: {
  english: ReactNode;
  urdu?: ReactNode | string | null;
  labelEn?: string;
  labelUr?: string;
  dense?: boolean;
}) {
  const hasUr =
    urdu != null &&
    urdu !== "" &&
    !(typeof urdu === "string" && !String(urdu).trim());

  return (
    <div
      className={[
        "bilingual-grid",
        hasUr ? "bilingual-grid--dual" : "",
        dense ? "bilingual-grid--dense" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: "100%" }}
    >
      <div className="bilingual-en">
        {labelEn ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#64748b",
              marginBottom: 4,
            }}
          >
            {labelEn}
          </div>
        ) : null}
        <div
          style={{
            fontSize: dense ? 13 : 14,
            lineHeight: 1.55,
            color: "#0f172a",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {english}
        </div>
      </div>
      {hasUr ? (
        <div className="bilingual-ur" dir="rtl" lang="ur">
          {labelUr ? (
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#64748b",
                marginBottom: 4,
                textAlign: "right",
              }}
            >
              {labelUr}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: URDU_FONT,
              fontSize: dense ? 14 : 15,
              lineHeight: 3,
              marginTop: 8,
              paddingTop: 2,
              textAlign: "right",
              direction: "rtl",
              color: "#0f172a",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              display: "block",
            }}
          >
            {typeof urdu === "string" ? <UrduText text={urdu} style={{ display: "block", lineHeight: 3, padding: "6px 0" }} /> : urdu}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function urduFromMap(
  map: Record<string, string> | null | undefined,
  ...keys: string[]
): string | null {
  if (!map) return null;
  for (const k of keys) {
    const v = map[k];
    if (typeof v === "string" && v.trim()) return isolateLtrRuns(v.trim());
  }
  return null;
}
