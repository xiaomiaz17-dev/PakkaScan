/**
 * PD-035 — Restore testing for PostgreSQL rows and object-storage metadata.
 * Validates that a snapshot of records can be re-applied and re-read.
 */

import type { DurableRepository, PropertyRecord, DocumentRecord, JobRecord } from "../storage/repository";
import type { ObjectStorage } from "../storage/contracts";
import { createHash } from "node:crypto";

export type RestoreSnapshot = {
  properties: PropertyRecord[];
  documents: DocumentRecord[];
  jobs: JobRecord[];
  objects: Array<{ key: string; contentType: string; body: Uint8Array; sha256: string }>;
};

export type RestoreTestResult = {
  ok: boolean;
  propertiesRestored: number;
  documentsRestored: number;
  jobsRestored: number;
  objectsRestored: number;
  detail: string;
};

export async function runRestoreTest(input: {
  repository: DurableRepository;
  storage?: ObjectStorage;
  snapshot: RestoreSnapshot;
}): Promise<RestoreTestResult> {
  for (const property of input.snapshot.properties) {
    await input.repository.saveProperty(property);
  }
  for (const document of input.snapshot.documents) {
    await input.repository.saveDocument(document);
  }
  for (const job of input.snapshot.jobs) {
    await input.repository.saveJob(job);
  }

  let objectsRestored = 0;
  if (input.storage) {
    for (const obj of input.snapshot.objects) {
      const digest = createHash("sha256").update(obj.body).digest("hex");
      if (digest !== obj.sha256) {
        return {
          ok: false,
          propertiesRestored: 0,
          documentsRestored: 0,
          jobsRestored: 0,
          objectsRestored: 0,
          detail: `Checksum mismatch for ${obj.key}`,
        };
      }
      await input.storage.putQuarantined({
        key: obj.key.startsWith("quarantine/") ? obj.key : `quarantine/${obj.key}`,
        contentType: obj.contentType,
        body: obj.body,
        sha256: obj.sha256,
      });
      objectsRestored += 1;
    }
  }

  for (const property of input.snapshot.properties) {
    const found = await input.repository.getProperty(property.id);
    if (!found || found.label !== property.label) {
      return {
        ok: false,
        propertiesRestored: 0,
        documentsRestored: 0,
        jobsRestored: 0,
        objectsRestored,
        detail: `Property restore failed for ${property.id}`,
      };
    }
  }
  for (const document of input.snapshot.documents) {
    const found = await input.repository.getDocument(document.id);
    if (!found || found.sha256 !== document.sha256) {
      return {
        ok: false,
        propertiesRestored: input.snapshot.properties.length,
        documentsRestored: 0,
        jobsRestored: 0,
        objectsRestored,
        detail: `Document restore failed for ${document.id}`,
      };
    }
  }
  for (const job of input.snapshot.jobs) {
    const found = await input.repository.getJob(job.id);
    if (!found || found.state !== job.state) {
      return {
        ok: false,
        propertiesRestored: input.snapshot.properties.length,
        documentsRestored: input.snapshot.documents.length,
        jobsRestored: 0,
        objectsRestored,
        detail: `Job restore failed for ${job.id}`,
      };
    }
  }

  return {
    ok: true,
    propertiesRestored: input.snapshot.properties.length,
    documentsRestored: input.snapshot.documents.length,
    jobsRestored: input.snapshot.jobs.length,
    objectsRestored,
    detail: "Restore test succeeded",
  };
}
