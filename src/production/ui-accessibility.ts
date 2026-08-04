/**
 * PD-036 — Accessibility, mobile, and failure-state guidance for the beta UI.
 * These contracts drive the static frontend checklist tests.
 */

export type FailureState = {
  code: string;
  title: string;
  description: string;
  recoveryAction: string;
};

export const BETA_FAILURE_STATES: FailureState[] = [
  {
    code: "UPLOAD_TOO_LARGE",
    title: "File too large",
    description: "Each document must be 15 MB or smaller.",
    recoveryAction: "Compress the scan or upload a clearer smaller file.",
  },
  {
    code: "LIVE_OCR_REQUIRED",
    title: "Text could not be read",
    description: "This scan needs OCR before analysis can continue.",
    recoveryAction: "Wait for processing or re-upload a sharper scan.",
  },
  {
    code: "PROCESSING_FAILED",
    title: "Processing failed",
    description: "We could not finish scoring this property pack.",
    recoveryAction: "Retry processing or contact support with the verification ID.",
  },
  {
    code: "UNAUTHENTICATED",
    title: "Sign in required",
    description: "Your session expired or is missing.",
    recoveryAction: "Sign in again to continue.",
  },
];

export const ACCESSIBILITY_REQUIREMENTS = [
  "All primary actions are reachable by keyboard",
  "Form inputs have visible labels",
  "Error messages are associated with fields",
  "Colour is not the only status indicator",
  "Focus order follows visual order",
  "Touch targets are at least 44px on mobile layouts",
] as const;

export const MOBILE_BREAKPOINT_PX = 768;

export function failureStateFor(code: string): FailureState | undefined {
  return BETA_FAILURE_STATES.find((f) => f.code === code);
}
