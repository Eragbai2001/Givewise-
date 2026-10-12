"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Pip from "@/components/Pip";
import EmptyState from "@/components/app/EmptyState";
import { I, Ic } from "@/components/app/icons";
import { useDemoState } from "@/lib/demo-state";

const DROP = ["M12 2.5C10.5 5 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-5.5-10-7-12.5z"];
const CAP = ["M22 10L12 5 2 10l10 5 10-5z", "M6 12v5c3 2 9 2 12 0v-5"];

type Charity = {
  id: "cs" | "bf" | "rl";
  name: string;
  short: string;
  ini: string;
  tint: string;
  ink: string;
  status: string;
  statusChip: string;
  title: string;
  img: string;
  alt: string;
  given: number;
  planned: number;
  mini: { v: string; k: string }[];
  when?: string;
  story?: string;
  conf?: string;
  confChip?: string;
  src?: string;
};

const CHARITIES: Charity[] = [
  {
    id: "cs", name: "ClearSpring Water Initiative", short: "ClearSpring", ini: "CS", tint: "var(--t-cs)", ink: "var(--i-cs)",
    status: "Project funded", statusChip: "neutral", title: "Clean water for families near Tamale",
    img: "/images/water-tap-hd.jpg", alt: "A child cupping clean water from a tap", given: 125, planned: 175,
    mini: [{ v: "≈31", k: "People with water for a year · your share" }, { v: "120", k: "Wells built or repaired in 2025" }, { v: "5", k: "Monthly gifts received" }],
    when: "18 Sep 2026",
    story: "ClearSpring finished repairing a borehole outside Tamale that around 400 people use every day. Your share is worked out from their own cost of about $4 per person per year. That project is now fully funded, and their next one starts in March.",
    conf: "Partly verified", confChip: "rev", src: "ClearSpring field update",
  },
  {
    id: "bf", name: "Bright Futures Scholarship Fund", short: "Bright Futures", ini: "BF", tint: "var(--t-bf)", ink: "var(--i-bf)",
    status: "Healthy", statusChip: "ok", title: "Keeping girls in school in Kano and Kaduna",
    img: "/images/schoolgirls.jpg", alt: "Two schoolgirls laughing together", given: 75, planned: 105,
    mini: [{ v: "62%", k: "Of one girl’s school term · your share" }, { v: "310", k: "Scholarships funded in 2025" }, { v: "5", k: "Monthly gifts received" }],
    when: "6 Oct 2026",
    story: "This year’s scholars sat their junior secondary exams in July. The charity says 9 in 10 passed. We’re waiting on the exam board’s list to confirm it. The number of scholarships comes from their audited accounts.",
    conf: "Partly verified", confChip: "rev", src: "Bright Futures exam update",
  },
  {
    id: "rl", name: "Roots Local Aid", short: "Roots Local Aid", ini: "RL", tint: "var(--t-rl)", ink: "var(--i-rl)",
    status: "Couldn’t verify", statusChip: "conf-n", title: "Community support in Lagos",
    img: "/images/pantry-hd.jpg", alt: "Volunteers sorting donations in a pantry", given: 50, planned: 70,
    mini: [{ v: "$50", k: "Given since June" }, { v: "5", k: "Monthly gifts received" }, { v: "0", k: "Updates we could check" }],
  },
];

const FEED = [
  { org: "Bright Futures", ago: "2 days ago", title: "Exam results are in", body: "9 in 10 scholars passed their junior exams, the charity says.", conf: "Partly verified", chip: "rev" },
  { org: "Roots Local Aid", ago: "5 days ago", title: "We asked for an update", body: "No reply yet. Anything they send will show up here.", conf: "Waiting", chip: "neutral" },
  { org: "ClearSpring", ago: "6 days ago", title: "Well project fully funded", body: "Pip suggested where your $25 could help until March.", conf: "Verified", chip: "ok" },
  { org: "ClearSpring", ago: "3 weeks ago", title: "Borehole repaired outside Tamale", body: "Serves about 400 people every day.", conf: "Partly verified", chip: "rev" },
  { org: "Bright Futures", ago: "1 month ago", title: "2025 accounts filed on time", body: "Confirms 310 scholarships funded last year.", conf: "Verified", chip: "ok" },
];

