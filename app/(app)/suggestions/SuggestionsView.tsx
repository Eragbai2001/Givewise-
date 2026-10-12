"use client";

import Link from "next/link";
import { useState } from "react";
import Pip, { type PipMood } from "@/components/Pip";
import EmptyState from "@/components/app/EmptyState";
import { I, Ic } from "@/components/app/icons";
import { useDemoState } from "@/lib/demo-state";

type Decision = "given" | "ok" | "skip";
type Tag = "urg" | "need" | "match" | "trust" | "you";

const PENDING = [
  { id: "u1", tag: "urg" as Tag, tagLabel: "Urgent", title: "Tunde, 34, needs a kidney transplant", sub: "Lifeline Kidney Fund · one-off", date: "8 Oct" },
  { id: "n1", tag: "need" as Tag, tagLabel: "Need met", title: "ClearSpring’s project is funded. Move $25 until March?", sub: "Split change · until March", date: "6 Oct" },
  { id: "m1", tag: "match" as Tag, tagLabel: "Match", title: "Bright Futures 2× match until 31 Oct", sub: "One-off gift", date: "5 Oct" },
];
const DECIDED = [
  {
    id: "r2", tag: "trust" as Tag, tagLabel: "Trust", title: "Roots Local Aid’s registration lapsed. Pause $10?", sub: "Paused one month", date: "3 Sep", when: "3 Sep 2026, 18:40",
    body: "Roots Local Aid’s registration lapsed for two weeks. You approved pausing your $10. The money stayed with you, and giving restarted once the registration was renewed on 17 Sep.",
    money: "None sent. $10 held with you for one month", src: "Charity Register notice (sample)",
  },
  {
    id: "r1", tag: "you" as Tag, tagLabel: "Account", title: "Update Roots Local Aid’s PayPal payee", sub: "Same amount", date: "14 Aug", when: "14 Aug 2026, 09:12",
    body: "The charity moved to a new PayPal account. You approved switching your $10/month to the new account.",
    money: "Same amount, new payee account", src: "Charity Register notice (sample)",
  },
];
const DECISION_LABEL: Record<Decision, string> = { given: "Given", ok: "Approved", skip: "Not now" };
const PLUS = ["M12 5v14", "M5 12h14"];
const REFRESH = ["M21 12a9 9 0 1 1-3-6.7", "M21 4v5h-5"];
const ARROWS = ["M7 16V4m0 0L3 8m4-4l4 4", "M17 8v12m0 0l4-4m-4 4l-4-4"];
const ARROW = ["M5 12h14", "M12 5l7 7-7 7"];

function Ver({ label }: { label: "Verified" | "Partly verified" | "Couldn’t verify" }) {
  if (label === "Verified") return <span className="chip ok"><Ic d={I.check} style={{ width: 12, height: 12 }} />Verified</span>;
  if (label === "Partly verified") return <span className="chip rev"><i />Partly verified</span>;
  return <span className="chip conf-n">Couldn’t verify</span>;
}

