"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";

export type PropertyContext = "society" | "revenue" | "tenancy";

type TrapDef = {
  id: string;
  label: string;
  scoreImpact: number;
  flag: string;
  badge: "warn" | "danger";
  badgeLabel: string;
};

const CONTEXT = {
  society: {
    label: "Society / Apartment",
    short: "Society",
    icon: "🏢",
    hint: "DHA, CDA, RDA, Bahria, private societies",
    tags: ["Allotment Letter", "NDC / No Demand", "Site Plan", "Society Transfer", "NOC"] as const,
    registerHref: "/register?context=society",
    defaultTrapIds: ["noc"] as string[],
    traps: [
      {
        id: "noc",
        label: "Society allotment vs NOC beneficiary mismatch",
        scoreImpact: 20,
        flag: "Flagged: allotment letter holder ≠ NOC beneficiary.",
        badge: "warn" as const,
        badgeLabel: "Caution",
      },
      {
        id: "dues",
        label: "Unpaid society transfer / maintenance dues on NDC",
        scoreImpact: 15,
        flag: "Flagged: NDC shows outstanding dues before transfer.",
        badge: "warn" as const,
        badgeLabel: "Caution",
      },
      {
        id: "poa",
        label: "Sub-attorney signing without master PoA verification",
        scoreImpact: 25,
        flag: "Flagged: sub-PoA lacks verified master authority chain.",
        badge: "danger" as const,
        badgeLabel: "Fail",
      },
    ] satisfies TrapDef[],
  },
  revenue: {
    label: "Revenue Land / Patwari",
    short: "Revenue",
    icon: "🚜",
    hint: "Fard, Khasra, Khatooni, stamp-paper deeds",
    tags: ["Fard-e-Malkiat", "Khasra / Khatooni", "Stamp-paper Sale Deed", "Mutation (Inteqal)", "Jamabandi"] as const,
    registerHref: "/register?context=revenue",
    defaultTrapIds: ["inteqal"] as string[],
    traps: [
      {
        id: "inteqal",
        label: "Registered sale deed without PLRA Inteqal entry",
        scoreImpact: 28,
        flag: "Flagged: deed exists without matching PLRA mutation entry.",
        badge: "warn" as const,
        badgeLabel: "Caution",
      },
      {
        id: "poa",
        label: "Power of Attorney chain break in historical registry",
        scoreImpact: 22,
        flag: "Flagged: PoA name does not match deed seller.",
        badge: "danger" as const,
        badgeLabel: "Fail",
      },
      {
        id: "khasra",
        label: "Area dimension mismatch between Fard & Aks-Shajra",
        scoreImpact: 18,
        flag: "Flagged: Khasra area figures disagree across source pages.",
        badge: "danger" as const,
        badgeLabel: "Fail",
      },
    ] satisfies TrapDef[],
  },
  tenancy: {
    label: "Tenancy / Lease",
    short: "Tenancy",
    icon: "📄",
    hint: "Rent agreements, lease deeds, landlord title cross-checks",
    tags: ["Tenancy Agreement", "Lease Deed", "Rent Receipts", "Landlord Fard / Title", "CNIC of parties"] as const,
    registerHref: "/register?context=tenancy",
    defaultTrapIds: ["landlord"] as string[],
    traps: [
      {
        id: "landlord",
        label: "Landlord name not on supplied ownership record",
        scoreImpact: 26,
        flag: "Flagged: landlord on tenancy form ≠ owner on Fard / title pack.",
        badge: "danger" as const,
        badgeLabel: "Fail",
      },
      {
        id: "term",
        label: "Lease term or rent figures inconsistent across pages",
        scoreImpact: 16,
        flag: "Flagged: term or consideration amounts disagree between pages.",
        badge: "warn" as const,
        badgeLabel: "Caution",
      },
      {
        id: "stamp",
        label: "Stamp / registration cues missing on lease instrument",
        scoreImpact: 18,
        flag: "Flagged: lease appears unstamped or registration cues absent.",
        badge: "warn" as const,
        badgeLabel: "Caution",
      },
    ] satisfies TrapDef[],
  },
} as const;

