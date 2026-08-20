/**
 * Entity Resolver — Chain of Title Session 3
 *
 * Reliably identifies when "Muhammad Tariq" in a Sale Deed is the same
 * person as "M. Tariq" in a Mutation and "Tariq" in a Fard.
 *
 * Ground truth hierarchy:
 *   1. CNIC exact match  → same person (even if names differ → warning)
 *   2. Different CNIC    → different person (even if names match)
 *   3. No CNIC           → fuzzy name + optional father-name match
 */

import { distance as levenshtein } from "fastest-levenshtein";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PartyInput = {
  /** Display / extracted name */
  name: string;
  /** Optional CNIC (any format) */
  cnic?: string | null;
  /** Optional father / husband name */
  fatherName?: string | null;
  /** Role in the source document (seller, buyer, owner, …) */
  role?: string;
  /** Source document id */
  documentId?: string;
  /** Source document type */
  documentType?: string;
};

export type NameMatchResult = {
  match: boolean;
  confidence: number; // 0–1
  reason: string;
};

export type EntityGroup = {
  /** Stable id for this identity within the current resolution pass */
  entityId: string;
  /** Best display name (longest / most complete) */
  canonicalName: string;
  /** Normalised form used for matching */
  normalisedName: string;
  /** Ground-truth CNIC if any member has one */
  cnic: string | null;
  /** Father name if available */
  fatherName: string | null;
  /** All contributing party records */
  members: PartyInput[];
  /** Aggregate confidence 0–1 */
  confidence: number;
  /** Warnings (e.g. same CNIC but divergent names) */
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Pakistani name normalisation
// ---------------------------------------------------------------------------

/** Ordered replacement pairs: [pattern, replacement] */
const NAME_REPLACEMENTS: Array<[RegExp, string]> = [
  // Honorifics / titles stripped
  [/\b(mr|mrs|ms|miss|dr|eng|adv|haji|hajj|syed|sayed|sayyed)\b\.?/gi, ""],
  // Relationship prefixes stripped (kept only when we need them elsewhere)
  [/\b(s\/o|d\/o|w\/o|son of|daughter of|wife of|s\.o\.|d\.o\.|w\.o\.)\b/gi, ""],
  // Muhammad family
  [/\b(muhammad|mohammad|mohammed|mohd|md|moh|mhd|m\.?)\b/gi, "muhammad"],
  // Ahmed / Ahmad
  [/\b(ahmed|ahmad|ahm)\b/gi, "ahmad"],
  // Rahman / Rehman
  [/\b(ur[\s-]?rahman|ur[\s-]?rehman|urrehman|urrahman|rehman|rahman)\b/gi, "ur rahman"],
  // Common given-name variants
  [/\b(tariq|tareeq|tarik|tareq|tariqe)\b/gi, "tariq"],
  [/\b(hussain|husain|hussein|hosein)\b/gi, "hussain"],
  [/\b(ali|aly)\b/gi, "ali"],
  [/\b(hassan|hasan|hassen)\b/gi, "hassan"],
  [/\b(husnain|hasnain)\b/gi, "hasnain"],
  [/\b(usman|othman|osman)\b/gi, "usman"],
  [/\b(bilal|balaal)\b/gi, "bilal"],
  [/\b(imran|emran)\b/gi, "imran"],
  [/\b(farooq|farouk|farook)\b/gi, "farooq"],
  [/\b(shaikh|sheikh|shaykh)\b/gi, "sheikh"],
  [/\b(khan|khaan)\b/gi, "khan"],
  [/\b(malik|mallick)\b/gi, "malik"],
  [/\b(chaudhry|chaudhary|chowdhury|chaudhari)\b/gi, "chaudhry"],
  [/\b(butt|bhat)\b/gi, "butt"],
  [/\b(qureshi|quraishi|qurashi)\b/gi, "qureshi"],
  [/\b(abdul|abd|abdl)\b/gi, "abdul"],
  [/\b(fatima|fatimah)\b/gi, "fatima"],
  [/\b(aisha|ayesha|ayesha)\b/gi, "aisha"],
  [/\b(zainab|zenab|zaynab)\b/gi, "zainab"],
  [/\b(maryam|mariam|mariyam)\b/gi, "maryam"],
  [/\b(saima|syma)\b/gi, "saima"],
  [/\b(nadeem|nadim)\b/gi, "nadeem"],
  [/\b(waqar|waqqar)\b/gi, "waqar"],
  [/\b(shahid|shaheed)\b/gi, "shahid"],
  [/\b(javed|javaid|jawed)\b/gi, "javed"],
  [/\b(rafiq|rafeeq|rafique)\b/gi, "rafiq"],
  [/\b(saleem|salim|salem)\b/gi, "saleem"],
  [/\b(kareem|karim)\b/gi, "kareem"],
  [/\b(nawab|nawaab)\b/gi, "nawab"],
];

/**
 * Normalise a Pakistani personal name for comparison.
 * - Applies transliteration variants
 * - Strips honorifics and S/O D/O W/O clauses
 * - Lowercases, collapses whitespace, strips punctuation
 */
export function normaliseName(name: string): string {
  if (!name || typeof name !== "string") return "";

  let s = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // strip diacritics

  // Drop everything after S/O, D/O, W/O (father/husband clause)
  s = s.replace(/\b(s\/o|d\/o|w\/o|son of|daughter of|wife of|s\.o\.|d\.o\.|w\.o\.)\b[\s\S]*$/i, "");

  // Drop parenthetical CNIC / NICOP fragments
  s = s.replace(/\([^)]*cnic[^)]*\)/gi, "");
  s = s.replace(/\b\d{5}[-\s]?\d{7}[-\s]?\d\b/g, "");

  // Apply replacement table
  for (const [pat, rep] of NAME_REPLACEMENTS) {
    s = s.replace(pat, rep);
  }

  // Lowercase, keep letters/numbers/spaces only, collapse whitespace
  s = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