function Evidence({ items }: { items: { text: React.ReactNode; ver: "Verified" | "Partly verified" | "Couldn’t verify"; src: string; date?: string }[] }) {
  return (
    <ul className="ev">
      {items.map((e, i) => (
        <li key={i}>
          <span>{e.text}</span>
          <div className="row">
            <Ver label={e.ver} />
            <a className="src" href="#">{e.src}</a>
            {e.date && <span className="date">{e.date}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function SuggestionsView() {
  const { state } = useDemoState();
  const [dec, setDec] = useState<Record<string, Decision>>({});
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const [sel, setSel] = useState("u1");
  const [uAmt, setUAmt] = useState(25);
  const [mAmt, setMAmt] = useState(10);

  if (state !== "full") {
    return (
      <main className="content">
        <div className="head">
          <div>
            <h1>Pip’s suggestions</h1>
            <p>Urgent appeals, matches and better places for your money. Pip suggests. Only you decide.</p>
          </div>
        </div>
        <section className="card">
          {state === "empty" ? (
            <EmptyState
              mood="idle"
              title="Pip has nothing to suggest yet"
              body="Once you have a giving plan, Pip watches your charities every week. When a project gets funded, a match opens or an urgent appeal fits your values, it shows up here with its sources."
              action={<Link className="btn btn-primary btn-sm" href="/onboarding">Set up with Pip</Link>}
            />
          ) : (
            <EmptyState
              mood="happy"
              title="All quiet for now"
              body="Your plan was just approved, so there’s nothing to change. Pip’s first weekly check is on Monday. If something comes up, you’ll see it here and nothing changes without your OK."
              action={<Link className="btn btn-sm" href="/plan">Back to My plan</Link>}
            />
          )}
        </section>
      </main>
    );
  }

  const pending = PENDING.filter((p) => !dec[p.id]).map((p) => ({ ...p, status: p.id === "u1" ? "Closes in 9 days" : "New", chip: p.id === "u1" ? "bad" : "neutral" }));
  const decidedNow = PENDING.filter((p) => dec[p.id]).map((p) => ({ ...p, status: DECISION_LABEL[dec[p.id]], chip: dec[p.id] === "skip" ? "neutral" : "ok" }));
  const resolved = [...decidedNow, ...DECIDED.map((r) => ({ ...r, status: "Approved", chip: "ok" }))];
  const list = tab === "pending" ? pending : resolved;
  const isPending = PENDING.some((p) => p.id === sel);
  const decide = (id: string, d: Decision) => setDec({ ...dec, [id]: d });

  const done: Record<string, Partial<Record<Decision, { mood: PipMood; chip: string; status: string; title: string; body: string }>>> = {
    u1: {
      given: { mood: "celebrating", chip: "ok", status: "Given by you", title: `Thank you. $${uAmt} is on its way to Lifeline`, body: "Sent today through PayPal sandbox, on top of your $50 plan. Pip will tell you when Tunde’s appeal closes." },
      skip: { mood: "idle", chip: "neutral", status: "Not now", title: "No problem. Nothing was sent", body: "Your monthly plan keeps running as normal." },
    },
    n1: {
      ok: { mood: "happy", chip: "ok", status: "Approved by you", title: "Done. Blue Horizon gets $25/mo until March", body: "Starts with your next payment on 1 Nov 2026. Pip will ask you before switching back to ClearSpring in March." },
      skip: { mood: "idle", chip: "neutral", status: "Kept as is", title: "Got it. ClearSpring keeps its $25/month", body: "Nothing changed. Pip will keep an eye on its next project." },
    },
    m1: {
      given: { mood: "celebrating", chip: "ok", status: "Given by you", title: `$${mAmt} sent. With the match, that’s $${mAmt * 2}`, body: "Paid once through PayPal sandbox. Your monthly plan hasn’t changed." },
      skip: { mood: "idle", chip: "neutral", status: "Not now", title: "No problem. Nothing was sent", body: "Your monthly plan keeps running as normal." },
    },
  };
  const doneView = isPending && dec[sel] ? done[sel][dec[sel]] : null;
  const r = DECIDED.find((x) => x.id === sel);

  const Amounts = ({ vals, value, set }: { vals: number[]; value: number; set: (n: number) => void }) => (
    <div className="amtpick" role="radiogroup" aria-label="Gift amount">
      {vals.map((v) => (
        <button key={v} className={value === v ? "on" : ""} role="radio" aria-checked={value === v} onClick={() => set(v)}>${v}</button>
      ))}
    </div>
  );

  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>Pip’s suggestions</h1>
          <p>Urgent appeals, matches and better places for your money. Pip suggests. Only you decide.</p>
        </div>
      </div>

      <div className="inbox">
        <section className="card" aria-label="Suggestion list">
          <div className="card-h" style={{ padding: 12 }}>
            <div className="tabs" role="tablist" aria-label="Filter suggestions" style={{ width: "100%" }}>
              <button role="tab" className={tab === "pending" ? "on" : ""} aria-selected={tab === "pending"} onClick={() => { setTab("pending"); setSel((pending[0] ?? PENDING[0]).id); }}>
                New <span className="n num">{pending.length}</span>
              </button>
              <button role="tab" className={tab === "resolved" ? "on" : ""} aria-selected={tab === "resolved"} onClick={() => { setTab("resolved"); setSel(resolved[0].id); }}>
                Decided <span className="n num">{resolved.length}</span>
              </button>
            </div>
          </div>
          {list.length === 0 && <EmptyState compact mood="happy" title="You’re all caught up" body="Pip checks your charities every week. New suggestions show up here, with their sources." />}
          <ul className="plist">
            {list.map((it) => (
              <li key={it.id}>
                <button className={`pitem ${sel === it.id ? "on" : ""}`} onClick={() => setSel(it.id)} aria-current={sel === it.id}>
                  <span className="top2"><span className={`ttag ${it.tag}`}>{it.tagLabel}</span><span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{it.date}</span></span>
                  <span className="t">{it.title}</span>
                  <span className="m"><span>{it.sub}</span><span className={`chip ${it.chip}`}><i />{it.status}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {doneView && (
          <article className="card">
            <div className="done">
              <Pip mood={doneView.mood} size={104} />
              <span className={`chip ${doneView.chip}`}><i />{doneView.status}</span>
              <h2>{doneView.title}</h2>
              <p>{doneView.body}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
                <button className="btn" onClick={() => { setDec({}); setTab("pending"); setSel("u1"); }}>Reset demo</button>
                <Link className="btn btn-primary" href="/plan">Back to My plan</Link>
              </div>
            </div>
          </article>
        )}

        {sel === "u1" && !dec.u1 && (
          <article className="card detail" aria-labelledby="u-h">
            <div className="d-head">
              <Pip mood="concerned" size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="d-eyebrow"><span className="ttag urg">Urgent appeal</span><span className="num">Closes in 9 days · shared 8 Oct 2026</span></div>
                <h2 id="u-h">Tunde, 34, needs a kidney transplant</h2>
              </div>
            </div>
            <div className="appeal">
              <span style={{ fontSize: 14, lineHeight: "20px", color: "var(--text2)" }}>Lifeline Kidney Fund, a registered charity, is raising money for Tunde’s transplant at a Lagos teaching hospital. The fund pays the hospital directly. No money goes to a personal account.</span>
              <div className="goal num"><span><b>$4,350</b> raised of $6,000</span><span>72%</span></div>
              <div className="meter" role="img" aria-label="$4,350 of $6,000 raised"><span style={{ width: "72%" }} /></div>
            </div>
            <div className="suggest" style={{ marginTop: 16 }}>
              <span className="lbl"><Ic d={PLUS} />Give extra today</span>
              <Amounts vals={[10, 25, 50, 100]} value={uAmt} set={setUAmt} />
              <span className="extra-note"><Ic d={REFRESH} />A one-off gift, sent today. Your $50 monthly plan stays exactly the same.</span>
            </div>
            <section className="d-sec d-full" style={{ marginTop: 20 }} aria-labelledby="uc-h">
              <h3 id="uc-h">What Pip checked</h3>
              <div className="why">
                <div><span>Lifeline Kidney Fund is registered and filed its accounts on time.</span><div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}><Ver label="Verified" /><a className="src" href="#">Charity Register (sample)</a></div></div>
                <div><span>The hospital confirmed Tunde is on its transplant list.</span><div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}><Ver label="Verified" /><a className="src" href="#">Hospital letter via Lifeline (sample)</a></div></div>
                <div><span>The <span className="num">$6,000</span> cost comes from one hospital quote.</span><div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}><Ver label="Partly verified" /><a className="src" href="#">Treatment quote (sample)</a></div></div>
                <div className="unv">
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Pip mood="concerned" size={30} motion={false} decorative />
                    <span style={{ flex: 1 }}>Lifeline says any extra goes to its next patient. I couldn’t find that in writing.</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}><Ver label="Couldn’t verify" /><a className="src" href="#">Lifeline website</a></div>
                </div>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Why you’re seeing this: it’s in Lagos, and you asked for some of your giving to stay close to home.</span>
            </section>
            <div className="d-actions">
              <div className="check"><Ic d={I.shield} small={false} />You spend ${50 + uAmt} this month <span>· arrives today · within your $100 one-off limit</span></div>
              <div className="btns">
                <button className="btn btn-lg" onClick={() => decide("u1", "skip")}>Not now</button>
                <button className="btn btn-primary btn-lg" onClick={() => decide("u1", "given")}>Send ${uAmt} now</button>
              </div>
            </div>
          </article>
        )}

        {sel === "n1" && !dec.n1 && (
          <article className="card detail" aria-labelledby="n-h">
            <div className="d-head">
              <Pip mood="happy" size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="d-eyebrow"><span className="ttag need">Need met</span><span className="num">Suggested 6 Oct 2026</span></div>
                <h2 id="n-h">ClearSpring’s well project is fully funded</h2>
              </div>
            </div>
            <div className="suggest">
              <span className="lbl"><Ic d={ARROWS} />Pip suggests, until March</span>
              <div className="move">
                <span className="amt num">Move $25/mo</span>
                <span className="org-chip"><span className="logo-ph" style={{ background: "var(--t-cs)", color: "var(--i-cs)" }}>CS</span>ClearSpring Water Initiative</span>
                <span style={{ color: "var(--accent-ink)", display: "flex" }}><Ic d={ARROW} small={false} /></span>
                <span className="org-chip"><span className="logo-ph" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", border: "1px solid var(--accent-line)" }}>BH</span>Blue Horizon Water Trust</span>
              </div>
              <span style={{ fontSize: 13, color: "var(--text2)" }}>November to February. ClearSpring’s next project starts in March, and Pip will ask you before switching back.</span>
            </div>
            <div className="d-grid">
              <section className="d-sec" aria-labelledby="nc-h">
                <h3 id="nc-h">What changed</h3>
                <Evidence
                  items={[
                    { text: <>The Kwara well project reached its <span className="num">$24,000</span> goal.</>, ver: "Verified", src: "ClearSpring project page", date: "4 Oct 2026" },
                    { text: "Their next project starts in March 2027.", ver: "Verified", src: "ClearSpring update", date: "4 Oct 2026" },
                    { text: <>Blue Horizon still needs <span className="num">$1,800</span> for a borehole serving about 600 people.</>, ver: "Partly verified", src: "Blue Horizon appeal", date: "5 Oct 2026" },
                  ]}
                />
              </section>
              <section className="d-sec" aria-labelledby="nb-h">
                <h3 id="nb-h">Your split, now and until March</h3>
                <div className="bars">
                  <span>Now</span>
                  <div className="bar" role="img" aria-label="Now: ClearSpring $25, Bright Futures $15, Roots Local Aid $10"><span style={{ width: "50%", background: "var(--s1)" }} /><span style={{ width: "30%", background: "var(--s2)" }} /><span style={{ width: "20%", background: "var(--s3)" }} /></div>
                  <span>Nov–Feb</span>
                  <div className="bar" role="img" aria-label="November to February: Blue Horizon $25, Bright Futures $15, Roots Local Aid $10"><span style={{ width: "50%", background: "var(--s4)" }} /><span style={{ width: "30%", background: "var(--s2)" }} /><span style={{ width: "20%", background: "var(--s3)" }} /></div>
                </div>
                <ul className="legend" style={{ flex: "none" }}>
                  <li style={{ padding: "8px 0" }}><span className="sw" style={{ background: "var(--s1)" }} /><span style={{ flex: 1, color: "var(--text2)" }}>ClearSpring</span><span className="num" style={{ color: "var(--muted)" }}>$25 → $0, back in March</span></li>
                  <li style={{ padding: "8px 0" }}><span className="sw" style={{ background: "var(--s4)" }} /><span style={{ flex: 1, color: "var(--text2)" }}>Blue Horizon</span><span className="num" style={{ fontWeight: 600 }}>$0 → $25</span></li>
                  <li style={{ padding: "8px 0" }}><span className="sw" style={{ background: "var(--s2)" }} /><span style={{ flex: 1, color: "var(--text2)" }}>Bright Futures</span><span className="num" style={{ color: "var(--muted)" }}>$15 · no change</span></li>
                  <li style={{ padding: "8px 0" }}><span className="sw" style={{ background: "var(--s3)" }} /><span style={{ flex: 1, color: "var(--text2)" }}>Roots Local Aid</span><span className="num" style={{ color: "var(--muted)" }}>$10 · no change</span></li>
                </ul>
              </section>
            </div>
            <div className="d-actions">
              <div className="check"><Ic d={I.shield} small={false} />Within your <span className="num" style={{ color: "inherit", fontWeight: 500 }}>$50</span> budget <span>· total stays $50/mo</span></div>
              <div className="btns">
                <button className="btn btn-lg" onClick={() => decide("n1", "skip")}>Keep as is</button>
                <button className="btn btn-primary btn-lg" onClick={() => decide("n1", "ok")}>Approve until March</button>
              </div>
            </div>
          </article>
        )}

        {sel === "m1" && !dec.m1 && (
          <article className="card detail" aria-labelledby="m-h">
            <div className="d-head">
              <Pip mood="happy" size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="d-eyebrow"><span className="ttag match">Match</span><span className="num">Ends 31 Oct 2026</span></div>
                <h2 id="m-h">Bright Futures has a 2× donor match this month</h2>
              </div>
            </div>
            <div className="suggest">
              <span className="lbl"><Ic d={PLUS} />Pip suggests an extra gift, once</span>
              <Amounts vals={[5, 10, 15, 25]} value={mAmt} set={setMAmt} />
              <span className="extra-note"><Ic d={REFRESH} />With the match, ${mAmt} becomes ${mAmt * 2} for girls’ school fees. Your monthly plan doesn’t change.</span>
            </div>
            <section className="d-sec d-full" style={{ marginTop: 20 }} aria-labelledby="mc-h">
              <h3 id="mc-h">What Pip checked</h3>
              <Evidence
                items={[
                  { text: "A local foundation is matching gifts 1:1 until 31 Oct.", ver: "Verified", src: "Foundation announcement (sample)", date: "1 Oct 2026" },
                  { text: <>About <span className="num">$3,200</span> of the match is left.</>, ver: "Partly verified", src: "Bright Futures counter", date: "7 Oct 2026" },
                ]}
              />
            </section>
            <div className="d-actions">
              <div className="check"><Ic d={I.shield} small={false} />Within your <span className="num" style={{ color: "inherit", fontWeight: 500 }}>$100</span> one-off limit <span>· plan stays $50/mo</span></div>
              <div className="btns">
                <button className="btn btn-lg" onClick={() => decide("m1", "skip")}>Not now</button>
                <button className="btn btn-primary btn-lg" onClick={() => decide("m1", "given")}>Give ${mAmt} once</button>
              </div>
            </div>
          </article>
        )}

        {r && (
          <article className="card" aria-labelledby="rd-h">
            <div className="d-head">
              <Pip mood="idle" size={56} motion={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="d-eyebrow"><span className={`ttag ${r.tag}`}>{r.tagLabel}</span><span className="chip ok"><i />Approved</span><span className="num">{r.when}</span></div>
                <h2 id="rd-h">{r.title}</h2>
              </div>
            </div>
            <div className="d-sec d-full" style={{ gap: 16 }}>
              <p style={{ margin: 0, color: "var(--text2)" }}>{r.body}</p>
              <dl className="kv">
                <dt>Decided by</dt><dd>You</dd>
                <dt>When</dt><dd className="num">{r.when}</dd>
                <dt>Money</dt><dd>{r.money}</dd>
                <dt>Evidence</dt><dd><span style={{ display: "inline-flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}><span className="chip ok">Verified</span><a className="src" href="#">{r.src}</a></span></dd>
              </dl>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