const TIP: Record<string, string> = {
  "Khasra / Khatooni": "Khasra is the plot id; Khatooni groups ownership shares — both must reconcile with the deed.",
  "NDC / No Demand": "No Demand Certificate confirms society dues are clear before transfer.",
  NOC: "Society NOC authorises transfer; name must match allotment and buyer identity.",
  "Mutation (Inteqal)": "Inteqal updates revenue records after a registered deed — deed alone is not enough.",
  "Allotment Letter": "Allotment establishes society entitlement; compare to NOC and buyer identity.",
  "Tenancy Agreement": "Private rent contract — check landlord authority against ownership documents.",
  "Lease Deed": "Often registered or stamped; term and parties must be consistent end-to-end.",
  "Landlord Fard / Title": "Proves the lessor can grant possession — critical for tenant due diligence.",
};

const PACKETS: Record<PropertyContext, { title: string; items: string[] }[]> = {
  revenue: [
    {
      title: "Punjab / PLRA typical packet",
      items: ["Latest Fard-e-Malkiat", "Registered sale deed (if any)", "Mutation / Inteqal proof", "CNIC copies of parties"],
    },
    {
      title: "Islamabad revenue notes",
      items: ["Fard from relevant tehsil", "Prior chain deeds", "Any court / charge documents"],
    },
  ],
  society: [
    {
      title: "DHA / CDA / RDA style packet",
      items: ["Allotment / allocation letter", "NDC / No Demand", "Society NOC", "Site plan / possession letter"],
    },
    {
      title: "Transfer extras",
      items: ["Prior transfer letters", "PoA if attorney is signing", "Paid dues receipts"],
    },
  ],
  tenancy: [
    {
      title: "Tenant due-diligence packet",
      items: ["Signed tenancy / lease agreement", "Landlord ownership proof (Fard or society title)", "CNIC of landlord & tenant", "Rent payment trail if renewing"],
    },
    {
      title: "Risk checks",
      items: ["Landlord matches title", "Stamp / registration where required", "Sub-lease authority if applicable"],
    },
  ],
};

