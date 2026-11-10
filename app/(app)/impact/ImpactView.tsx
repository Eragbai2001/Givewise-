"use client";

import Link from "next/link";
import EmptyState from "@/components/app/EmptyState";
import { I, Ic } from "@/components/app/icons";
import { usePayments } from "@/lib/use-payments";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Impact from the donor's real payments only. We never estimate what a gift "did":
 * results will appear here once Pip can link them to a charity's own report.
 */
export default function ImpactView() {
  const { status, loaded } = usePayments();
  const paid = (status?.payments ?? []).filter((p) => p.status === "COMPLETED");
  const total = paid.reduce((s, p) => s + p.amountCents, 0);

  const byCharity = new Map<string, { name: string; cents: number; gifts: number; first: string; last: string }>();
  for (const p of paid) {
    const c = byCharity.get(p.charityName) ?? { name: p.charityName, cents: 0, gifts: 0, first: p.createdAt, last: p.createdAt };
    c.cents += p.amountCents;
    c.gifts += 1;
    if (p.createdAt < c.first) c.first = p.createdAt;
    if (p.createdAt > c.last) c.last = p.createdAt;
    byCharity.set(p.charityName, c);
  }
  const rows = [...byCharity.values()].sort((a, b) => b.cents - a.cents);
  const oneOff = paid.filter((p) => p.kind === "one-off").reduce((s, p) => s + p.amountCents, 0);

  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>Your impact</h1>
          <p>What you’ve given, from your real PayPal payments. We only show results we can trace to a source.</p>
        </div>
      </div>

      {!loaded ? (
        <section className="card"><p style={{ margin: 0, padding: 24, color: "var(--muted)" }}>Loading your giving…</p></section>
      ) : paid.length === 0 ? (
        <section className="card">
          <EmptyState
            mood="idle"
            title="Your impact will show here"
            body="Once your first gift goes through PayPal, you’ll see what you’ve given to each charity. Pip never guesses what a gift did. Results only appear when a charity’s own report backs them up."
            action={<Link className="btn btn-primary btn-sm" href={status?.planSaved ? "/plan" : "/discover"}>{status?.planSaved ? "Go to My plan" : "Find charities with Pip"}</Link>}
          />
        </section>
      ) : (
        <>
          <section className="stats" aria-label="Impact summary">
            <div className="stat">
              <div className="stat-top"><span>Given so far</span><span className="ibox"><Ic d={I.heart} /></span></div>
              <div className="stat-val num">{money(total)}</div>
              <div className="stat-sub">Since {day(paid[paid.length - 1].createdAt)}</div>
            </div>
            <div className="stat">
              <div className="stat-top"><span>Charities helped</span><span className="ibox"><Ic d={I.building} /></span></div>
              <div className="stat-val num">{rows.length}</div>
              <div className="stat-sub">All found and checked by Pip</div>
            </div>
            <div className="stat">
              <div className="stat-top"><span>Gifts sent</span><span className="ibox"><Ic d={I.file} /></span></div>
              <div className="stat-val num">{paid.length}</div>
              <div className="stat-sub">Each has a PayPal order ID</div>
            </div>
            <div className="stat">
              <div className="stat-top"><span>Extra one-off gifts</span><span className="ibox"><Ic d={I.wallet} /></span></div>
              <div className={`stat-val num ${oneOff ? "" : "muted"}`}>{money(oneOff)}</div>
              <div className="stat-sub">Urgent appeals you chose</div>
            </div>
          </section>

          <section className="card" aria-labelledby="by-h">
            <div className="card-h"><h2 id="by-h">By charity</h2><Link className="btn btn-sm" href="/history">All payments</Link></div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Charity</th><th>Gifts</th><th>First gift</th><th>Latest gift</th><th style={{ textAlign: "right" }}>Given</th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.name}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td className="num" style={{ color: "var(--text2)" }}>{c.gifts}</td>
                      <td className="num" style={{ color: "var(--text2)" }}>{day(c.first)}</td>
                      <td className="num" style={{ color: "var(--text2)" }}>{day(c.last)}</td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{money(c.cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mlist">
              {rows.map((c) => (
                <div key={c.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontWeight: 500 }}>{c.name}</span><span className="num" style={{ fontWeight: 600 }}>{money(c.cents)}</span></div>
                  <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{c.gifts} {c.gifts === 1 ? "gift" : "gifts"} · latest {day(c.last)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <EmptyState
              compact
              icon={I.file}
              title="No checked results yet"
              body="Pip doesn’t estimate what your money did. When a charity publishes a report or update, Pip will check it and show it here with the source."
            />
          </section>
        </>
      )}

      {status?.env === "sandbox" && (
        <p style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--muted)" }}>
          Test mode: payments use PayPal sandbox, so no real money has moved.
        </p>
      )}
    </main>
  );
}
