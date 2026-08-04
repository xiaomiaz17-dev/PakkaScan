/**
 * Guided customer onboarding steps.
 */

export type OnboardingStepId =
  | "VERIFY_EMAIL"
  | "COMPLETE_PROFILE"
  | "CREATE_FIRST_PROPERTY"
  | "UPLOAD_FIRST_DOCUMENT"
  | "VIEW_SAMPLE_REPORT"
  | "TOUR_PASSPORT";

export type OnboardingState = {
  userId: string;
  completed: OnboardingStepId[];
  skipped: OnboardingStepId[];
  current: OnboardingStepId;
};

export const ONBOARDING_SEQUENCE: OnboardingStepId[] = [
  "VERIFY_EMAIL",
  "COMPLETE_PROFILE",
  "CREATE_FIRST_PROPERTY",
  "UPLOAD_FIRST_DOCUMENT",
  "VIEW_SAMPLE_REPORT",
  "TOUR_PASSPORT",
];

export function nextOnboardingStep(state: OnboardingState): OnboardingStepId | "DONE" {
  for (const step of ONBOARDING_SEQUENCE) {
    if (!state.completed.includes(step) && !state.skipped.includes(step)) return step;
  }
  return "DONE";
}

export function progressPercent(state: OnboardingState): number {
  const done = ONBOARDING_SEQUENCE.filter((s) => state.completed.includes(s) || state.skipped.includes(s)).length;
  return Math.round((done / ONBOARDING_SEQUENCE.length) * 100);
}
