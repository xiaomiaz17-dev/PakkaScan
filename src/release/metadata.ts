/**
 * Canonical release metadata — PakkaScan.
 */
export const RELEASE_MILESTONE = "PD-079" as const;
export const RELEASE_VERSION = "0.61.0" as const;
export const RELEASE_SERVICE = "pakkascan" as const;
export const RELEASE_BRAND = "PakkaScan" as const;

export type ReleaseMetadata = {
  service: typeof RELEASE_SERVICE;
  milestone: typeof RELEASE_MILESTONE;
  version: typeof RELEASE_VERSION;
  brand: typeof RELEASE_BRAND;
  status: "ok";
};

export function getReleaseMetadata(): ReleaseMetadata {
  return {
    service: RELEASE_SERVICE,
    milestone: RELEASE_MILESTONE,
    version: RELEASE_VERSION,
    brand: RELEASE_BRAND,
    status: "ok",
  };
}

export const FORBIDDEN_STALE_LABELS = [
  "PD-020",
  "PD-025",
  "Commercial Beta",
  "0.2.0",
  "0.11.0",
] as const;