/**
 * Normalise a CNIC to 13 digits (no dashes). Returns null if invalid.
 */
export function normaliseCnic(cnic: string | null | undefined): string | null {
  if (!cnic || typeof cnic !== "string") return null;
  const digits = cnic.replace(/[^0-9]/g, "");
  if (digits.length !== 13) return null;
  return digits;
}

// ---------------------------------------------------------------------------
// Name matching
// ---------------------------------------------------------------------------

/**
 * Compare two names. Optionally include father names to boost confidence.
 */
export function matchNames(
  a: string,
  b: string,
  opts?: { fatherNameA?: string | null; fatherNameB?: string | null }
): NameMatchResult {
  const na = normaliseName(a);
  const nb = normaliseName(b);

  if (!na || !nb) {
    return { match: false, confidence: 0, reason: "Empty name after normalisation" };
  }

  // Exact normalised match
  if (na === nb) {
    return { match: true, confidence: 1, reason: "Exact match (normalised)" };
  }

  // Token-set equality (order-independent): "tariq muhammad" == "muhammad tariq"
  const tokensA = new Set(na.split(" ").filter(Boolean));
  const tokensB = new Set(nb.split(" ").filter(Boolean));
  if (tokensA.size === tokensB.size && [...tokensA].every((t) => tokensB.has(t))) {
    return { match: true, confidence: 0.95, reason: "Token-set match (order-independent)" };
  }

  // One name is a proper subset of the other (e.g. "tariq" vs "muhammad tariq")
  const subset =
    (tokensA.size < tokensB.size && [...tokensA].every((t) => tokensB.has(t))) ||
    (tokensB.size < tokensA.size && [...tokensB].every((t) => tokensA.has(t)));
  if (subset) {
    // Guard: single short token subset is weak ("ali" vs "muhammad ali khan")
    const smaller = tokensA.size <= tokensB.size ? tokensA : tokensB;
    if (smaller.size >= 2 || (smaller.size === 1 && [...smaller][0].length >= 5)) {
      return { match: true, confidence: 0.8, reason: "Subset match (abbreviated form)" };
    }
  }

  // Levenshtein on the full normalised strings
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  const ratio = 1 - dist / maxLen;

  if (dist <= 2 && ratio >= 0.85) {
    return { match: true, confidence: Math.max(0.7, ratio), reason: `Fuzzy match (dist=${dist})` };
  }

  // Father-name boost: if given names are close and fathers match, accept
  if (opts?.fatherNameA && opts?.fatherNameB) {
    const fa = normaliseName(opts.fatherNameA);
    const fb = normaliseName(opts.fatherNameB);
    if (fa && fb && (fa === fb || levenshtein(fa, fb) <= 2)) {
      if (ratio >= 0.7) {
        return {
          match: true,
          confidence: Math.max(0.75, ratio),
          reason: "Fuzzy name + matching father name",
        };
      }
    }
  }

  return { match: false, confidence: ratio, reason: "No match" };
}

