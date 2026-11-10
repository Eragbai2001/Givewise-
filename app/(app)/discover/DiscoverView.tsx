"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Pip from "@/components/Pip";
import LiveSearch from "@/components/app/LiveSearch";
import PipSuggested from "@/components/app/PipSuggested";
import { I, Ic } from "@/components/app/icons";
import { hear, type Charity } from "@/lib/discover-data";
import { paymentsChanged, usePayments } from "@/lib/use-payments";

const PIN = ["M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"];
const PLUS = ["M12 5v14", "M5 12h14"];
const PEN = ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"];
/** Two letters for an avatar, skipping symbols: "UNICEF (Water…)" → "UW". */
const initials = (name: string) => {
  const w = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "?") + (w[1]?.[0] ?? "")).toUpperCase();
};

const ALERT = ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 8v4", "M12 16h.01"];
const ARROW = ["M5 12h14", "M12 5l7 7-7 7"];

export default function DiscoverView() {
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"pip" | "manual">("pip");
  const [budget, setBudget] = useState(50);
  const [man, setMan] = useState<Record<string, number>>({});
  const [sent, setSent] = useState(false);
  const [live, setLive] = useState<Charity[]>([]);
  // Charities from "Suggested by Pip" (shown before the donor types anything).
  const [suggested, setSuggested] = useState<Charity[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // A link like /discover?q=Water.org starts with that search typed in (e.g. from My plan).
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("q");
      if (v) setQ(v.slice(0, 120));
    } catch {}
  }, []);

  // The donor's real limit and saved plan (null when logged out or still loading).
  const { status } = usePayments();
  const LIMIT = status ? status.hardLimitCents / 100 : 50;

  // Charities in the saved plan that aren't in the catalogue (e.g. ones Pip found on the web).
  const [planExtras, setPlanExtras] = useState<Charity[]>([]);

  // An existing plan starts with its charities already picked.
  useEffect(() => {
    if (status?.planSaved) {
      const extras = status.plan
        .filter((i) => i.charityId.startsWith("live-"))
        .map((i): Charity => {
          const w = i.charityName.split(/\s+/);
          return { id: i.charityId, name: i.charityName, ini: initials(i.charityName), cause: "local", causeLabel: "In your plan", place: "Found by Pip", region: "af", ver: "p", tint: "var(--grey-soft)", ink: "var(--grey-ink)", color: "#5E7FA3" };
        });
      setPlanExtras(extras);
      setPicks(status.plan.filter((i) => i.charityId.startsWith("live-")).map((i) => i.charityId));
      setMan(Object.fromEntries(status.plan.map((i) => [i.charityId, i.amountCents / 100])));
      setBudget(status.hardLimitCents / 100);
      return;
    }
    setPicks([]);
    setMan({});
  }, [status?.planSaved]); // eslint-disable-line react-hooks/exhaustive-deps

  const heard = useMemo(() => hear(q), [q]);

  const known: Charity[] = [];
  for (const c of [...live, ...suggested, ...planExtras]) if (!known.some((k) => k.id === c.id)) known.push(c);
  const picked = known.filter((c) => picks.includes(c.id));
  const toggle = (id: string) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Pip's split: even shares in $5 steps, any remainder to the first pick.
  const pipSplit = useMemo(() => {
    const out: Record<string, number> = {};
    if (!picked.length) return out;
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

  /** Save the split as the donor's plan. The server re-checks it against their hard limit. */
  async function approve() {
    setSaveErr("");
    setSaving(true);
    const items = picked
      .filter((c) => amtOf(c.id) > 0)
      .map((c) => ({ charityId: c.id, charityName: c.name, amountCents: Math.round(amtOf(c.id) * 100) }));
    try {
      const r = await fetch("/api/payments/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) setSaveErr("Log in to save your plan.");
      else if (!r.ok) setSaveErr(d.error || "Couldn’t save your plan. Nothing changed.");
      else {
        setSent(true);
        paymentsChanged();
      }
    } catch {
      setSaveErr("GiveWise couldn’t be reached. Nothing changed.");
    }
    setSaving(false);
  }

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


  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>Discover charities</h1>
          <p>Search by name, or tell Pip what you care about in your own words.</p>
        </div>
      </div>

      {status && !status.planSaved && !picks.length && (
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
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. girls’ education in Nigeria, or a charity’s name" />
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

      <LiveSearch query={q} picks={picks} onFound={setLive} onToggle={toggle} />

      {/* Before the donor types: charities Pip already checked. Kept mounted so its picks stay known. */}
      <div hidden={q.trim().length >= 3}>
        <PipSuggested picks={picks} onFound={setSuggested} onToggle={toggle} onTry={setQ} />
      </div>

      {picked.length > 0 && (
        <div className="tray" role="region" aria-label="Your picks">
          <div className="tray-avs" aria-hidden="true">
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
          <button className="btn btn-primary btn-lg" onClick={() => { setSent(false); setSaveErr(""); setOpen(true); }}>
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
                <strong style={{ fontSize: 18 }}>Your new plan is saved</strong>
                <p>
                  ${total} a month across {picked.filter((c) => amtOf(c.id) > 0).length} charities. Nothing was charged now. The new amounts go out on your next payment day, from the PayPal you already approved.
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
                          Here’s how I’d share <b className="num">${budget}</b>. I shared it evenly across your picks. Edit anything you like.
                        </span>
                      </div>
                      <div>
                        {picked.map((c) => {
                          const r = ["Matches your search. Even share.", c.ver === "v" ? "ok" : c.ver === "p" ? "rev" : "conf-n", c.ver === "v" ? "Verified" : c.ver === "p" ? "Partly verified" : "Couldn’t verify"];
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
                      <button className="btn btn-primary btn-lg" disabled={bad || saving} aria-busy={saving} onClick={approve}>{saving ? "Saving…" : "Approve this plan"}</button>
                    </div>
                  </div>
                  {saveErr && <span className="form-err" role="alert">{saveErr}</span>}
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Approving saves this as your monthly plan. Nothing is charged now. The server checks it against your limit, and the new amounts start on your next payment day.</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
