/**
 * Chain of Title — Session 4: Timeline Reconstruction
 *
 * Builds an ownership timeline from multi-doc bundles using entity
 * resolution (Session 3). Detects gaps and conflicts.
 *
 * Does NOT yet encode Registration Act timing rules (Session 5).
 */

import {
  resolveEntities,
  partiesFromSmartFields,
  type EntityGroup,
  type PartyInput,
} from "./entity-resolver";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OwnershipEventType =
  | "SALE"
  | "MUTATION"
  | "GIFT"
  | "INHERITANCE"
  | "MORTGAGE"
  | "OWNERSHIP_RECORD"
  | "AGREEMENT"
  | "OTHER";

export type OwnershipEvent = {
  date: string | null; // ISO YYYY-MM-DD when known
  eventType: OwnershipEventType;
  /** Who transferred / previous owner (may be null for original grant / Fard-only) */
  transferor: EntityGroup | null;
  /** Who received / current owner on this event */
  transferee: EntityGroup | null;
  documentId: string;
  documentType: string;
  fileName?: string;
  verified: boolean;
  notes?: string;
};

export type TimelineGap = {
  kind: "MISSING_LINK" | "CHRONOLOGICAL_GAP" | "UNEXPLAINED_OWNER";
  message: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  relatedDocumentIds: string[];
  /** Approximate year span if chronological */
  gapYears?: number;
};

export type TimelineConflict = {
  kind: "PARTY_MISMATCH" | "DATE_ORDER" | "DUPLICATE_TRANSFER";
  message: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  relatedDocumentIds: string[];
};

export type ChainOfTitleResult = {
  timeline: OwnershipEvent[];
  gaps: TimelineGap[];
  conflicts: TimelineConflict[];
  entities: EntityGroup[];
  isComplete: boolean;
  /** Plain-English findings ready for risk-scorer / phase2 */
  findings: string[];
};

export type ChainDocumentInput = {
  documentId: string;
  documentType: string;
  fileName?: string;
  smartFields: any;
};

// ---------------------------------------------------------------------------
// Document-type → event-type mapping
// ---------------------------------------------------------------------------

function mapEventType(documentType: string): OwnershipEventType {
  const t = (documentType || "").toUpperCase();
  if (t.includes("SALE_DEED") || t === "REGISTERED_SALE_DEED") return "SALE";
  if (t.includes("AGREEMENT_TO_SELL") || t.includes("BAYANA")) return "AGREEMENT";
  if (t.includes("MUTATION")) {
    if (t.includes("GIFT")) return "GIFT";
    if (t.includes("INHERIT") || t.includes("SUCCESSION")) return "INHERITANCE";
    if (t.includes("MORTGAGE")) return "MORTGAGE";
    return "MUTATION";
  }
  if (t.includes("GIFT") || t.includes("HIBA")) return "GIFT";
  if (t.includes("FARD") || t.includes("OWNERSHIP")) return "OWNERSHIP_RECORD";
  if (t.includes("MORTGAGE")) return "MORTGAGE";
  return "OTHER";
}

/** Roles that act as transferor / previous owner */
const TRANSFEROR_ROLES = new Set([
  "seller", "transferor", "landlord", "owner", "donor", "mortgagor", "principal",
]);
/** Roles that act as transferee / new owner */
const TRANSFEREE_ROLES = new Set([
  "buyer", "transferee", "tenant", "donee", "mortgagee", "attorney", "holder",
]);

function pickEntityByRoles(
  members: PartyInput[],
  entities: EntityGroup[],
  roles: Set<string>
): EntityGroup | null {
  for (const m of members) {
    if (!m.role || !roles.has(m.role.toLowerCase())) continue;
    const found = entities.find((e) =>
      e.members.some(
        (em) =>
          em.name === m.name &&
          em.documentId === m.documentId &&
          em.role === m.role
      )
    );
    if (found) return found;
  }
  // Fallback: any member of those roles by name match against entity canonical
  for (const m of members) {
    if (!m.role || !roles.has(m.role.toLowerCase())) continue;
    const found = entities.find((e) =>
      e.members.some((em) => em.name === m.name)
    );
    if (found) return found;
  }
  return null;
}

