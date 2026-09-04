import React, { useState, useMemo, useRef } from "react";

/* ================================================================== *
 *  ASSUMPTION SCHEMA
 *  Every number in the model is declared here. The UI is generated
 *  from this list, so adding a field here makes it editable with no
 *  other changes. `kind` drives formatting only.
 * ================================================================== */

const SCHEMA = [
  // --- Volume -----------------------------------------------------
  { id: "properties", group: "Volume", label: "Properties sold per year", kind: "num",
    hint: "The driver for every per-property cost below." },
  { id: "avgValue", group: "Volume", label: "Average property value", kind: "usd" },

  // --- Today: MSA team --------------------------------------------
  { id: "msaCount", group: "Today — MSA team", label: "MSAs", kind: "num" },
  { id: "msaBase", group: "Today — MSA team", label: "MSA base salary", kind: "usd" },
  { id: "msaTLCount", group: "Today — MSA team", label: "Team leads", kind: "num" },
  { id: "msaTLBase", group: "Today — MSA team", label: "Team lead base", kind: "usd" },
  { id: "msaMgrCount", group: "Today — MSA team", label: "Managers", kind: "num" },
  { id: "msaMgrBase", group: "Today — MSA team", label: "Manager base", kind: "usd" },
  { id: "msaVarPerProp", group: "Today — MSA team", label: "MSA variable pay per property", kind: "usd" },

  // --- Today: Disposition -----------------------------------------
  { id: "dispoCount", group: "Today — Disposition team", label: "Disposition agents", kind: "num" },
  { id: "dispoBase", group: "Today — Disposition team", label: "Disposition agent base", kind: "usd" },
  { id: "dispoLeadCount", group: "Today — Disposition team", label: "Disposition leads", kind: "num" },
  { id: "dispoLeadBase", group: "Today — Disposition team", label: "Disposition lead base", kind: "usd" },
  { id: "dispoVarPerProp", group: "Today — Disposition team", label: "Disposition commission per closing", kind: "usd" },

  // --- Merged -----------------------------------------------------
  { id: "mergedCount", group: "Merged role", label: "Merged agents", kind: "num",
    hint: "Scope per head goes up, so this is usually higher than today's MSA count." },
  { id: "mergedBase", group: "Merged role", label: "Merged agent base salary", kind: "usd",
    hint: "The uplift you'd need to pay for the broader role." },
  { id: "mergedTLCount", group: "Merged role", label: "Team leads", kind: "num" },
  { id: "mergedTLBase", group: "Merged role", label: "Team lead base", kind: "usd" },
  { id: "mergedMgrCount", group: "Merged role", label: "Managers", kind: "num" },
  { id: "mergedMgrBase", group: "Merged role", label: "Manager base", kind: "usd" },
  { id: "retainedDispo", group: "Merged role", label: "Disposition specialists retained", kind: "num",
    hint: "For complex or escalated transactions." },
  { id: "mergedVarPerProp", group: "Merged role", label: "Merged variable pay per property", kind: "usd",
    hint: "Below the sum of both roles today — one owner, no handoff double-pay." },

  // --- Comp mechanics ---------------------------------------------
  { id: "benefitsLoad", group: "Compensation mechanics", label: "Benefits + payroll burden", kind: "pct" },
  { id: "softwarePerSeat", group: "Compensation mechanics", label: "Tools and licences per seat / year", kind: "usd" },
  { id: "attrition", group: "Compensation mechanics", label: "Annual attrition", kind: "pct" },
  { id: "onboardNow", group: "Compensation mechanics", label: "Onboarding cost per hire, today", kind: "usd" },
  { id: "onboardMerged", group: "Compensation mechanics", label: "Onboarding cost per hire, merged", kind: "usd",
    hint: "Higher — a new hire now learns both jobs." },

  // --- Speed ------------------------------------------------------
  { id: "domDays", group: "Speed and holding", label: "Days on market, list to contract", kind: "days" },
  { id: "handoffDays", group: "Speed and holding", label: "Days lost to MSA→disposition handoff", kind: "days",
    hint: "Goes to zero when one person owns the property end to end." },
  { id: "dailyHold", group: "Speed and holding", label: "Daily holding cost per property", kind: "usd",
    hint: "Taxes, insurance, HOA, utilities, cost of capital." },
  { id: "domImprovement", group: "Speed and holding", label: "Further days saved from single ownership", kind: "days",
    hint: "Faster pricing and repair decisions, on top of removing the handoff." },

  // --- Property economics -----------------------------------------
  { id: "repairPerProp", group: "Property economics", label: "Repair spend per property", kind: "usd" },
  { id: "repairReduction", group: "Property economics", label: "Repair spend reduction, merged", kind: "pct",
    hint: "The person choosing repairs also owns the sale price." },
  { id: "shareReduced", group: "Property economics", label: "Share of properties taking a price cut", kind: "pct" },
  { id: "reductionPct", group: "Property economics", label: "Average price cut, % of value", kind: "pct" },
  { id: "reductionImprove", group: "Property economics", label: "Price cut avoided, percentage points", kind: "pp",
    hint: "Better initial pricing from the person who has been in the house." },

  // --- Transition -------------------------------------------------
  { id: "crossTrain", group: "One-time transition", label: "Cross-training cost per agent", kind: "usd" },
  { id: "rampWeeks", group: "One-time transition", label: "Ramp period, weeks", kind: "days" },
  { id: "rampLoss", group: "One-time transition", label: "Productivity lost during ramp", kind: "pct" },
];

