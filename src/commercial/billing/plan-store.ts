/**
 * In-process plan state for beta; replace with Postgres rows when bound.
 */

import type { PlanId } from "./plans";
import type { CustomerPlanState } from "./entitlements";

const plans = new Map<string, CustomerPlanState>();

export function getPlanState(userId: string): CustomerPlanState {
  const existing = plans.get(userId);
  if (existing) return { ...existing };
  const initial: CustomerPlanState = { userId, planId: "free", reportsUsed: 0 };
  plans.set(userId, initial);
  return { ...initial };
}

export function setPlanId(userId: string, planId: PlanId): CustomerPlanState {
  const current = getPlanState(userId);
  const next = { ...current, planId };
  plans.set(userId, next);
  return { ...next };
}

export function setPlanState(state: CustomerPlanState): void {
  plans.set(state.userId, { ...state });
}

export function resetPlanStoreForTests(): void {
  plans.clear();
}
