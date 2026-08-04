/** Canonical V2 document-shield mark — slate + tech blue (green reserved for status pills). */
export function BrandMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M24 4L40 10.5V23.5C40 33.8 32.8 41.5 24 44.5C15.2 41.5 8 33.8 8 23.5V10.5L24 4Z"
        fill="#0f172a"
        stroke="#2563eb"
        strokeWidth="2"
      />
      <path
        d="M17 14H27L31 18V32C31 33.1 30.1 34 29 34H17C15.9 34 15 33.1 15 32V16C15 14.9 15.9 14 17 14Z"
        fill="#1e293b"
        stroke="#60a5fa"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M27 14V18H31" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="19" y1="20" x2="23" y2="20" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="24" x2="22" y2="24" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M20 28.5L23.5 32L30 23.5"
        stroke="#2563eb"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
