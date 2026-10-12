"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Pip from "@/components/Pip";
import { I, Ic } from "@/components/app/icons";
import { charities as ALL_CHARITIES, payments as ALL_PAYMENTS, MONTHLY_LIMIT } from "@/lib/plan-data";
import EmptyState from "@/components/app/EmptyState";
import { useDemoState } from "@/lib/demo-state";

const PER_PAGE = 6;
const money = (n: number) => `$${n.toFixed(2)}`;

export default function PlanView() {
  const { state } = useDemoState();
  const charities = state === "empty" ? [] : ALL_CHARITIES;
  const payments = state === "full" ? ALL_PAYMENTS : [];
  const hasPlan = charities.length > 0;
  const hasPayments = payments.length > 0;
  const [banner, setBanner] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const total = charities.reduce((s, c) => s + c.amount, 0);
  const given = payments.reduce((s, p) => s + p.amount, 0);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? payments.filter((p) => p.name.toLowerCase().includes(t)) : payments;
  }, [q, payments]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  // donut geometry (r=60)
  const C = 2 * Math.PI * 60;
  let offset = 0;
  const segs = charities.map((c) => {
    const len = (c.amount / total) * C;
    const seg = { color: c.color, dash: `${Math.max(len - 3, 0)} ${C}`, off: -offset };
    offset += len;
    return seg;
  });

  return (
    <main className="content">
      {banner && state === "new" && (
        <div className="banner" role="status">
          <span className="bdot" aria-hidden="true" style={{ background: "var(--accent)" }} />
          <p>
            <b>Your plan is approved</b>
            <span className="hide-m"> · the first payment goes out on 1 Nov. Pip will do its first full check on Monday.</span>
          </p>
          <button className="iconbtn sq" onClick={() => setBanner(false)} aria-label="Dismiss" style={{ background: "transparent", borderColor: "transparent", width: 24, height: 24 }}>
            <Ic d={I.close} />
          </button>
        </div>
      )}

      {banner && state === "full" && (
        <div className="banner" role="status">
          <span className="bdot" aria-hidden="true" />
          <p>
            <b>3 suggestions from Pip</b>
            <span className="hide-m"> · including 1 urgent appeal that fits your values. Nothing changes unless you say so.</span>
          </p>
          <Link className="blink" href="/suggestions">
            Review
            <Ic d={I.chevronRight} />
          </Link>
          <button className="iconbtn sq" onClick={() => setBanner(false)} aria-label="Dismiss" style={{ background: "transparent", borderColor: "transparent", width: 24, height: 24 }}>
            <Ic d={I.close} />
          </button>
        </div>
      )}

      <div className="head">
        <div>
          <h1>My plan</h1>
          <p>
            {state === "full" && "Giving since June 2026 · Pip last checked your charities 7 Oct, 08:00"}
            {state === "new" && "Plan approved 9 Oct 2026 · first payment on 1 Nov"}
            {state === "empty" && "You haven’t set up a plan yet. It takes about 3 minutes with Pip."}
          </p>
        </div>
        <div className="actions">
          <Link className="btn" href="/settings">
            <Ic d={I.equalizer} />
            Edit values &amp; limit
          </Link>
          {hasPayments && (
            <Link className="btn" href="/history">
              <Ic d={I.download} />
              Download statement
            </Link>
          )}
        </div>
      </div>

      {!hasPlan && (
        <section className="setup-card" aria-labelledby="setup-h">
          <Pip mood="happy" size={88} />
          <div>
            <h2 id="setup-h">Let’s set up your giving plan</h2>
            <p>Tell Pip what you care about and how much you can give each month. Pip suggests checked charities, and nothing moves until you approve it in PayPal.</p>
            <ol className="setup-steps">
              <li><span className="n">1</span>Pick your causes</li>
              <li><span className="n">2</span>Set a monthly limit</li>
              <li><span className="n">3</span>Connect PayPal</li>
              <li><span className="n">4</span>Approve your split</li>
            </ol>
            <div className="setup-actions">
              <Link className="btn btn-primary" href="/onboarding">Set up with Pip</Link>
              <Link className="btn" href="/discover">Browse charities first</Link>
            </div>
          </div>
        </section>
      )}

      <section className="stats" aria-label="Summary">
        <div className="stat">
          <div className="stat-top"><span>Monthly giving</span><span className="ibox"><Ic d={I.wallet} /></span></div>
          <div className={`stat-val num ${hasPlan ? "" : "muted"}`}>{money(total)}</div>
          <div className="stat-sub">
            {hasPlan ? (
              <>
                <span className="chip ok">Within limit</span>
                <span>of {money(MONTHLY_LIMIT)}</span>
              </>
            ) : (
              <span>No plan yet</span>
            )}
          </div>
        </div>
        <div className="stat">
          <div className="stat-top"><span>Given so far</span><span className="ibox"><Ic d={I.heart} /></span></div>
          <div className={`stat-val num ${hasPayments ? "" : "muted"}`}>{money(given)}</div>
          <div className="stat-sub"><span>{hasPayments ? "5 monthly payments since Jun" : "Your first gift will show here"}</span></div>
        </div>
        <div className="stat">
          <div className="stat-top"><span>Charities</span><span className="ibox"><Ic d={I.building} /></span></div>
          <div className={`stat-val num ${hasPlan ? "" : "muted"}`}>{charities.length}</div>
          <div className="stat-sub">
            {state === "full" ? <span className="chip neutral"><i />1 project fully funded</span> : hasPlan ? <span>All checked by Pip</span> : <span>Pick some in Discover</span>}
          </div>
        </div>
        <div className="stat">
          <div className="stat-top"><span>Next payment</span><span className="ibox"><Ic d={I.calendar} /></span></div>
          <div className={`stat-val ${hasPlan ? "" : "muted"}`}>{hasPlan ? "1 Nov" : "—"}</div>
          <div className="stat-sub"><span className="num">{hasPlan ? `${money(total)} to ${charities.length} charities` : "Not scheduled"}</span></div>
        </div>
      </section>

      <div className="row2">
        <section className="card" aria-labelledby="split-h">
          <div className="card-h"><h2 id="split-h">Current split</h2><span className="meta">Monthly · PayPal sandbox</span></div>
          {hasPlan ? (
          <div className="card-b split">
              <div className="donut">
                <svg viewBox="0 0 160 160" width="176" height="176" role="img" aria-label={charities.map((c) => `${c.short} $${c.amount}`).join(", ") + `, total $${total} a month`}>
                  <g transform="rotate(-90 80 80)">
                    <circle className="track" cx="80" cy="80" r="60" />
                    {segs.map((s, i) => (
                      <circle key={i} cx="80" cy="80" r="60" fill="none" strokeWidth={18} stroke={s.color} strokeDasharray={s.dash} strokeDashoffset={s.off} />
                    ))}
                  </g>
                </svg>
                <div className="donut-c">
                  <span className="num" style={{ fontSize: 24, lineHeight: "30px", fontWeight: 600 }}>${total}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>per month</span>
                </div>
              </div>
              <ul className="legend">
                {charities.map((c) => (
                  <li key={c.id}>
                    <span className="sw" style={{ background: c.color }} />
                    <span style={{ flex: 1, minWidth: 0 }}>{c.name}</span>
                    <span className="num" style={{ color: "var(--muted)", width: 36, textAlign: "right" }}>{Math.round((c.amount / total) * 100)}%</span>
                    <span className="num" style={{ fontWeight: 600, width: 44, textAlign: "right" }}>${c.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="card-b split">
              <div className="donut">
                <svg viewBox="0 0 160 160" width="176" height="176" aria-hidden="true">
                  <circle className="track empty-ring" cx="80" cy="80" r="60" />
                </svg>
                <div className="donut-c">
                  <span className="num" style={{ fontSize: 24, lineHeight: "30px", fontWeight: 600, color: "var(--muted)" }}>$0</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>per month</span>
                </div>
              </div>
              <EmptyState compact icon={I.plan} title="No split yet" body="Once you pick causes, Pip suggests how to share your monthly budget. You can change every amount." />
            </div>
          )}
          <div className="card-note"><Ic d={I.shield} />Your split only changes when you approve it.</div>
        </section>

        <section className="card" aria-labelledby="watch-h">
          <div className="card-h"><h2 id="watch-h">Pip’s weekly check</h2><span className="meta">{hasPlan ? (state === "new" ? "First check Monday" : "Next check 14 Oct") : "Not started"}</span></div>
          {state === "full" ? (
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <Pip mood="happy" size={56} />
                <div className="bubble" style={{ flex: 1 }}>Good news: ClearSpring’s well project hit its goal. I have an idea for your $25 until March.</div>
              </div>
              <ul className="watch" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                <li>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontWeight: 500 }}>ClearSpring</strong><span className="chip neutral"><i />Project funded</span></div>
                  <span style={{ color: "var(--text2)" }}>Kwara well project reached its goal</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}>
                    <span className="chip ok"><Ic d={I.check} style={{ width: 12, height: 12 }} />Verified</span>
                    <a className="src" href="#">ClearSpring project page</a>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>4 Oct</span>
                  </div>
                </li>
                <li>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontWeight: 500 }}>Bright Futures</strong><span className="chip ok"><i />Healthy</span></div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center" }}><span style={{ color: "var(--text2)" }}>Accounts filed on time</span><a className="src" href="#">Charity Register (sample)</a></div>
                </li>
                <li>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontWeight: 500 }}>Roots Local Aid</strong><span className="chip ok"><i />Healthy</span></div>
                  <span style={{ color: "var(--text2)" }}>Nothing new since 12 Aug</span>
                </li>
              </ul>
            </div>
          ) : state === "new" ? (
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <Pip mood="idle" size={56} />
                <div className="bubble" style={{ flex: 1 }}>I checked all three when you picked them. My first weekly check is on Monday, and I’ll tell you if anything changes.</div>
              </div>
              <ul className="watch" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {charities.map((c) => (
                  <li key={c.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontWeight: 500 }}>{c.short}</strong><span className="chip ok"><i />Checked</span></div>
                    <span style={{ color: "var(--text2)" }}>Checked when you picked it · 9 Oct</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState mood="idle" title="Nothing to check yet" body="When you have charities in your plan, Pip checks them every Monday and tells you, with sources, if anything changes." />
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="ch-h">
        <div className="card-h"><h2 id="ch-h">Your charities</h2>{hasPlan && <Link className="btn btn-sm" href="/discover">View all</Link>}</div>
        {hasPlan ? (
          <>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Charity</th><th>Cause</th><th>Monthly</th><th>Giving since</th><th>Status</th><th>Last checked</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {charities.map((c) => (
                <tr key={c.id}>
                  <td><span className="org"><span className="logo-ph" style={{ background: c.tint, color: c.ink }}>{c.ini}</span>{c.name}</span></td>
                  <td style={{ color: "var(--text2)" }}>{c.cause}</td>
                  <td className="num" style={{ fontWeight: 500 }}>{money(c.amount)}</td>
                  <td className="num" style={{ color: "var(--text2)" }}>{c.since}</td>
                  <td><span className={`chip ${c.status.chip}`}><i />{c.status.label}</span></td>
                  <td className="num" style={{ color: "var(--text2)" }}>{c.checked}</td>
                  <td><button className="iconbtn sq" aria-label={`More for ${c.short}`} style={{ borderColor: "transparent", background: "transparent" }}><Ic d={I.dots} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mlist">
          {charities.map((c) => (
            <div key={c.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="logo-ph" style={{ background: c.tint, color: c.ink }}>{c.ini}</span><span style={{ flex: 1, fontWeight: 500 }}>{c.name}</span><span className="num" style={{ fontWeight: 600 }}>${c.amount}</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center", paddingLeft: 42 }}><span className={`chip ${c.status.chip}`}><i />{c.status.label}</span><span style={{ fontSize: 12, color: "var(--muted)" }}>{c.cause} · checked 7 Oct</span></div>
            </div>
          ))}
        </div>
          </>
        ) : (
          <EmptyState
            icon={I.building}
            title="No charities yet"
            body="Search for charities yourself, or let Pip find ones that match what you care about. Every one comes with a confidence label and a source."
            action={<Link className="btn btn-primary btn-sm" href="/discover">Find charities</Link>}
          />
        )}
      </section>

      <section className="card" aria-labelledby="pay-h">
        <div className="card-h">
          <h2 id="pay-h">Recent payments</h2>
          {hasPayments && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
            <label className="search">
              <Ic d={I.search} />
              <span className="sr-only">Search payments</span>
              <input type="search" placeholder="Search charity" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </label>
            <button className="btn hide-m"><Ic d={I.filter} />Filter</button>
            <button className="btn hide-m"><Ic d={I.download} />Export CSV</button>
          </div>
          )}
        </div>
        {hasPayments ? (
          <>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Charity</th><th>Method</th><th>Reference</th><th>Status</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.ref}>
                  <td className="num" style={{ color: "var(--text2)" }}>{p.date}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ color: "var(--text2)" }}>PayPal sandbox</td>
                  <td className="num" style={{ color: "var(--muted)" }}>{p.ref}</td>
                  <td><span className="chip ok"><i />Paid</span></td>
                  <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mlist">
          {rows.map((p) => (
            <div key={p.ref}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontWeight: 500 }}>{p.name}</span><span className="num" style={{ fontWeight: 600 }}>{money(p.amount)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{p.date} · PayPal sandbox</span><span className="chip ok"><i />Paid</span></div>
            </div>
          ))}
        </div>
        {!filtered.length && <p style={{ margin: 0, padding: "24px 18px", textAlign: "center", color: "var(--muted)" }}>No payments match “{q}”.</p>}
        <div className="foot">
          <span className="num">{filtered.length ? `Showing ${(cur - 1) * PER_PAGE + 1} to ${(cur - 1) * PER_PAGE + rows.length} of ${filtered.length} payments` : "No results"}</span>
          <div className="pager" role="navigation" aria-label="Pages">
            <button onClick={() => setPage(Math.max(1, cur - 1))} aria-label="Previous page"><Ic d={I.chevronLeft} /></button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} className={n === cur ? "on" : ""} aria-current={n === cur ? "page" : undefined} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button onClick={() => setPage(Math.min(pages, cur + 1))} aria-label="Next page"><Ic d={I.chevronRight} /></button>
          </div>
        </div>
          </>
        ) : (
          <EmptyState
            compact
            icon={I.file}
            title="No payments yet"
            body={hasPlan ? "Your first payment goes out on 1 Nov. Each one shows here with a PayPal reference and a receipt." : "Payments show here once you approve a plan in PayPal. Nothing is ever taken without your approval."}
          />
        )}
      </section>
    </main>
  );
}
