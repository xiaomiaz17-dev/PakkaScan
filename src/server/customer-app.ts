/**
 * PD-041 — Customer application service layer.
 */

import { getBetaApplication, getApplicationPgRepository } from "./app-singleton";
import type { ApplicationPgRepository } from "../storage/application-repository";
import type { BetaApplication } from "../runtime/beta-application";

export function getCustomerApp(): BetaApplication {
  return getBetaApplication();
}

export function getCustomerRepo(): ApplicationPgRepository {
  return getApplicationPgRepository();
}

export function resolveCustomerApp(): BetaApplication {
  return getBetaApplication();
}

export async function awaitify<T>(promise: Promise<T>): Promise<T> {
  return await promise;
}