function extractDate(smartFields: any): string | null {
  const dates = smartFields?.dates ?? {};
  const candidates = [
    dates.registration_date,
    dates.execution_date,
    dates.mutation_date,
    dates.issue_date,
    dates.start_date,
    dates.signed_on,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^\d{4}-\d{2}-\d{2}/.test(c)) {
      return c.slice(0, 10);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Build ownership timeline from a multi-document scan bundle.
 *
 * Single-document case: returns a one-event timeline, no gaps/conflicts error.
 */
export function buildOwnershipTimeline(
  documents: ChainDocumentInput[]
): ChainOfTitleResult {
  if (!Array.isArray(documents) || documents.length === 0) {
    return {
      timeline: [],
      gaps: [],
      conflicts: [],
      entities: [],
      isComplete: false,
      findings: [],
    };
  }

  // 1. Collect all parties across docs → resolve entities
  const allParties: PartyInput[] = [];
  for (const doc of documents) {
    const parties = partiesFromSmartFields(doc.smartFields, {
      documentId: doc.documentId,
      documentType: doc.documentType,
    });
    allParties.push(...parties);
  }
  const entities = resolveEntities(allParties);

  // 2. Build one event per document that looks like a transfer / ownership record
  const events: OwnershipEvent[] = [];
  for (const doc of documents) {
    const eventType = mapEventType(doc.documentType);
    if (eventType === "OTHER") continue;

    const docParties = partiesFromSmartFields(doc.smartFields, {
      documentId: doc.documentId,
      documentType: doc.documentType,
    });

    const transferor = pickEntityByRoles(docParties, entities, TRANSFEROR_ROLES);
    const transferee = pickEntityByRoles(docParties, entities, TRANSFEREE_ROLES);
    const date = extractDate(doc.smartFields);

    // For Fard / ownership records, the "owner" is the transferee (current holder)
    let tfr = transferor;
    let tfe = transferee;
    if (eventType === "OWNERSHIP_RECORD" && !tfe) {
      tfe = pickEntityByRoles(docParties, entities, new Set(["owner", "holder", "co_owner"]));
    }

    events.push({
      date,
      eventType,
      transferor: tfr,
      transferee: tfe,
      documentId: doc.documentId,
      documentType: doc.documentType,
      fileName: doc.fileName,
      verified: Boolean(tfe || tfr),
      notes: undefined,
    });
  }

  // 3. Sort chronologically (undated last)
  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  // 4. Detect gaps & conflicts
  const gaps: TimelineGap[] = [];
  const conflicts: TimelineConflict[] = [];

  detectChronologicalGaps(events, gaps);
  detectMissingLinks(events, gaps);
  detectPartyMismatches(events, conflicts);
  detectDateOrderIssues(documents, conflicts);

  // 5. Completeness heuristic
  const hasSaleOrMutation = events.some(
    (e) => e.eventType === "SALE" || e.eventType === "MUTATION" || e.eventType === "GIFT"
  );
  const hasOwnershipRecord = events.some((e) => e.eventType === "OWNERSHIP_RECORD");
  const isComplete =
    documents.length >= 2 &&
    hasSaleOrMutation &&
    gaps.filter((g) => g.severity === "CRITICAL").length === 0 &&
    conflicts.filter((c) => c.severity === "CRITICAL").length === 0;

  // 6. Findings for risk pipeline
  const findings = [
    ...gaps.map((g) => g.message),
    ...conflicts.map((c) => c.message),
  ];

  return {
    timeline: events,
    gaps,
    conflicts,
    entities,
    isComplete,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

function detectChronologicalGaps(events: OwnershipEvent[], gaps: TimelineGap[]): void {
  const dated = events.filter((e) => e.date);
  for (let i = 1; i < dated.length; i++) {
    const prev = dated[i - 1];
    const curr = dated[i];
    if (!prev.date || !curr.date) continue;
    const years =
      (Date.parse(curr.date) - Date.parse(prev.date)) / (365.25 * 24 * 3600 * 1000);
    if (years > 2) {
      gaps.push({
        kind: "CHRONOLOGICAL_GAP",
        message: `Ownership timeline has a ${years.toFixed(1)}-year gap between ${prev.eventType} (${prev.date}) and ${curr.eventType} (${curr.date}) — request intermediate documents`,
        severity: years > 5 ? "HIGH" : "MEDIUM",
        relatedDocumentIds: [prev.documentId, curr.documentId],
        gapYears: Math.round(years * 10) / 10,
      });
    }
  }
}

function detectMissingLinks(events: OwnershipEvent[], gaps: TimelineGap[]): void {
  // If we have a SALE/MUTATION and a later Fard, the Fard's owner should
  // match the most recent transferee. If not → unexplained owner.
  const transfers = events.filter(
    (e) =>
      e.eventType === "SALE" ||
      e.eventType === "MUTATION" ||
      e.eventType === "GIFT" ||
      e.eventType === "INHERITANCE"
  );
  const fards = events.filter((e) => e.eventType === "OWNERSHIP_RECORD");

  if (transfers.length > 0 && fards.length > 0) {
    const lastTransfer = transfers[transfers.length - 1];
    for (const fard of fards) {
      if (!fard.transferee || !lastTransfer.transferee) continue;
      if (fard.transferee.entityId === lastTransfer.transferee.entityId) continue;

      // Fard owner differs from last known transferee
      gaps.push({
        kind: "UNEXPLAINED_OWNER",
        message: `Fard shows owner "${fard.transferee.canonicalName}" but the most recent transfer (${lastTransfer.eventType}) names "${lastTransfer.transferee.canonicalName}" as buyer/transferee — missing link in chain of title`,
        severity: "CRITICAL",
        relatedDocumentIds: [lastTransfer.documentId, fard.documentId],
      });
    }
  }

  // SALE without any MUTATION in the bundle (common gap in Pakistan)
  const hasSale = events.some((e) => e.eventType === "SALE");
  const hasMutation = events.some((e) => e.eventType === "MUTATION" || e.eventType === "GIFT" || e.eventType === "INHERITANCE");
  if (hasSale && !hasMutation && events.length >= 1) {
    const sale = events.find((e) => e.eventType === "SALE")!;
    gaps.push({
      kind: "MISSING_LINK",
      message: `Sale Deed present but no Mutation (Inteqal) found in this bundle — registry transfer may not be reflected in revenue record`,
      severity: "HIGH",
      relatedDocumentIds: [sale.documentId],
    });
  }
}

function detectPartyMismatches(events: OwnershipEvent[], conflicts: TimelineConflict[]): void {
  // Consecutive transfers: prev.transferee should equal curr.transferor
  const transfers = events.filter(
    (e) =>
      e.eventType === "SALE" ||
      e.eventType === "MUTATION" ||
      e.eventType === "GIFT" ||
      e.eventType === "INHERITANCE"
  );

  for (let i = 1; i < transfers.length; i++) {
    const prev = transfers[i - 1];
    const curr = transfers[i];
    if (!prev.transferee || !curr.transferor) continue;
    if (prev.transferee.entityId === curr.transferor.entityId) continue;

    conflicts.push({
      kind: "PARTY_MISMATCH",
      message: `Chain break: "${prev.transferee.canonicalName}" received title in ${prev.eventType} but "${curr.transferor.canonicalName}" appears as transferor in the next ${curr.eventType} — parties do not match`,
      severity: "CRITICAL",
      relatedDocumentIds: [prev.documentId, curr.documentId],
    });
  }
}

function detectDateOrderIssues(
  documents: ChainDocumentInput[],
  conflicts: TimelineConflict[]
): void {
  for (const doc of documents) {
    const dates = doc.smartFields?.dates ?? {};
    const exec = typeof dates.execution_date === "string" ? dates.execution_date.slice(0, 10) : null;
    const reg = typeof dates.registration_date === "string" ? dates.registration_date.slice(0, 10) : null;

    if (exec && reg && exec > reg) {
      conflicts.push({
        kind: "DATE_ORDER",
        message: `Document ${doc.fileName || doc.documentId}: execution date (${exec}) is after registration date (${reg}) — chronologically impossible`,
        severity: "HIGH",
        relatedDocumentIds: [doc.documentId],
      });
    }
  }

  // Bayana must precede Sale Deed for same property (best-effort)
  const bayanas = documents.filter((d) =>
    /AGREEMENT_TO_SELL|BAYANA/i.test(d.documentType)
  );
  const sales = documents.filter((d) =>
    /SALE_DEED|REGISTERED_SALE/i.test(d.documentType)
  );
  for (const b of bayanas) {
    const bDate = extractDate(b.smartFields);
    if (!bDate) continue;
    for (const s of sales) {
      const sDate = extractDate(s.smartFields);
      if (!sDate) continue;
      if (bDate > sDate) {
        conflicts.push({
          kind: "DATE_ORDER",
          message: `Bayana/Agreement dated ${bDate} is after Sale Deed dated ${sDate} — chronologically impossible for the same transaction`,
          severity: "CRITICAL",
          relatedDocumentIds: [b.documentId, s.documentId],
        });
      }
    }
  }
}

/**
 * Convert chain findings into risk-scorer style factors.
 */
export function chainFindingsToRiskFactors(
  result: ChainOfTitleResult
): Array<{ label: string; points: number; category: "legal" }> {
  const factors: Array<{ label: string; points: number; category: "legal" }> = [];

  for (const g of result.gaps) {
    const points = g.severity === "CRITICAL" ? -3 : g.severity === "HIGH" ? -2 : -1;
    factors.push({ label: g.message.slice(0, 180), points, category: "legal" });
  }
  for (const c of result.conflicts) {
    const points = c.severity === "CRITICAL" ? -3 : c.severity === "HIGH" ? -2 : -1;
    factors.push({ label: c.message.slice(0, 180), points, category: "legal" });
  }

  return factors;
}