const DEFAULTS = {
  properties: 480, avgValue: 385000,
  msaCount: 20, msaBase: 62000, msaTLCount: 2, msaTLBase: 95000,
  msaMgrCount: 1, msaMgrBase: 135000, msaVarPerProp: 250,
  dispoCount: 7, dispoBase: 75000, dispoLeadCount: 1, dispoLeadBase: 105000,
  dispoVarPerProp: 1200,
  mergedCount: 22, mergedBase: 78000, mergedTLCount: 3, mergedTLBase: 95000,
  mergedMgrCount: 1, mergedMgrBase: 135000, retainedDispo: 1, mergedVarPerProp: 1300,
  benefitsLoad: 28, softwarePerSeat: 2400, attrition: 18,
  onboardNow: 6500, onboardMerged: 11000,
  domDays: 62, handoffDays: 6, dailyHold: 95, domImprovement: 4,
  repairPerProp: 8500, repairReduction: 5, shareReduced: 55,
  reductionPct: 2.4, reductionImprove: 0.35,
  crossTrain: 4500, rampWeeks: 3, rampLoss: 40,
};

const GROUPS = [...new Set(SCHEMA.map((s) => s.group))];

/* Custom variables the user adds at runtime. `basis` decides how the
   amount is scaled; `scope` decides which side of the comparison it
   lands on. This is what makes an added variable actually move the
   answer instead of just sitting in a list. */
const BASES = {
  fixed: { label: "Flat annual cost", scale: () => 1 },
  perAgent: { label: "Per agent, per year", scale: (m) => m.headcount },
  perProperty: { label: "Per property", scale: (m) => m.properties },
  oneTime: { label: "One-time cost", scale: () => 1 },
};

/* ================================================================== *
 *  ENGINE
 * ================================================================== */

function compute(raw, custom) {
  const A = {};
  for (const k in raw) A[k] = Number(raw[k]) || 0;
  const load = 1 + A.benefitsLoad / 100;
  const P = A.properties;

  const headNow =
    A.msaCount + A.msaTLCount + A.msaMgrCount + A.dispoCount + A.dispoLeadCount;
  const headMerged =
    A.mergedCount + A.mergedTLCount + A.mergedMgrCount + A.retainedDispo;

  const custFor = (scope, basis, ctx) =>
    custom
      .filter((c) => c.basis === basis && (c.scope === "both" || c.scope === scope))
      .reduce((s, c) => s + (Number(c.amount) || 0) * BASES[basis].scale(ctx), 0);

  const ctxNow = { headcount: headNow, properties: P };
  const ctxMerged = { headcount: headMerged, properties: P };

  const now = {
    fixedComp:
      (A.msaCount * A.msaBase + A.msaTLCount * A.msaTLBase + A.msaMgrCount * A.msaMgrBase +
        A.dispoCount * A.dispoBase + A.dispoLeadCount * A.dispoLeadBase) * load,
    variableComp: P * (A.msaVarPerProp + A.dispoVarPerProp),
    software: headNow * A.softwarePerSeat,
    hiring: headNow * (A.attrition / 100) * A.onboardNow,
    holding: P * (A.domDays + A.handoffDays) * A.dailyHold,
    repairs: P * A.repairPerProp,
    reductions: P * (A.shareReduced / 100) * A.avgValue * (A.reductionPct / 100),
    custom: custFor("now", "fixed", ctxNow) + custFor("now", "perAgent", ctxNow) +
      custFor("now", "perProperty", ctxNow),
  };

  const merged = {
    fixedComp:
      (A.mergedCount * A.mergedBase + A.mergedTLCount * A.mergedTLBase +
        A.mergedMgrCount * A.mergedMgrBase + A.retainedDispo * A.dispoBase) * load,
    variableComp: P * A.mergedVarPerProp,
    software: headMerged * A.softwarePerSeat,
    hiring: headMerged * (A.attrition / 100) * A.onboardMerged,
    holding: P * Math.max(0, A.domDays - A.domImprovement) * A.dailyHold,
    repairs: P * A.repairPerProp * (1 - A.repairReduction / 100),
    reductions:
      P * (A.shareReduced / 100) * A.avgValue *
      (Math.max(0, A.reductionPct - A.reductionImprove) / 100),
    custom: custFor("merged", "fixed", ctxMerged) + custFor("merged", "perAgent", ctxMerged) +
      custFor("merged", "perProperty", ctxMerged),
  };

  const LINES = [
    { id: "fixedComp", label: "Fixed compensation", bucket: "labor" },
    { id: "variableComp", label: "Variable compensation", bucket: "labor" },
    { id: "software", label: "Tools and licences", bucket: "labor" },
    { id: "hiring", label: "Hiring and onboarding", bucket: "labor" },
    { id: "holding", label: "Property holding cost", bucket: "property" },
    { id: "repairs", label: "Repair spend", bucket: "property" },
    { id: "reductions", label: "Price reductions", bucket: "property" },
    { id: "custom", label: "Custom variables", bucket: "labor" },
  ];

  const lines = LINES.map((l) => ({
    ...l, now: now[l.id], merged: merged[l.id], delta: now[l.id] - merged[l.id],
  })).filter((l) => !(l.id === "custom" && l.now === 0 && l.merged === 0));

  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const labor = lines.filter((l) => l.bucket === "labor");
  const propertyL = lines.filter((l) => l.bucket === "property");

  const totalNow = sum(lines, "now");
  const totalMerged = sum(lines, "merged");
  const recurring = totalNow - totalMerged;

  const oneTime =
    A.mergedCount * A.crossTrain +
    A.mergedCount * A.rampWeeks * (A.mergedBase / 52) * (A.rampLoss / 100) +
    custom.filter((c) => c.basis === "oneTime")
      .reduce((s, c) => s + (Number(c.amount) || 0), 0);

  return {
    A, lines, headNow, headMerged,
    laborNow: sum(labor, "now"), laborMerged: sum(labor, "merged"),
    propNow: sum(propertyL, "now"), propMerged: sum(propertyL, "merged"),
    totalNow, totalMerged, recurring, oneTime,
    yearOne: recurring - oneTime,
    pctSaved: totalNow ? (recurring / totalNow) * 100 : 0,
    perProperty: P ? recurring / P : 0,
    paybackMonths: recurring > 0 ? (oneTime / recurring) * 12 : null,
    propsPerAgentNow: A.msaCount ? P / A.msaCount : 0,
    propsPerAgentMerged: A.mergedCount ? P / A.mergedCount : 0,
  };
}