export default function ImpactView() {
  const { state } = useDemoState();
  const [sel, setSel] = useState<Charity["id"]>("cs");
  const [reminded, setReminded] = useState(false);
  const c = CHARITIES.find((x) => x.id === sel)!;
  const hasGifts = state === "full";

  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>Your impact</h1>
          <p>What your giving has helped do, using only results we can trace to a source.</p>
        </div>
        {hasGifts && (
          <div className="actions">
            <button className="btn"><Ic d={I.download} />Download impact summary</button>
          </div>
        )}
      </div>

      {state === "empty" && (
        <section className="card">
          <EmptyState
            mood="idle"
            title="Your impact will show here"
            body="Once you start giving, Pip collects what each charity reports, checks it, and shows what your share helped do, always with a source and a confidence label."
            action={<Link className="btn btn-primary btn-sm" href="/onboarding">Set up with Pip</Link>}
          />
        </section>
      )}

      {state !== "empty" && (
        <>
          <section className="stats" aria-label="Impact summary">
            <div className="stat">
              <div className="stat-top"><span>Given so far</span><span className="ibox"><Ic d={I.heart} /></span></div>
              <div className={`stat-val num ${hasGifts ? "" : "muted"}`}>{hasGifts ? "$250.00" : "$0.00"}</div>
              <div className="stat-sub">{hasGifts ? "Jun – Oct 2026 · 3 charities" : "First gift goes out 1 Nov"}</div>
            </div>
            <div className="stat">
              <div className="stat-top"><span>Clean water</span><span className="ibox"><Ic d={DROP} /></span></div>
              <div className={`stat-val num ${hasGifts ? "" : "muted"}`}>{hasGifts ? "≈31 people" : "—"}</div>
              <div className="stat-sub">{hasGifts ? <><span className="chip neutral">Estimate</span>water for a year</> : "After your first gift"}</div>
            </div>
            <div className="stat">
              <div className="stat-top"><span>Girls’ education</span><span className="ibox"><Ic d={CAP} /></span></div>
              <div className={`stat-val num ${hasGifts ? "" : "muted"}`}>{hasGifts ? "62% of a term" : "—"}</div>
              <div className="stat-sub">{hasGifts ? <><span className="chip neutral">Estimate</span>for one girl</> : "After your first gift"}</div>
            </div>
            <div className="stat">
              <div className="stat-top"><span>Charities reporting</span><span className="ibox"><Ic d={I.file} /></span></div>
              <div className={`stat-val num ${hasGifts ? "" : "muted"}`}>{hasGifts ? "2 of 3" : "0 of 3"}</div>
              <div className="stat-sub">{hasGifts ? <span className="chip rev"><i />Roots hasn’t reported</span> : "Nothing to report yet"}</div>
            </div>
          </section>

          <div className="ctabs" role="tablist" aria-label="Choose a charity">
            {CHARITIES.map((t) => (
              <button key={t.id} className={`ctab ${sel === t.id ? "on" : ""}`} role="tab" aria-selected={sel === t.id} onClick={() => setSel(t.id)}>
                <span className="logo-ph" style={{ background: t.tint, color: t.ink }}>{t.ini}</span>
                {t.short}
              </button>
            ))}
          </div>

          <div className="imp-grid">
            <article className="card" aria-labelledby="ic-h">
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div className="hero-img">
                  <Image key={c.img} src={c.img} alt={c.alt} fill sizes="(max-width: 1180px) 100vw, 60vw" style={{ objectFit: "cover" }} quality={85} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{c.name}</span>
                    <span className={`chip ${c.statusChip}`}><i />{c.status}</span>
                  </div>
                  <h2 id="ic-h" style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 600, letterSpacing: "-.01em" }}>{c.title}</h2>
                </div>

                {hasGifts ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, color: "var(--muted)" }}>
                        <span>Given so far</span>
                        <span className="num">${c.given} of ${c.planned} planned for 2026</span>
                      </div>
                      <div className="prog" role="img" aria-label={`$${c.given} given, ${Math.round((c.given / c.planned) * 100)}% of this year’s plan`}>
                        <span style={{ width: `${Math.round((c.given / c.planned) * 100)}%` }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                        <span className="num" style={{ color: "var(--accent-ink)", fontWeight: 500 }}>${c.given}.00 · {Math.round((c.given / c.planned) * 100)}% of this year’s plan</span>
                        <span style={{ color: "var(--muted)" }}>Next gift 1 Nov</span>
                      </div>
                    </div>
                    <div className="mini">
                      {c.mini.map((m) => (
                        <div key={m.k}><span className="v num">{m.v}</span><span className="k">{m.k}</span></div>
                      ))}
                    </div>
                    {c.story ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                        <h3 style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 600 }}>Latest update · {c.when}</h3>
                        <p className="story">{c.story}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}>
                          <span className={`chip ${c.confChip}`}>{c.conf}</span>
                          <a className="src" href="#">{c.src}</a>
                        </div>
                      </div>
                    ) : (
                      <div className="noup">
                        <Pip mood="concerned" size={56} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <strong style={{ fontWeight: 600 }}>No update we can check yet</strong>
                          <p className="story">Roots Local Aid hasn’t published results, so we won’t guess what your $50 did. Small community groups often don’t, and asking helps. We asked on 3 Oct.</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <button className="btn btn-primary" onClick={() => setReminded(true)} disabled={reminded}>{reminded ? "Reminder sent" : "Remind Roots"}</button>
                            <button className="btn">Why we don’t guess</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="noup">
                    <Pip mood="idle" size={56} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <strong style={{ fontWeight: 600 }}>Nothing to show yet</strong>
                      <p className="story">Your first gift to {c.short} goes out on 1 Nov. When they report what it helped do, Pip will check it and show it here with a source.</p>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <aside className="card" aria-labelledby="feed-h">
              <div className="card-h"><h2 id="feed-h">Impact updates</h2></div>
              {hasGifts ? (
                <div className="feed">
                  {FEED.map((f) => (
                    <div className="fitem" key={f.title}>
                      <div className="top2"><span className="org2">{f.org}</span><span style={{ color: "var(--muted)" }}>{f.ago}</span></div>
                      <b>{f.title}</b>
                      <p>{f.body}</p>
                      <span className={`chip ${f.chip}`} style={{ alignSelf: "flex-start" }}>{f.conf}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState compact icon={I.file} title="No updates yet" body="Charity updates appear here as they come in, each with a confidence label." />
              )}
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
