"use client";

/**
 * Desktop: EN | UR side-by-side when urdu present.
 * Mobile: use CSS class .bilingual-stack from globals (or stacks naturally if narrow).
 */
export function BilingualBlock({
  english,
  urdu,
  titleEn,
  titleUr,
  dense,
}: {
  english: string;
  urdu?: string | null;
  titleEn?: string;
  titleUr?: string;
  dense?: boolean;
}) {
  if (!english && !urdu) return null;
  const hasUr = Boolean(urdu && String(urdu).trim());

  return (
    <div
      className={hasUr ? "bilingual-dual" : undefined}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: dense ? 12 : 16,
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        {titleEn && (
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
            {titleEn}
          </div>
        )}
        <div style={{ fontSize: dense ? 13 : 14, lineHeight: 1.55, color: "#0f172a", whiteSpace: "pre-wrap" }}>
          {english}
        </div>
      </div>
      {hasUr && (
        <div style={{ flex: "1 1 240px", minWidth: 0 }} dir="rtl">
          {titleUr && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#64748b",
                marginBottom: 4,
                textAlign: "right",
              }}
            >
              {titleUr}
            </div>
          )}
          <div
            style={{
              fontSize: dense ? 14 : 15,
              lineHeight: 1.9,
              color: "#0f172a",
              textAlign: "right",
              whiteSpace: "pre-wrap",
            }}
          >
            {urdu}
          </div>
        </div>
      )}
    </div>
  );
}
