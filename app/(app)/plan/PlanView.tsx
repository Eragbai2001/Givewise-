"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import Pip from "@/components/Pip";
import { I, Ic } from "@/components/app/icons";
import EmptyState from "@/components/app/EmptyState";
import PaymentPanel from "@/components/app/PaymentPanel";
import { FoundCard } from "@/components/app/LiveSearch";
import { usePayments } from "@/lib/use-payments";
import { useOnboarded } from "@/lib/onboarding";

const PER_PAGE = 6;
const money = (n: number) => `$${n.toFixed(2)}`;

export default function PlanView() {
  const { status, loaded, reload } = usePayments();
  const onboarded = useOnboarded();

  const charities = (status?.plan ?? []).map((i, n) => {
    const words = i.charityName.split(/\s+/).filter(Boolean);
    return {
      id: i.charityId,
      ini: ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase(),
      name: i.charityName,
      short: words.slice(0, 2).join(" "),
      cause: "Found by Pip",
      amount: i.amountCents / 100,
      since: "—",
      status: { label: "In your plan", chip: "ok" },
      checked: "—",
      color: ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)"][n % 4],
      tint: "var(--grey-soft)",
      ink: "var(--grey-ink)",
    };
  });
  const paid = (status?.payments ?? []).filter((p) => p.status === "COMPLETED");
  const payments = paid.map((p) => ({
    date: new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    name: p.charityName,
    ref: p.orderId ?? p.id,
    amount: p.amountCents / 100,
  }));

  const hasPlan = charities.length > 0;
  const hasPayments = payments.length > 0;
  const limit = status ? status.hardLimitCents / 100 : 50;
  const firstPaid = paid.length ? new Date(paid[paid.length - 1].createdAt) : null;
  const nextFirst = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  })();
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
      <div className="head">
        <div>
          <h1>My plan</h1>
          <p>
            {!loaded
              ? "Loading your plan…"
              : firstPaid
                ? `Giving since ${firstPaid.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
                : hasPlan
                  ? "Plan approved · no payment has gone out yet"
                  : "You haven’t set up a plan yet. Pip can find charities for you in a few minutes."}
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

      <Suspense>
        <PaymentPanel onChanged={reload} />
      </Suspense>

      {loaded && !hasPlan && (
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
              {onboarded ? (
                <Link className="btn btn-primary" href="/discover">Find charities with Pip</Link>
              ) : (
                <>
                  <Link className="btn btn-primary" href="/onboarding">Set up with Pip</Link>
                  <Link className="btn" href="/discover">Browse charities first</Link>
                </>
              )}
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
                <span>of {money(limit)}</span>
              </>
            ) : (
              <span>No plan yet</span>
            )}
          </div>
        </div>
        <div className="stat">
          <div className="stat-top"><span>Given so far</span><span className="ibox"><Ic d={I.heart} /></span></div>
          <div className={`stat-val num ${hasPayments ? "" : "muted"}`}>{money(given)}</div>
          <div className="stat-sub"><span>{hasPayments ? `${payments.length} ${payments.length === 1 ? "payment" : "payments"} so far` : "Your first gift will show here"}</span></div>
        </div>
        <div className="stat">
          <div className="stat-top"><span>Charities</span><span className="ibox"><Ic d={I.building} /></span></div>
          <div className={`stat-val num ${hasPlan ? "" : "muted"}`}>{charities.length}</div>
          <div className="stat-sub">
            {hasPlan ? <span>All checked by Pip</span> : <span>Pick some in Discover</span>}
          </div>
        </div>
        <div className="stat">
          <div className="stat-top"><span>Next payment</span><span className="ibox"><Ic d={I.calendar} /></span></div>
          <div className={`stat-val ${hasPlan ? "" : "muted"}`}>{hasPlan ? nextFirst : "—"}</div>
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
                    <span className="num" style={{ color: "var(--muted)", width: 36, textAlign: "right" }}>{total ? Math.round((c.amount / total) * 100) : 0}%</span>
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
          <div className="card-h"><h2 id="watch-h">Pip’s weekly check</h2><span className="meta">Not started</span></div>
          {hasPlan ? (
            <EmptyState mood="idle" title="Weekly checks are coming" body="Pip will check the charities in your plan every Monday and show you, with sources, if anything changes. Until then, use “Ask Pip” on Discover to research any charity." />
          ) : (
            <EmptyState mood="idle" title="Nothing to check yet" body="When you have charities in your plan, Pip checks them every Monday and tells you, with sources, if anything changes." />
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="ch-h">
        <div className="card-h"><h2 id="ch-h">Your charities</h2>{hasPlan && <Link className="btn btn-sm" href="/discover">View all</Link>}</div>
        {hasPlan ? (
          <>
        <p className="plan-ch-note">What Pip found about each charity, with the links to check it yourself.</p>
        <div className="results plan-ch">
          {(status?.plan ?? []).map((item) => {
            const paidNow = status?.paidCharityIds.includes(item.charityId);
            const foot = (
              <div className="plan-ch-foot">
                <span className="num"><b>{money(item.amountCents / 100)}</b> a month</span>
                <span className={`chip ${paidNow ? "ok" : "neutral"}`}><i />{paidNow ? "Paid this month" : "In your plan"}</span>
                {item.details && (
                  <span className="plan-ch-date">Checked {new Date(item.details.checkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                )}
              </div>
            );
            if (item.details) {
              return <FoundCard key={item.charityId} f={item.details}>{foot}</FoundCard>;
            }
            // Saved before Pip kept its findings: show what we have and how to see the sources again.
            const words = item.charityName.split(/\s+/).filter(Boolean);
            return (
              <article key={item.charityId} className="ccard" aria-label={item.charityName}>
                <div className="top">
                  <span className="logo-ph" style={{ background: "var(--grey-soft)", color: "var(--grey-ink)" }}>
                    {((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                    <h3>{item.charityName}</h3>
                    <span className="loc">Found by Pip</span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  This charity was added before Pip started keeping its sources. Search for it on Discover to see what Pip found and the links to check it.
                </p>
                <Link className="src" href={`/discover?q=${encodeURIComponent(item.charityName)}`}>Look it up on Discover ↗</Link>
                {foot}
              </article>
            );
          })}
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
            body={hasPlan ? `Your next payment day is ${nextFirst}. Each payment shows here with its PayPal order ID.` : "Payments show here once you approve a plan in PayPal. Nothing is ever taken without your approval."}
          />
        )}
      </section>
    </main>
  );
}
