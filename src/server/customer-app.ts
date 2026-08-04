/**
 * PD-042 — Resolve the customer application implementation.
 * Prefers PostgreSQL-backed PgCustomerApplication when repository is bootstrapped.
 */

import { BetaApplication } from "../runtime/beta-application";
import { PgCustomerApplication } from "../runtime/pg-application";
import { getBetaApplication, getApplicationPgRepository } from "./app-singleton";
import { resolveStorageSecret } from "./secrets";

export type CustomerApp = {
  mode: "postgres" | "memory";
  register(input: { email: string; displayName: string; password: string }): Promise<{ userId: string }> | { userId: string };
  login(input: { email: string; password: string }): Promise<{ token: string; userId: string }> | { token: string; userId: string };
  logout(token: string): Promise<void> | void;
  authenticate(token: string): Promise<unknown> | unknown;
  createProperty(token: string, input: { label: string; jurisdiction: string }): Promise<unknown> | unknown;
  listProperties(token: string): Promise<unknown> | unknown;
  getProperty(token: string, propertyId: string): Promise<unknown> | unknown;
  uploadTextDocument(token: string, input: { propertyId: string; fileName: string; text: string }): Promise<unknown> | unknown;
  uploadDocument(
    token: string,
    input: { propertyId: string; fileName: string; contentType: string; bytes: Uint8Array },
  ): Promise<unknown> | unknown;
  analyseProperty(token: string, propertyId: string): Promise<unknown> | unknown;
  getProcessingStatus(token: string, propertyId: string): Promise<unknown> | unknown;
  getPropertyReport(token: string, propertyId: string): Promise<unknown> | unknown;
  getPassport(token: string, propertyId: string): Promise<unknown> | unknown;
};

export function resolveCustomerApp(): CustomerApp {
  try {
    const repo = getApplicationPgRepository();
    const pg = new PgCustomerApplication(repo, resolveStorageSecret());
    return {
      mode: "postgres",
      register: (i) => pg.register(i),
      login: (i) => pg.login(i),
      logout: (t) => pg.logout(t),
      authenticate: (t) => pg.authenticate(t),
      createProperty: (t, i) => pg.createProperty(t, i),
      listProperties: (t) => pg.listProperties(t),
      getProperty: (t, id) => pg.getProperty(t, id),
      uploadTextDocument: (t, i) => pg.uploadTextDocument(t, i),
      uploadDocument: (t, i) => pg.uploadDocument(t, i),
      analyseProperty: (t, id) => pg.analyseProperty(t, id),
      getProcessingStatus: (t, id) => pg.getProcessingStatus(t, id),
      getPropertyReport: (t, id) => pg.getPropertyReport(t, id),
      getPassport: (t, id) => pg.getPassport(t, id),
    };
  } catch {
    const app = getBetaApplication();
    return {
      mode: "memory",
      register: (i) => app.register(i),
      login: (i) => app.login(i),
      logout: (t) => app.logout(t),
      authenticate: (t) => app.authenticate(t),
      createProperty: (t, i) => app.createProperty(t, { label: i.label, jurisdiction: i.jurisdiction as any }),
      listProperties: (t) => app.listProperties(t),
      getProperty: (t, id) => app.getProperty(t, id),
      uploadTextDocument: (t, i) => app.uploadTextDocument(t, i),
      uploadDocument: (t, i) => app.uploadDocument(t, i),
      analyseProperty: (t, id) => app.analyseProperty(t, id),
      getProcessingStatus: (t, id) => app.getProcessingStatus(t, id),
      getPropertyReport: (t, id) => app.getPropertyReport(t, id),
      getPassport: (t, id) => app.getPassport(t, id),
    };
  }
}

export async function awaitify<T>(value: T | Promise<T>): Promise<T> {
  return await value;
}