const SENSITIVE = [
  ["dailyHold", "Daily holding cost"],
  ["domImprovement", "Days saved"],
  ["mergedCount", "Merged headcount"],
  ["mergedBase", "Merged base salary"],
  ["repairReduction", "Repair reduction"],
  ["reductionImprove", "Price cut avoided"],
  ["properties", "Annual volume"],
  ["mergedVarPerProp", "Merged variable pay"],
];

function sensitivity(raw, custom, base) {
  return SENSITIVE.map(([id, label]) => {
    const lo = { ...raw, [id]: (Number(raw[id]) || 0) * 0.85 };
    const hi = { ...raw, [id]: (Number(raw[id]) || 0) * 1.15 };
    const a = compute(lo, custom).recurring;
    const b = compute(hi, custom).recurring;
    return { label, low: Math.min(a, b), high: Math.max(a, b), span: Math.abs(b - a) };
  }).filter((r) => r.span > 0).sort((x, y) => y.span - x.span);
}

/* ================================================================== *
 *  FORMATTING
 * ================================================================== */

const usd = (n) =>
  (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
const usdK = (n) => {
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
};
const fmt = (v, kind) => {
  const n = Number(v) || 0;
  if (kind === "usd") return usd(n);
  if (kind === "pct") return `${n}%`;
  if (kind === "pp") return `${n} pp`;
  if (kind === "days") return `${n}`;
  return n.toLocaleString("en-US");
};

/* ================================================================== *
 *  CHARTS
 * ================================================================== */

function Waterfall({ m }) {
  const W = 720, H = 250, pad = { t: 18, b: 46, l: 8, r: 8 };
  const steps = m.lines.filter((l) => Math.abs(l.delta) > 0.5)
    .sort((a, b) => b.delta - a.delta);
  const cols = [
    { label: "Today", value: m.totalNow, type: "total" },
    ...steps.map((s) => ({ label: s.label, value: s.delta, type: "step" })),
    { label: "Merged", value: m.totalMerged, type: "total" },
  ];
  const top = Math.max(m.totalNow, m.totalMerged) * 1.06 || 1;
  const bw = (W - pad.l - pad.r) / cols.length;
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);

  let run = m.totalNow;
  const bars = cols.map((c, i) => {
    let y0, y1;
    if (c.type === "total") { y0 = y(c.value); y1 = y(0); }
    else {
      const after = run - c.value;
      y0 = y(Math.max(run, after)); y1 = y(Math.min(run, after));
      run = after;
    }
    return { ...c, x: pad.l + i * bw + bw * 0.16, w: bw * 0.68, y: y0, h: Math.max(1.5, y1 - y0) };
  });

  return (
    <svg className="rm-svg" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label="Waterfall from today's total cost to merged total cost">
      <line x1={pad.l} y1={y(0)} x2={W - pad.r} y2={y(0)} className="rm-axis" />
      {bars.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h}
            className={b.type === "total" ? "rm-bar-total"
              : b.value >= 0 ? "rm-bar-save" : "rm-bar-cost"} />
          <text x={b.x + b.w / 2} y={b.y - 5} className="rm-barval">
            {b.type === "total" ? usdK(b.value) : (b.value >= 0 ? "−" : "+") + usdK(Math.abs(b.value)).replace("−", "")}
          </text>
          <text x={b.x + b.w / 2} y={H - pad.b + 15} className="rm-barlab">
            {b.label.split(" ").slice(0, 2).join(" ")}
          </text>
          {b.label.split(" ").length > 2 && (
            <text x={b.x + b.w / 2} y={H - pad.b + 27} className="rm-barlab">
              {b.label.split(" ").slice(2).join(" ")}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function Tornado({ rows, base }) {
  if (!rows.length) return null;
  const W = 720, rh = 26, H = rows.length * rh + 26;
  const lo = Math.min(...rows.map((r) => r.low), base);
  const hi = Math.max(...rows.map((r) => r.high), base);
  const span = hi - lo || 1;
  const labelW = 168, chartW = W - labelW - 92;
  const x = (v) => labelW + ((v - lo) / span) * chartW;

  return (
    <svg className="rm-svg" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label="Sensitivity of annual savings to each assumption, plus or minus 15 percent">
      <line x1={x(base)} y1={4} x2={x(base)} y2={H - 18} className="rm-baseline" />
      {rows.map((r, i) => {
        const yy = 8 + i * rh;
        return (
          <g key={r.label}>
            <text x={labelW - 10} y={yy + 13} className="rm-tlab">{r.label}</text>
            <rect x={x(r.low)} y={yy + 3} width={Math.max(2, x(r.high) - x(r.low))} height={13}
              className="rm-tbar" />
            <text x={x(r.high) + 8} y={yy + 14} className="rm-tval">±{usdK(r.span / 2)}</text>
          </g>
        );
      })}
      <text x={x(base)} y={H - 5} className="rm-tbase" textAnchor="middle">
        base {usdK(base)}
      </text>
    </svg>
  );
}

/* ================================================================== *
 *  UI PARTS
 * ================================================================== */

function Field({ s, value, onChange }) {
  return (
    <label className="rm-field">
      <span className="rm-field__label">
        {s.label}
        {s.hint && <em className="rm-field__hint">{s.hint}</em>}
      </span>
      <span className="rm-field__input">
        {s.kind === "usd" && <span className="rm-affix">$</span>}
        <input type="number" inputMode="decimal" value={value}
          onChange={(e) => onChange(s.id, e.target.value)} step="any" />
        {s.kind === "pct" && <span className="rm-affix rm-affix--r">%</span>}
        {s.kind === "pp" && <span className="rm-affix rm-affix--r">pp</span>}
        {s.kind === "days" && <span className="rm-affix rm-affix--r">d</span>}
      </span>
    </label>
  );
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`rm-stat ${tone ? `rm-stat--${tone}` : ""}`}>
      <span className="rm-eyebrow">{label}</span>
      <p className="rm-stat__val">{value}</p>
      {sub && <p className="rm-stat__sub">{sub}</p>}
    </div>
  );
}

/* ================================================================== *
 *  APP
 * ================================================================== */

export default function App() {
  const [raw, setRaw] = useState(() => {
    const o = {};
    for (const k in DEFAULTS) o[k] = String(DEFAULTS[k]);
    return o;
  });
  const [custom, setCustom] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [open, setOpen] = useState(() => new Set(["Volume", "Merged role", "Speed and holding"]));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: "", amount: "", basis: "fixed", scope: "merged" });
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const m = useMemo(() => compute(raw, custom), [raw, custom]);
  const sens = useMemo(() => sensitivity(raw, custom, m.recurring), [raw, custom, m.recurring]);

  const set = (id, v) => setRaw((p) => ({ ...p, [id]: v }));
  const toggle = (g) => setOpen((p) => {
    const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n;
  });

  const addCustom = () => {
    if (!draft.label.trim()) return;
    setCustom((p) => [...p, { ...draft, id: Date.now() }]);
    setDraft({ label: "", amount: "", basis: "fixed", scope: "merged" });
    setAdding(false);
  };

  const saveScenario = () => {
    const name = window.prompt("Name this scenario", `Scenario ${scenarios.length + 1}`);
    if (!name) return;
    setScenarios((p) => [...p, {
      name, raw: { ...raw }, custom: [...custom],
      recurring: m.recurring, yearOne: m.yearOne, headMerged: m.headMerged,
    }]);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ raw, custom, scenarios }, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "role-merge-model.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (d.raw) setRaw(d.raw);
        if (d.custom) setCustom(d.custom);
        if (d.scenarios) setScenarios(d.scenarios);
      } catch { window.alert("That file could not be read as a saved model."); }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const summary = () => {
    const L = [
      `MSA / Disposition role merge — cost model`,
      ``,
      `Annual cost today:      ${usd(m.totalNow)}`,
      `Annual cost merged:     ${usd(m.totalMerged)}`,
      `Recurring saving:       ${usd(m.recurring)}  (${m.pctSaved.toFixed(1)}%)`,
      `One-time transition:    ${usd(m.oneTime)}`,
      `Year-one net:           ${usd(m.yearOne)}`,
      m.paybackMonths != null ? `Payback:                ${m.paybackMonths.toFixed(1)} months` : ``,
      ``,
      `Labor and overhead:     ${usd(m.laborNow)} → ${usd(m.laborMerged)}  (${usd(m.laborNow - m.laborMerged)})`,
      `Property carrying:      ${usd(m.propNow)} → ${usd(m.propMerged)}  (${usd(m.propNow - m.propMerged)})`,
      ``,
      `Headcount:              ${m.headNow} → ${m.headMerged}`,
      `Properties per agent:   ${m.propsPerAgentNow.toFixed(1)} → ${m.propsPerAgentMerged.toFixed(1)}`,
      `Saving per property:    ${usd(m.perProperty)}`,
      ``,
      `Largest swing factor:   ${sens[0]?.label ?? "—"} (±${usdK((sens[0]?.span ?? 0) / 2)} at ±15%)`,
    ].filter(Boolean).join("\n");
    navigator.clipboard?.writeText(L);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const laborDelta = m.laborNow - m.laborMerged;
  const propDelta = m.propNow - m.propMerged;

  return (
    <>
      <Styles />
      <div className="rm">
        <header className="rm-top">
          <div>
            <span className="rm-eyebrow">Homeward · BizOps · dummy data</span>
            <h1>Merging MSA and Disposition</h1>
            <p className="rm-top__sub">
              What the combined role costs against the two teams we run today. Every
              assumption on the left is editable; the analysis reruns as you type.
            </p>
          </div>
          <div className="rm-top__acts">
            <button className="rm-btn" onClick={saveScenario}>Save scenario</button>
            <button className="rm-btn" onClick={summary}>{copied ? "Copied" : "Copy summary"}</button>
            <button className="rm-btn rm-btn--q" onClick={exportJson}>Export</button>
            <button className="rm-btn rm-btn--q" onClick={() => fileRef.current?.click()}>Import</button>
            <input type="file" accept=".json" ref={fileRef} onChange={importJson} hidden />
          </div>
        </header>

        <div className="rm-grid">
          {/* ---------------- assumptions ---------------- */}
          <aside className="rm-panel">
            <div className="rm-panel__head">
              <h2>Assumptions</h2>
              <button className="rm-link" onClick={() => {
                const o = {}; for (const k in DEFAULTS) o[k] = String(DEFAULTS[k]);
                setRaw(o); setCustom([]);
              }}>Reset</button>
            </div>

            {GROUPS.map((g) => {
              const isOpen = open.has(g);
              return (
                <section key={g} className="rm-group">
                  <button className="rm-group__btn" aria-expanded={isOpen} onClick={() => toggle(g)}>
                    <span className={`rm-chev ${isOpen ? "is-open" : ""}`} aria-hidden="true" />
                    {g}
                  </button>
                  {isOpen && (
                    <div className="rm-group__body">
                      {SCHEMA.filter((s) => s.group === g).map((s) => (
                        <Field key={s.id} s={s} value={raw[s.id]} onChange={set} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            <section className="rm-group rm-group--custom">
              <div className="rm-group__head">
                <h3>Your own variables</h3>
                {!adding && <button className="rm-link" onClick={() => setAdding(true)}>Add</button>}
              </div>

              {custom.length === 0 && !adding && (
                <p className="rm-empty">
                  Add anything this model is missing — a severance provision, a new tool,
                  a market-entry cost. Pick how it scales and which side it applies to,
                  and it flows straight into the totals.
                </p>
              )}

              {custom.map((c) => (
                <div key={c.id} className="rm-cust">
                  <div>
                    <p className="rm-cust__name">{c.label}</p>
                    <p className="rm-cust__meta">
                      {usd(Number(c.amount) || 0)} · {BASES[c.basis].label.toLowerCase()} ·{" "}
                      {c.scope === "both" ? "both states" : c.scope === "now" ? "today only" : "merged only"}
                    </p>
                  </div>
                  <button className="rm-x" aria-label={`Remove ${c.label}`}
                    onClick={() => setCustom((p) => p.filter((z) => z.id !== c.id))}>×</button>
                </div>
              ))}

              {adding && (
                <div className="rm-add">
                  <input placeholder="What is it?" value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
                  <input type="number" placeholder="Amount in $" value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                  <select value={draft.basis} onChange={(e) => setDraft({ ...draft, basis: e.target.value })}>
                    {Object.entries(BASES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })}>
                    <option value="merged">Merged only</option>
                    <option value="now">Today only</option>
                    <option value="both">Both states</option>
                  </select>
                  <div className="rm-add__acts">
                    <button className="rm-btn rm-btn--sm" onClick={addCustom}>Add variable</button>
                    <button className="rm-link" onClick={() => setAdding(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </section>
          </aside>

          {/* ---------------- results ---------------- */}
          <main className="rm-main">
            <div className="rm-stats">
              <Stat label="Recurring annual saving" value={usdK(m.recurring)}
                sub={`${m.pctSaved.toFixed(1)}% of today's cost base`}
                tone={m.recurring >= 0 ? "good" : "bad"} />
              <Stat label="One-time transition cost" value={usdK(m.oneTime)}
                sub="Cross-training plus ramp productivity" />
              <Stat label="Year-one net" value={usdK(m.yearOne)}
                sub={m.paybackMonths != null
                  ? `Pays back in ${m.paybackMonths.toFixed(1)} months`
                  : "No payback at these assumptions"}
                tone={m.yearOne >= 0 ? "good" : "bad"} />
              <Stat label="Saving per property" value={usd(m.perProperty)}
                sub={`Across ${(Number(raw.properties) || 0).toLocaleString()} sales`} />
            </div>

            <section className="rm-card">
              <div className="rm-card__head">
                <h2>Where the money moves</h2>
                <span className="rm-note">Green reduces cost, red adds it</span>
              </div>
              <Waterfall m={m} />
            </section>

            <section className="rm-card">
              <div className="rm-card__head"><h2>Line by line, annual</h2></div>
              <table className="rm-table">
                <thead>
                  <tr><th>Cost line</th><th>Two teams today</th><th>Merged role</th><th>Change</th></tr>
                </thead>
                <tbody>
                  {m.lines.filter((l) => l.bucket === "labor").map((l) => (
                    <tr key={l.id}>
                      <td>{l.label}</td><td>{usd(l.now)}</td><td>{usd(l.merged)}</td>
                      <td className={l.delta >= 0 ? "is-good" : "is-bad"}>{usd(l.delta)}</td>
                    </tr>
                  ))}
                  <tr className="rm-subtotal">
                    <td>Labor and overhead</td><td>{usd(m.laborNow)}</td><td>{usd(m.laborMerged)}</td>
                    <td className={laborDelta >= 0 ? "is-good" : "is-bad"}>{usd(laborDelta)}</td>
                  </tr>
                  {m.lines.filter((l) => l.bucket === "property").map((l) => (
                    <tr key={l.id}>
                      <td>{l.label}</td><td>{usd(l.now)}</td><td>{usd(l.merged)}</td>
                      <td className={l.delta >= 0 ? "is-good" : "is-bad"}>{usd(l.delta)}</td>
                    </tr>
                  ))}
                  <tr className="rm-subtotal">
                    <td>Property carrying and pricing</td><td>{usd(m.propNow)}</td><td>{usd(m.propMerged)}</td>
                    <td className={propDelta >= 0 ? "is-good" : "is-bad"}>{usd(propDelta)}</td>
                  </tr>
                  <tr className="rm-total">
                    <td>Total</td><td>{usd(m.totalNow)}</td><td>{usd(m.totalMerged)}</td>
                    <td className={m.recurring >= 0 ? "is-good" : "is-bad"}>{usd(m.recurring)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="rm-readout">
                <div>
                  <span className="rm-eyebrow">Headcount</span>
                  <p>{m.headNow} → {m.headMerged}</p>
                </div>
                <div>
                  <span className="rm-eyebrow">Properties per front-line agent</span>
                  <p>{m.propsPerAgentNow.toFixed(1)} → {m.propsPerAgentMerged.toFixed(1)}</p>
                </div>
                <div>
                  <span className="rm-eyebrow">Days to contract</span>
                  <p>
                    {(Number(raw.domDays) || 0) + (Number(raw.handoffDays) || 0)} →{" "}
                    {Math.max(0, (Number(raw.domDays) || 0) - (Number(raw.domImprovement) || 0))}
                  </p>
                </div>
              </div>
            </section>

            <section className="rm-card">
              <div className="rm-card__head">
                <h2>What the answer actually hinges on</h2>
                <span className="rm-note">Each assumption moved ±15%</span>
              </div>
              <Tornado rows={sens} base={m.recurring} />
              <p className="rm-body">
                Read this before defending any single number. The assumptions at the top
                are the ones worth arguing about; the ones at the bottom barely change the
                conclusion, however wrong they are.
              </p>
            </section>

            <section className="rm-card rm-card--read">
              <div className="rm-card__head"><h2>Reading of the base case</h2></div>
              <div className="rm-body">
                <p>
                  <strong>The saving is not a headcount story.</strong> Labor and overhead
                  move by {usd(laborDelta)} on a base of {usd(m.laborNow)} — close to
                  noise. The merged role carries a broader scope, so it needs a pay uplift
                  and slightly more heads than today's MSA count, and that largely offsets
                  retiring the disposition bench.
                </p>
                <p>
                  <strong>It is a speed story.</strong> {usd(propDelta)} of the{" "}
                  {usd(m.recurring)} comes from property carrying and pricing: removing the
                  handoff, then selling faster because one person owns repairs, price and
                  the buyer conversation. At {usd(Number(raw.dailyHold) || 0)} a day across{" "}
                  {(Number(raw.properties) || 0).toLocaleString()} properties, every day
                  removed is worth roughly{" "}
                  {usd((Number(raw.properties) || 0) * (Number(raw.dailyHold) || 0))} a year.
                </p>
                <p>
                  <strong>Worth saying out loud to Tim:</strong> most of this lands in COGS
                  and gross margin, not in the opex line. If the question is "does this cut
                  our operating budget," the answer is roughly no. If it is "does this make
                  each property more profitable," the answer is{" "}
                  {usd(m.perProperty)} per sale.
                </p>
                <p>
                  <strong>The risk to name before he does.</strong> Every dollar here
                  depends on the merged agent holding disposition quality while carrying{" "}
                  {m.propsPerAgentMerged.toFixed(1)} properties. If the merged role slows
                  down instead of speeding up, set days saved to a negative number and
                  watch the case invert. That is the number to pilot, not to assume.
                </p>
              </div>
            </section>

            {scenarios.length > 0 && (
              <section className="rm-card">
                <div className="rm-card__head"><h2>Saved scenarios</h2></div>
                <table className="rm-table">
                  <thead>
                    <tr><th>Scenario</th><th>Merged heads</th><th>Recurring</th><th>Year one</th><th /></tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s, i) => (
                      <tr key={i}>
                        <td>{s.name}</td>
                        <td>{s.headMerged}</td>
                        <td className={s.recurring >= 0 ? "is-good" : "is-bad"}>{usd(s.recurring)}</td>
                        <td className={s.yearOne >= 0 ? "is-good" : "is-bad"}>{usd(s.yearOne)}</td>
                        <td className="rm-rowacts">
                          <button className="rm-link" onClick={() => { setRaw(s.raw); setCustom(s.custom); }}>
                            Load
                          </button>
                          <button className="rm-link" onClick={() =>
                            setScenarios((p) => p.filter((_, j) => j !== i))}>Remove</button>
                        </td>
                      </tr>
                    ))}
                    <tr className="rm-total">
                      <td>Live now</td><td>{m.headMerged}</td>
                      <td className={m.recurring >= 0 ? "is-good" : "is-bad"}>{usd(m.recurring)}</td>
                      <td className={m.yearOne >= 0 ? "is-good" : "is-bad"}>{usd(m.yearOne)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            <footer className="rm-foot">
              Illustrative dummy data · not Homeward actuals · built for scenario
              discussion, not for reporting
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}

/* ================================================================== *
 *  STYLES
 * ================================================================== */

function Styles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter+Tight:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.rm {
  --ink: #14181C;
  --paper: #F2F4F3;
  --card: #FFFFFF;
  --line: #DCE1DF;
  --line2: #EDF0EF;
  --muted: #667079;
  --good: #1C6B4B;
  --good-bg: #E4F0EA;
  --bad: #9E3A20;
  --bad-bg: #F7E6E1;
  --accent: #1F3A5F;
  --display: 'Archivo', system-ui, sans-serif;
  --body: 'Inter Tight', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, monospace;

  background: var(--paper); color: var(--ink); font-family: var(--body);
  font-size: 14px; line-height: 1.5; min-height: 100%;
  padding: 24px 20px 40px; -webkit-font-smoothing: antialiased;
}
.rm *, .rm *::before, .rm *::after { box-sizing: border-box; }
.rm h1, .rm h2, .rm h3 { font-family: var(--display); margin: 0; letter-spacing: -0.015em; }
.rm p { margin: 0; }
.rm button { font: inherit; cursor: pointer; }
.rm :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.rm-eyebrow {
  font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.13em;
  text-transform: uppercase; color: var(--muted); display: block;
}

/* header */
.rm-top {
  max-width: 1400px; margin: 0 auto 20px; display: flex; gap: 24px;
  justify-content: space-between; align-items: flex-start; flex-wrap: wrap;
  padding-bottom: 16px; border-bottom: 1px solid var(--line);
}
.rm-top h1 { font-size: clamp(24px, 3.4vw, 34px); font-weight: 700; margin: 5px 0 6px; }
.rm-top__sub { color: var(--muted); max-width: 62ch; font-size: 13.5px; }
.rm-top__acts { display: flex; gap: 7px; flex-wrap: wrap; }
.rm-btn {
  background: var(--ink); color: #fff; border: 0; padding: 7px 14px;
  border-radius: 3px; font-size: 12.5px; font-weight: 600;
}
.rm-btn--q { background: none; color: var(--ink); border: 1px solid var(--line); }
.rm-btn--sm { padding: 6px 12px; }
.rm-link {
  background: none; border: 0; color: var(--accent); font-size: 12px;
  font-weight: 600; padding: 2px 0; text-decoration: underline; text-underline-offset: 2px;
}

/* layout */
.rm-grid {
  max-width: 1400px; margin: 0 auto; display: grid; gap: 18px;
  grid-template-columns: 340px minmax(0, 1fr); align-items: start;
}
.rm-panel {
  background: var(--card); border: 1px solid var(--line); border-radius: 4px;
  padding: 16px 16px 18px; position: sticky; top: 20px;
  max-height: calc(100vh - 40px); overflow-y: auto;
}
.rm-panel__head {
  display: flex; align-items: baseline; justify-content: space-between;
  padding-bottom: 10px; margin-bottom: 6px; border-bottom: 1px solid var(--line);
}
.rm-panel__head h2 { font-size: 15px; font-weight: 700; }

.rm-group { border-bottom: 1px solid var(--line2); }
.rm-group__btn {
  width: 100%; display: flex; align-items: center; gap: 9px; background: none;
  border: 0; padding: 11px 0; text-align: left; font-size: 12.5px;
  font-weight: 600; color: var(--ink);
}
.rm-chev {
  width: 6px; height: 6px; border-right: 1.5px solid var(--muted);
  border-bottom: 1.5px solid var(--muted); transform: rotate(-45deg);
  transition: transform .15s ease; flex: none;
}
.rm-chev.is-open { transform: rotate(45deg); }
.rm-group__body { padding: 2px 0 14px; display: grid; gap: 11px; }

.rm-field { display: grid; gap: 4px; }
.rm-field__label { font-size: 12.5px; }
.rm-field__hint {
  display: block; font-style: normal; font-size: 11px; color: var(--muted);
  line-height: 1.35; margin-top: 2px;
}
.rm-field__input {
  display: flex; align-items: center; border: 1px solid var(--line);
  border-radius: 3px; background: #fff; overflow: hidden;
}
.rm-field__input:focus-within { border-color: var(--accent); }
.rm-field__input input {
  flex: 1; min-width: 0; border: 0; outline: 0; padding: 7px 8px;
  font-family: var(--mono); font-size: 13px; font-weight: 500; text-align: right;
  background: none; color: var(--ink);
}
.rm-affix {
  font-family: var(--mono); font-size: 11px; color: var(--muted);
  padding: 0 7px; background: var(--line2); align-self: stretch;
  display: flex; align-items: center;
}
.rm-affix--r { order: 2; }

.rm-group--custom { border-bottom: 0; padding-top: 6px; }
.rm-group__head {
  display: flex; align-items: baseline; justify-content: space-between; padding: 10px 0 8px;
}
.rm-group__head h3 { font-size: 12.5px; font-weight: 700; }
.rm-empty { font-size: 11.5px; color: var(--muted); line-height: 1.45; }
.rm-cust {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
  padding: 8px 0; border-bottom: 1px solid var(--line2);
}
.rm-cust__name { font-size: 12.5px; font-weight: 500; }
.rm-cust__meta { font-family: var(--mono); font-size: 10.5px; color: var(--muted); margin-top: 2px; }
.rm-x { background: none; border: 0; color: var(--muted); font-size: 17px; line-height: 1; padding: 0 2px; }
.rm-add { display: grid; gap: 7px; padding: 10px 0 4px; }
.rm-add input, .rm-add select {
  border: 1px solid var(--line); border-radius: 3px; padding: 7px 8px;
  font-size: 12.5px; font-family: var(--body); background: #fff; color: var(--ink);
}
.rm-add input[type="number"] { font-family: var(--mono); }
.rm-add__acts { display: flex; gap: 12px; align-items: center; }

/* results */
.rm-main { display: grid; gap: 16px; min-width: 0; }
.rm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.rm-stat {
  background: var(--card); border: 1px solid var(--line); border-radius: 4px;
  padding: 14px 15px; border-top: 2px solid var(--muted);
}
.rm-stat--good { border-top-color: var(--good); }
.rm-stat--bad { border-top-color: var(--bad); }
.rm-stat__val {
  font-family: var(--mono); font-size: clamp(19px, 2.2vw, 26px);
  font-weight: 600; letter-spacing: -0.02em; margin: 6px 0 3px;
}
.rm-stat--good .rm-stat__val { color: var(--good); }
.rm-stat--bad .rm-stat__val { color: var(--bad); }
.rm-stat__sub { font-size: 11.5px; color: var(--muted); line-height: 1.35; }

.rm-card {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 4px; padding: 18px 20px 20px;
}
.rm-card__head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 14px;
  padding-bottom: 12px; margin-bottom: 14px; border-bottom: 1px solid var(--line);
}
.rm-card__head h2 { font-size: 15px; font-weight: 700; }
.rm-note { font-family: var(--mono); font-size: 10px; color: var(--muted); }
.rm-svg { width: 100%; height: auto; display: block; }
.rm-axis { stroke: var(--line); stroke-width: 1; }
.rm-bar-total { fill: var(--accent); }
.rm-bar-save { fill: var(--good); }
.rm-bar-cost { fill: var(--bad); }
.rm-barval {
  font-family: var(--mono); font-size: 10px; font-weight: 500;
  fill: var(--ink); text-anchor: middle;
}
.rm-barlab {
  font-family: var(--body); font-size: 9.5px; fill: var(--muted); text-anchor: middle;
}
.rm-baseline { stroke: var(--ink); stroke-width: 1.25; stroke-dasharray: 3 3; }
.rm-tbar { fill: var(--accent); opacity: .8; }
.rm-tlab { font-size: 11px; fill: var(--ink); text-anchor: end; }
.rm-tval { font-family: var(--mono); font-size: 10px; fill: var(--muted); }
.rm-tbase { font-family: var(--mono); font-size: 9.5px; fill: var(--muted); }

.rm-table { width: 100%; border-collapse: collapse; }
.rm-table th {
  font-family: var(--mono); font-size: 9.5px; letter-spacing: .1em;
  text-transform: uppercase; color: var(--muted); font-weight: 500;
  text-align: right; padding: 0 0 8px; border-bottom: 1px solid var(--line);
}
.rm-table th:first-child { text-align: left; }
.rm-table td {
  padding: 8px 0; border-bottom: 1px solid var(--line2);
  font-family: var(--mono); font-size: 12.5px; text-align: right;
}
.rm-table td:first-child { font-family: var(--body); font-size: 13px; text-align: left; }
.rm-table .is-good { color: var(--good); }
.rm-table .is-bad { color: var(--bad); }
.rm-subtotal td { font-weight: 600; background: var(--line2); }
.rm-subtotal td:first-child { font-weight: 600; }
.rm-total td {
  font-weight: 600; border-top: 1.5px solid var(--ink); border-bottom: 0;
  font-size: 13.5px; padding-top: 10px;
}
.rm-rowacts { display: flex; gap: 10px; justify-content: flex-end; }

.rm-readout {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
  margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line);
}
.rm-readout p { font-family: var(--mono); font-size: 15px; font-weight: 500; margin-top: 3px; }

.rm-body { display: grid; gap: 11px; font-size: 13.5px; line-height: 1.55; max-width: 76ch; }
.rm-body strong { font-weight: 600; }
.rm-card--read { background: #FBFCFB; }
.rm-foot {
  font-family: var(--mono); font-size: 9.5px; letter-spacing: .09em;
  text-transform: uppercase; color: var(--muted); padding: 2px 0;
}

@media (max-width: 1080px) {
  .rm-grid { grid-template-columns: 1fr; }
  .rm-panel { position: static; max-height: none; }
  .rm-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .rm { padding: 16px 12px 32px; }
  .rm-stats { grid-template-columns: 1fr; }
  .rm-card { padding: 14px 14px 16px; }
  .rm-readout { grid-template-columns: 1fr; }
  .rm-table td:first-child { font-size: 12px; }
  .rm-table td { font-size: 11.5px; }
}
`}</style>
  );
}
