/**
 * Feature gating from plan entitlements.
 */

import { type Entitlement, type PlanId, hasEntitlement, PLANS } from "./plans";

export type CustomerPlanState = {
  userId: string;
  planId: PlanId;
  reportsUsed: number;
  trialEndsAt?: string;
};

export function canRunFullAnalysis(state: CustomerPlanState, now = new Date()): { allowed: boolean; reason?: string } {
  if (hasEntitlement(state.planId, "FULL_REPORT")) {
    const quota = PLANS[state.planId].reportQuota;
    if (quota !== "unlimited" && state.reportsUsed >= quota) {
      return { allowed: false, reason: "REPORT_QUOTA_EXCEEDED" };
    }
    if (state.trialEndsAt && new Date(state.trialEndsAt) < now && state.planId === "team") {
      // trial expired without conversion — still allow if quota remains for pro-like; team trial end blocks
      return { allowed: false, reason: "TRIAL_EXPIRED" };
    }
    return { allowed: true };
  }
  if (hasEntitlement(state.planId, "SAMPLE_PROPERTY")) {
    return { allowed: false, reason: "UPGRADE_REQUIRED" };
  }
  return { allowed: false, reason: "ENTITLEMENT_DENIED" };
}

export function canViewPassport(state: CustomerPlanState): boolean {
  return hasEntitlement(state.planId, "PASSPORT") || hasEntitlement(state.planId, "SAMPLE_PROPERTY");
}

export function recordReportUsage(state: CustomerPlanState): CustomerPlanState {
  return { ...state, reportsUsed: state.reportsUsed + 1 };
}