function scoreTone(score: number): "pass" | "warn" | "fail" {
  if (score >= 80) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

function toneLabel(tone: "pass" | "warn" | "fail"): string {
  if (tone === "pass") return "Pass";
  if (tone === "warn") return "Caution";
  return "Fail";
}

export function HeroInteractive() {
  const [context, setContext] = useState<PropertyContext>("revenue");
  const [traps, setTraps] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CONTEXT.revenue.traps.map((t) => [t.id, CONTEXT.revenue.defaultTrapIds.includes(t.id)])),
  );
  const [pending, startTransition] = useTransition();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const ctx = CONTEXT[context];

  const selectContext = useCallback((next: PropertyContext) => {
    startTransition(() => {
      setContext(next);
      const defaults = CONTEXT[next].defaultTrapIds;
      setTraps(Object.fromEntries(CONTEXT[next].traps.map((t) => [t.id, defaults.includes(t.id)])));
    });
  }, []);

  const onTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, current: PropertyContext) => {
      const order: PropertyContext[] = ["society", "revenue", "tenancy"];
      const idx = order.indexOf(current);
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectContext(order[(idx + 1) % order.length]);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectContext(order[(idx + order.length - 1) % order.length]);
      }
      if (event.key === "Home") {
        event.preventDefault();
        selectContext("society");
      }
      if (event.key === "End") {
        event.preventDefault();
        selectContext("tenancy");
      }
    },
    [selectContext],
  );

  const { score, activeFlags, tone } = useMemo(() => {
    const active = ctx.traps.filter((t) => traps[t.id]);
    const penalty = active.reduce((s, t) => s + t.scoreImpact, 0);
    const score = Math.max(18, 88 - penalty);
    return { score, activeFlags: active, tone: scoreTone(score) };
  }, [ctx.traps, traps]);

  function toggleTrap(id: string) {
    startTransition(() => {
      setTraps((prev) => ({ ...prev, [id]: !prev[id] }));
    });
  }

  const registerHref = useMemo(() => {
    const active = Object.entries(traps)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(",");
    return active ? `${ctx.registerHref}&traps=${active}` : ctx.registerHref;
  }, [ctx.registerHref, traps]);

  const tabIds: PropertyContext[] = ["society", "revenue", "tenancy"];

  return (
    <div className="hero-interactive">
      <div className="context-tabs three" role="tablist" aria-label="Property context">
        {tabIds.map((id) => {
          const c = CONTEXT[id];
          const selected = context === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={selected}
              aria-controls="context-panel"
              tabIndex={selected ? 0 : -1}
              className={`context-tab ${selected ? "active" : ""}`}
              onClick={() => selectContext(id)}
              onKeyDown={(e) => onTabKeyDown(e, id)}
            >
              <span aria-hidden>{c.icon}</span> {c.label}
              <small>{c.hint.split(",")[0]}</small>
            </button>
          );
        })}
      </div>

      <div id="context-panel" role="tabpanel" aria-labelledby={`tab-${context}`}>
        <p className="muted small context-hint">{ctx.hint}</p>

        <details
          className="doc-checklist"
          open={checklistOpen}
          onToggle={(e) => setChecklistOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary>Not sure which documents you need? Standard packets</summary>
          <div className="checklist-grid">
            {PACKETS[context].map((packet) => (
              <div key={packet.title}>
                <strong>{packet.title}</strong>
                <ul>
                  {packet.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="muted small">Packets vary by locality — guidance only, not legal advice.</p>
        </details>

        <div className="form-actions form-actions-stack">
          <Link className="button power power-xl cta-glow" href={registerHref}>
            Upload or scan your property documents <span className="power-arrow" aria-hidden>→</span>
          </Link>
          <Link className="button secondary" href="/sample-report">
            View sample audit report
          </Link>
        </div>
        <div className="cta-trust-row" aria-label="Trust signals">
          <span>🔒 256-bit encrypted at rest</span>
          <span>🙈 Automatic PII redaction</span>
          <span>📜 Immutable evidence hash</span>
          <span>🧱 Customer data isolation</span>
          <span>🚫 We don&apos;t sell your documents</span>
        </div>
        <p className="muted small cta-disclaimer">
          Decision-support only — not legal advice. Ownership conclusions remain with qualified professionals.
        </p>
        <div className="region-chips" aria-label="Localised rule coverage">
          <span className="region-chip">
            <strong>Punjab</strong> · PLRA
          </span>
          <span className="region-chip">
            <strong>Sindh</strong> · Revenue
          </span>
          <span className="region-chip">
            <strong>Islamabad</strong> · CDA / DHA
          </span>
        </div>

        <div className={`doc-tags ${pending ? "is-pending" : ""}`} aria-label="Document coverage">
          {ctx.tags.map((tag) => (
            <span
              key={tag}
              className="doc-tag"
              tabIndex={0}
              data-tip={TIP[tag] ?? "Document type used in Pakistani property due diligence."}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="traffic-legend" aria-label="Status legend">
          <span>
            Traffic light: <span className="status-pill pass">Pass</span>
          </span>
          <span>
            <span className="status-pill warn">Caution</span> review before funds
          </span>
          <span>
            <span className="status-pill fail">Fail</span> material risk / mismatch
          </span>
        </div>

        <div className="risk-sim" aria-label="Interactive risk simulator">
          <div className="risk-sim-panel">
            <h3>Select common traps</h3>
            <ul className="trap-list">
              {ctx.traps.map((t) => (
                <li key={t.id}>
                  <label htmlFor={`trap-${t.id}`}>
                    <input
                      id={`trap-${t.id}`}
                      type="checkbox"
                      checked={!!traps[t.id]}
                      onChange={() => toggleTrap(t.id)}
                    />
                    <span>{t.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className="risk-sim-panel">
            <h3>Simulated result</h3>
            <div className="split-preview">
              <div>
                <div className="muted small" style={{ color: "#94a3b8" }}>
                  Document source
                </div>
                <div className={`doc-source-line ${pending ? "pulse" : ""}`} />
                <div className={`doc-source-line hi ${pending ? "pulse" : ""}`} />
                <div className={`doc-source-line ${pending ? "pulse" : ""}`} />
                <div className={`doc-source-line hi ${pending ? "pulse" : ""}`} />
                <div className={`doc-source-line ${pending ? "pulse" : ""}`} />
              </div>
              <div>
                <div className="muted small" style={{ color: "#94a3b8" }}>
                  PakkaScore
                </div>
                <div className="sim-score-wrap">
                  <div
                    className={`sim-score ${pending ? "is-pending" : ""}`}
                    style={{
                      color: tone === "pass" ? "#10b981" : tone === "warn" ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    {score}
                  </div>
                  <span className={`status-pill ${tone}`}>{toneLabel(tone)}</span>
                </div>
                {activeFlags.length === 0 ? (
                  <div className="sim-flag">
                    No traps selected — baseline clear chain. <span className="status-pill pass">Pass</span>
                  </div>
                ) : (
                  activeFlags.map((f) => (
                    <div key={f.id} className="sim-flag">
                      {f.flag}{" "}
                      <span className={`status-pill ${f.badge === "danger" ? "fail" : "warn"}`}>{f.badgeLabel}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
