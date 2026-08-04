/**
 * Deterministic sample property pack for first-run experience.
 * Synthetic text only — not a real title.
 */

export const SAMPLE_PROPERTY = {
  label: "Sample — Islamabad residential plot (demo)",
  jurisdiction: "ISLAMABAD" as const,
  document: {
    fileName: "sample-fard.txt",
    text: [
      "SAMPLE DOCUMENT — NOT A REAL TITLE",
      "FARD-E-MALKIYAT (demonstration)",
      "Khasra: DEMO-12/4",
      "District: Islamabad",
      "Owner: Demo Customer",
      "This file exists only to exercise the PakkaScan guided journey.",
    ].join("\n"),
  },
};

export function isSamplePropertyLabel(label: string): boolean {
  return label.trim().toLowerCase().startsWith("sample");
}
