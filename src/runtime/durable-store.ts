import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { BetaUser, Session, WorkspaceProperty } from "../commercial/types";
import type { ExecutiveReport } from "../reporting/executive-report";
import type { PropertyPassport } from "../passport/property-passport";
import type { EncryptedObject } from "../deployment/encrypted-storage";
import type { RuntimeDocument } from "./beta-application";

export type PersistedRuntimeState = {
  schemaVersion: 1;
  users: BetaUser[];
  sessions: Array<Session & { token: string }>;
  properties: WorkspaceProperty[];
  documents: RuntimeDocument[];
  reports: ExecutiveReport[];
  passports: PropertyPassport[];
  objects: EncryptedObject[];
};

export interface RuntimeStateStore {
  load(): PersistedRuntimeState | undefined;
  save(state: PersistedRuntimeState): void;
}

export class MemoryRuntimeStateStore implements RuntimeStateStore {
  private state?: PersistedRuntimeState;
  load(): PersistedRuntimeState | undefined { return this.state ? structuredClone(this.state) : undefined; }
  save(state: PersistedRuntimeState): void { this.state = structuredClone(state); }
}

export class JsonFileRuntimeStateStore implements RuntimeStateStore {
  constructor(private readonly filePath: string) {}
  load(): PersistedRuntimeState | undefined {
    if (!existsSync(this.filePath)) return undefined;
    const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as PersistedRuntimeState;
    if (parsed.schemaVersion !== 1) throw new Error("UNSUPPORTED_STATE_SCHEMA");
    return parsed;
  }
  save(state: PersistedRuntimeState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    writeFileSync(temp, JSON.stringify(state), { encoding: "utf8", mode: 0o600 });
    renameSync(temp, this.filePath);
  }
}
