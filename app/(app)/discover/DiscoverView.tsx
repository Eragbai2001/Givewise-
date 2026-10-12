"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Pip from "@/components/Pip";
import EmptyState from "@/components/app/EmptyState";
import { I, Ic } from "@/components/app/icons";
import { useDemoState } from "@/lib/demo-state";
import { CATALOG, CAUSE_FILTERS, PIP_REASONS, hear, type Charity } from "@/lib/discover-data";

const LIMIT = 50;
const PIN = ["M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"];
const PLUS = ["M12 5v14", "M5 12h14"];
const PEN = ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"];
const ALERT = ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4", "M12 16h.01"];
const ARROW = ["M5 12h14", "M12 5l7 7-7 7"];

function VerChip({ v }: { v: Charity["ver"] }) {
  if (v === "v") return <span className="chip ok"><Ic d={I.check} style={{ width: 12, height: 12 }} />Verified charity</span>;
  if (v === "p") return <span className="chip rev"><i />Partly verified</span>;
  return <span className="chip conf-n">Couldn’t verify</span>;
}

export default function DiscoverView() {
  const { state } = useDemoState();
  const [q, setQ] = useState("");
  const [cause, setCause] = useState("all");
  const [loc, setLoc] = useState("any");
  const [verOnly, setVerOnly] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"pip" | "manual">("pip");
  const [budget, setBudget] = useState(50);
  const [man, setMan] = useState<Record<string, number>>({ cs: 25, bf: 15, rl: 10 });
  const [sent, setSent] = useState(false);

  // An existing plan starts with its charities already picked.
  useEffect(() => {
    setPicks(state === "empty" ? [] : ["cs", "bf", "rl"]);
    setMan(state === "empty" ? {} : { cs: 25, bf: 15, rl: 10 });
  }, [state]);

  const heard = useMemo(() => hear(q), [q]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const region = loc !== "any" ? loc : heard.region;
    return CATALOG.filter((c) => {
      if (cause !== "all") {
        if (c.cause !== cause) return false;
      } else if (heard.causes.length) {
        if (!heard.causes.includes(c.cause)) return false;
      } else if (t && !c.name.toLowerCase().includes(t) && !c.place.toLowerCase().includes(t)) return false;
      if (region === "ng" && c.region !== "ng") return false;
      if (verOnly && c.ver !== "v") return false;
      return true;
    });
  }, [q, cause, loc, verOnly, heard]);

  const picked = CATALOG.filter((c) => picks.includes(c.id));
  const toggle = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Pip's split: known reasons for the sample set, even shares otherwise.
  const pipSplit = useMemo(() => {
    const out: Record<string, number> = {};
    if (!picked.length) return out;
    const known: Record<string, number> = { cs: 10, bf: 15, rl: 10, ht: 15 };
    const isKnownSet = budget === 50 && picked.length === 4 && picked.every((c) => c.id in known);
    if (isKnownSet) return { ...known };
    const each = Math.floor(budget / picked.length / 5) * 5;
    picked.forEach((c) => (out[c.id] = each));
    out[picked[0].id] += budget - each * picked.length;
    return out;
  }, [picked, budget]);

  const amtOf = (id: string) => (mode === "pip" ? pipSplit[id] ?? 0 : man[id] ?? 0);
  const total = picked.reduce((s, c) => s + amtOf(c.id), 0);
  const overLimit = budget > LIMIT;
  const over = total > budget;
  const bad = overLimit || over || total === 0;
  const left = budget - total;

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const forText = heard.heard.length && cause === "all" ? heard.heard.join(" · ") : CAUSE_FILTERS.find((d) => d[0] === cause)?.[1] ?? "All causes";

  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>Discover charities</h1>
          <p>Search by name, or tell Pip what you care about in your own words.</p>
        </div>
      </div>

      {state === "empty" && !picks.length && (
        <div className="banner" role="status" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-line)" }}>
          <Pip mood="listening" size={34} motion={false} decorative />
          <p>
            <b>Start by telling Pip what you care about.</b>
            <span className="hide-m"> Try “clean water in Nigeria” or “girls’ education”. Pick a few charities, then Pip suggests how to share your budget.</span>
          </p>
        </div>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="askbox">
          <Ic d={I.search} small={false} style={{ color: "var(--muted)" }} />
          <span className="sr-only">Search charities or describe a cause</span>
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setCause("all"); }} placeholder="e.g. girls’ education in Nigeria, or a charity’s name" />
          {q && (
            <button className="iconbtn sq" onClick={() => setQ("")} aria-label="Clear search" style={{ borderColor: "transparent", background: "transparent" }}>
              <Ic d={I.close} />
            </button>
          )}
        </label>
        {heard.heard.length > 0 && (
          <div className="heard">
            <span>Pip heard:</span>
            {heard.heard.map((h) => (
              <span className="chip ok" key={h}>{h}</span>
            ))}
          </div>
        )}
      </section>

      <div className="fbar" role="group" aria-label="Filters">
        {CAUSE_FILTERS.map(([id, label]) => (
          <button key={id} className={`fchip ${cause === id ? "on" : ""}`} aria-pressed={cause === id} onClick={() => setCause(id)}>
            {label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text2)" }}>
          Location
          <select value={loc} onChange={(e) => setLoc(e.target.value)} style={{ font: "inherit", fontSize: 13, minHeight: 34, paddingLeft: 12, borderRadius: 9, border: "1px solid var(--line2)", background: "var(--surface)", color: "var(--text)" }}>
            <option value="any">Anywhere</option>
            <option value="ng">Nigeria</option>
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={verOnly} onChange={(e) => setVerOnly(e.target.checked)} />
          Verified only
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Pip mood="idle" size={36} motion={false} decorative />
        <p role="status" style={{ margin: 0, flex: 1, minWidth: 200, color: "var(--text2)" }}>
          <b style={{ fontWeight: 600, color: "var(--text)" }}>
            {results.length} {results.length === 1 ? "charity" : "charities"}
          </b>{" "}
          for {forText}
        </p>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Sorted by best match</span>
      </div>

      {results.length === 0 ? (
        <section className="card">
          <EmptyState
            mood="researching"
            title="No charities match yet"
            body={verOnly ? "Try turning off “Verified only” to see charities Pip couldn’t fully check, or use a broader cause." : "Try a broader cause or a different place. Pip is adding new charities every week."}
            action={
              <button className="btn btn-sm" onClick={() => { setQ(""); setCause("all"); setLoc("any"); setVerOnly(false); }}>
                Clear filters
              </button>
            }
          />
        </section>
      ) : (
        <div className="results">
          {results.map((c) => {
            const on = picks.includes(c.id);
            return (
              <article key={c.id} className={`ccard ${on ? "picked" : ""}`} aria-label={c.name}>
                <div className="top">
                  <span className="logo-ph" style={{ background: c.tint, color: c.ink }}>{c.ini}</span>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                    <h3>{c.name}</h3>
                    <span className="loc"><Ic d={PIN} style={{ width: 12, height: 12 }} />{c.place}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span className="chip neutral">{c.causeLabel}</span>
                  <VerChip v={c.ver} />
                  {c.funded && <span className="chip neutral"><i />Project funded</span>}
                </div>
                {c.outcome ? (
                  <div className="outcome">
                    <span>{c.outcome}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}>
                      {c.outcomeVer === "v" ? <span className="chip ok">Verified</span> : <span className="chip rev">Partly verified</span>}
                      <a className="src" href="#">{c.src}</a>
                    </div>
                  </div>
                ) : (
                  <div className="outcome" style={{ borderStyle: "dashed", flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Pip mood="concerned" size={28} motion={false} decorative />
                    <span>No published results I could check yet.</span>
                  </div>
                )}
                <div className="foot2">
                  <a className="src" href="#" style={{ color: "var(--muted)" }}>View profile</a>
                  <button className={`btn btn-sm ${on ? "added" : ""}`} onClick={() => toggle(c.id)} aria-pressed={on}>
                    <Ic d={on ? I.check : PLUS} />
                    {on ? "Picked" : "Add to picks"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {picked.length > 0 && (
        <div className="tray" role="region" aria-label="Your picks">
          <div className="stack" aria-hidden="true">
            {picked.map((p) => (
              <span key={p.id} className="logo-ph" style={{ background: p.tint, color: p.ink }}>{p.ini}</span>
            ))}
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 0, display: "flex", flexDirection: "column" }}>
            <strong style={{ fontWeight: 600 }}>
              {picked.length} {picked.length === 1 ? "charity" : "charities"} picked
            </strong>
            <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{picked.map((c) => c.name).join(", ")}</span>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => { setSent(false); setOpen(true); }}>
            Share my ${budget}
            <Ic d={ARROW} />
          </button>
        </div>
      )}

      {open && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="sp-h" tabIndex={-1} ref={dialogRef}>
            {sent ? (
              <div className="empty" style={{ padding: "40px 24px" }}>
                <Pip mood="celebrating" size={110} />
                <strong style={{ fontSize: 18 }}>Sent to PayPal for your approval</strong>
                <p>
                  ${total} a month across {picked.filter((c) => amtOf(c.id) > 0).length} charities. Nothing changes until you approve it in PayPal sandbox. New amounts start with your next payment.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn" onClick={() => setOpen(false)}>Keep browsing</button>
                  <Link className="btn btn-primary" href="/plan">Back to My plan</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-h">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 id="sp-h">Share your monthly giving</h2>
                    <p>Let Pip suggest a split, or set it yourself. You can change it any time.</p>
                  </div>
                  <button className="iconbtn sq" onClick={() => setOpen(false)} aria-label="Close" style={{ width: 36, height: 36 }}>
                    <Ic d={I.close} />
                  </button>
                </div>
                <div className="modal-b">
                  <div className="budget">
                    <label htmlFor="sp-budget" style={{ fontWeight: 500 }}>Monthly budget</label>
                    <span className="money num">
                      $<input id="sp-budget" type="number" min={5} step={5} value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))} />
                    </span>
                    <span style={{ flex: 1 }} />
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                      <Ic d={I.lock} style={{ color: "var(--accent-ink)" }} />
                      Hard limit <span className="num">${LIMIT}</span>/mo
                    </span>
                  </div>

                  <div className="tabs" role="tablist" aria-label="How to split">
                    <button role="tab" className={mode === "pip" ? "on" : ""} aria-selected={mode === "pip"} onClick={() => setMode("pip")}>Pip suggests</button>
                    <button role="tab" className={mode === "manual" ? "on" : ""} aria-selected={mode === "manual"} onClick={() => setMode("manual")}>I’ll choose</button>
                  </div>

                  {mode === "pip" ? (
                    <>
                      <div className="pipnote">
                        <Pip mood="idle" size={40} />
                        <span>
                          Here’s how I’d share <b className="num">${budget}</b>. I leaned toward charities with checked results{picks.includes("cs") ? ", and gave less to ClearSpring because its current project is already fully funded" : ""}. Edit anything you like.
                        </span>
                      </div>
                      <div>
                        {picked.map((c) => {
                          const r = PIP_REASONS[c.id] ?? ["Matches your search. Even share.", c.ver === "v" ? "ok" : c.ver === "p" ? "rev" : "conf-n", c.ver === "v" ? "Verified" : c.ver === "p" ? "Partly verified" : "Couldn’t verify"];
                          return (
                            <div className="srow" key={c.id} style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr) 72px" }}>
                              <div className="who2">
                                <span className="sw" style={{ width: 12, height: 12, background: c.color }} />
                                <span className="logo-ph" style={{ background: c.tint, color: c.ink }}>{c.ini}</span>
                                <span style={{ minWidth: 0 }}>
                                  <b>{c.name}</b>
                                  <span className="why2">{r[0]}</span>
                                </span>
                              </div>
                              <div><span className={`chip ${r[1]}`}>{r[2]}</span></div>
                              <div className="amt2"><span className="num" style={{ fontSize: 16, fontWeight: 600 }}>${pipSplit[c.id] ?? 0}</span></div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="btn" onClick={() => { setMan({ ...man, ...pipSplit }); setMode("manual"); }} style={{ alignSelf: "flex-start" }}>
                        <Ic d={PEN} />
                        Edit this split
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "var(--muted)" }}>Drag to set each amount, in $5 steps.</span>
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            const n = picked.length || 1;
                            const each = Math.floor(budget / n / 5) * 5;
                            const m: Record<string, number> = {};
                            picked.forEach((c) => (m[c.id] = each));
                            if (picked.length) m[picked[0].id] += budget - each * n;
                            setMan({ ...man, ...m });
                          }}
                        >
                          Split evenly
                        </button>
                      </div>
                      <div>
                        {picked.map((c) => {
                          const a = man[c.id] ?? 0;
                          return (
                            <div className="srow" key={c.id}>
                              <div className="who2">
                                <span className="sw" style={{ width: 12, height: 12, background: c.color }} />
                                <span className="logo-ph" style={{ background: c.tint, color: c.ink }}>{c.ini}</span>
                                <span style={{ minWidth: 0 }}>
                                  <b>{c.name}</b>
                                  <span className="why2">{c.causeLabel}</span>
                                </span>
                              </div>
                              <div className="rng">
                                <input type="range" min={0} max={Math.max(budget, 5)} step={5} value={a} onChange={(e) => setMan({ ...man, [c.id]: Number(e.target.value) })} aria-label={`Monthly amount for ${c.name}`} />
                              </div>
                              <div className="amt2">
                                <span className="num" style={{ fontSize: 16, fontWeight: 600 }}>${a}</span>
                                <span className="num" style={{ fontSize: 12, color: "var(--muted)", width: 34, textAlign: "right" }}>{budget ? Math.round((a / budget) * 100) : 0}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className="modal-f">
                  <div className="bar" role="img" aria-label={"Split preview: " + picked.map((c) => `${c.name} $${amtOf(c.id)}`).join(", ")} style={{ background: "var(--grey-soft)", borderRadius: 4 }}>
                    {picked.filter((c) => amtOf(c.id) > 0).map((c) => (
                      <span key={c.id} style={{ width: `${budget ? Math.min(100, (amtOf(c.id) / budget) * 100) : 0}%`, background: c.color }} />
                    ))}
                  </div>
                  <div className="row3">
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span className="num" style={{ fontWeight: 600 }}>${total} of ${budget} a month</span>
                      {bad ? (
                        <span className="bad-t" role="alert">
                          <Ic d={ALERT} />
                          {overLimit ? `Your budget is above your $${LIMIT} hard limit.` : total === 0 ? "Give at least one charity an amount." : `$${total - budget} over your budget. Lower an amount.`}
                        </span>
                      ) : (
                        <span className="ok-t">
                          <Ic d={I.shield} />
                          {left > 0 ? `$${left} not shared yet · within your $${LIMIT} limit` : `Within your $${LIMIT} limit`}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-lg" onClick={() => setOpen(false)}>Cancel</button>
                      <button className="btn btn-primary btn-lg" disabled={bad} onClick={() => setSent(true)}>Continue to approve</button>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Next, you’ll approve the new amounts in PayPal sandbox. Changes start with your next payment.</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