// ---------------------------------------------------------------------------
// Entity resolution (group parties into unique identities)
// ---------------------------------------------------------------------------

let _entityCounter = 0;
function nextEntityId(): string {
  _entityCounter += 1;
  return `ent_${_entityCounter}`;
}

/** Reset id counter — useful in tests */
export function resetEntityCounter(): void {
  _entityCounter = 0;
}

/**
 * Group parties from one or more documents into unique EntityGroups.
 *
 * Algorithm:
 *  1. Partition by CNIC (ground truth) when present.
 *  2. For parties without CNIC, try to attach to an existing CNIC group via name match.
 *  3. Remaining parties are clustered by fuzzy name (+ father name).
 */
export function resolveEntities(parties: PartyInput[]): EntityGroup[] {
  resetEntityCounter();
  if (!Array.isArray(parties) || parties.length === 0) return [];

  // Working set with normalised fields
  type Node = PartyInput & {
    _normName: string;
    _normCnic: string | null;
    _normFather: string | null;
    _assigned: boolean;
  };

  const nodes: Node[] = parties
    .filter((p) => p && typeof p.name === "string" && p.name.trim().length > 0)
    .map((p) => ({
      ...p,
      _normName: normaliseName(p.name),
      _normCnic: normaliseCnic(p.cnic),
      _normFather: p.fatherName ? normaliseName(p.fatherName) : null,
      _assigned: false,
    }));

  const groups: EntityGroup[] = [];

  // --- Pass 1: group by identical CNIC ---
  const byCnic = new Map<string, Node[]>();
  for (const n of nodes) {
    if (!n._normCnic) continue;
    const list = byCnic.get(n._normCnic) ?? [];
    list.push(n);
    byCnic.set(n._normCnic, list);
  }

  for (const [cnic, members] of byCnic) {
    members.forEach((m) => {
      m._assigned = true;
    });
    const canonical = pickCanonicalName(members);
    const fathers = members.map((m) => m._normFather).filter(Boolean) as string[];
    const warnings: string[] = [];

    // Divergent names under same CNIC
    const uniqueNorms = new Set(members.map((m) => m._normName).filter(Boolean));
    if (uniqueNorms.size > 1) {
      warnings.push(
        `Same CNIC (${formatCnic(cnic)}) appears with divergent names: ${[...uniqueNorms].join(" / ")}`
      );
    }

    groups.push({
      entityId: nextEntityId(),
      canonicalName: canonical,
      normalisedName: normaliseName(canonical),
      cnic,
      fatherName: fathers[0] ?? null,
      members: members.map(stripInternal),
      confidence: 1,
      warnings,
    });
  }

  // --- Pass 2: attach CNIC-less parties to existing CNIC groups via name ---
  for (const n of nodes) {
    if (n._assigned) continue;
    let best: { group: EntityGroup; conf: number } | null = null;

    for (const g of groups) {
      if (!g.cnic) continue;
      const result = matchNames(n.name, g.canonicalName, {
        fatherNameA: n.fatherName,
        fatherNameB: g.fatherName,
      });
      // Also try against each member name
      let conf = result.match ? result.confidence : 0;
      for (const m of g.members) {
        const r2 = matchNames(n.name, m.name, {
          fatherNameA: n.fatherName,
          fatherNameB: m.fatherName,
        });
        if (r2.match && r2.confidence > conf) conf = r2.confidence;
      }
      if (conf >= 0.8 && (!best || conf > best.conf)) {
        best = { group: g, conf };
      }
    }

    if (best) {
      n._assigned = true;
      best.group.members.push(stripInternal(n));
      // Upgrade canonical if this name is more complete
      if (n.name.length > best.group.canonicalName.length) {
        best.group.canonicalName = n.name.trim();
        best.group.normalisedName = normaliseName(n.name);
      }
      best.group.confidence = Math.min(best.group.confidence, best.conf);
    }
  }

  // --- Pass 3: cluster remaining CNIC-less parties by fuzzy name ---
  const unassigned = nodes.filter((n) => !n._assigned);
  for (const n of unassigned) {
    if (n._assigned) continue;
    // Try to join an existing no-CNIC group
    let joined = false;
    for (const g of groups) {
      if (g.cnic) continue; // only no-CNIC groups here
      const result = matchNames(n.name, g.canonicalName, {
        fatherNameA: n.fatherName,
        fatherNameB: g.fatherName,
      });
      if (result.match && result.confidence >= 0.8) {
        n._assigned = true;
        g.members.push(stripInternal(n));
        if (n.name.length > g.canonicalName.length) {
          g.canonicalName = n.name.trim();
          g.normalisedName = normaliseName(n.name);
        }
        g.confidence = Math.min(g.confidence, result.confidence);
        joined = true;
        break;
      }
    }
    if (!joined) {
      n._assigned = true;
      groups.push({
        entityId: nextEntityId(),
        canonicalName: n.name.trim(),
        normalisedName: n._normName,
        cnic: null,
        fatherName: n._normFather,
        members: [stripInternal(n)],
        confidence: 0.7, // single observation, no CNIC
        warnings: [],
      });
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickCanonicalName(members: Array<{ name: string }>): string {
  // Prefer the longest non-empty name (usually most complete)
  return members.reduce((best, m) => (m.name.trim().length > best.length ? m.name.trim() : best), "");
}

function formatCnic(digits: string): string {
  if (digits.length !== 13) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function stripInternal<T extends Record<string, any>>(n: T): PartyInput {
  return {
    name: n.name,
    cnic: n.cnic ?? null,
    fatherName: n.fatherName ?? null,
    role: n.role,
    documentId: n.documentId,
    documentType: n.documentType,
  };
}

/**
 * Convenience: extract PartyInput[] from a smartFields.parties object.
 */
export function partiesFromSmartFields(
  smartFields: any,
  meta?: { documentId?: string; documentType?: string }
): PartyInput[] {
  if (!smartFields?.parties) return [];
  const p = smartFields.parties;
  const out: PartyInput[] = [];

  const push = (role: string, obj: any) => {
    if (!obj || typeof obj !== "object") return;
    if (!obj.name || typeof obj.name !== "string") return;
    out.push({
      name: obj.name,
      cnic: obj.cnic ?? null,
      fatherName: obj.father_name ?? obj.fatherName ?? null,
      role,
      documentId: meta?.documentId,
      documentType: meta?.documentType,
    });
  };

  // Common role keys across document types
  const roles = [
    "seller", "buyer", "landlord", "tenant", "owner", "holder",
    "principal", "attorney", "transferor", "transferee",
    "mortgagor", "mortgagee", "donor", "donee",
  ];
  for (const r of roles) push(r, p[r]);

  if (Array.isArray(p.witnesses)) {
    for (const w of p.witnesses) push("witness", w);
  }
  if (Array.isArray(p.co_owners)) {
    for (const c of p.co_owners) push("co_owner", c);
  }
  if (Array.isArray(p.additional_parties)) {
    for (const a of p.additional_parties) push(a.role || "additional", a);
  }

  return out;
}
