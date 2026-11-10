"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import EmptyState from "@/components/app/EmptyState";
import { I, Ic } from "@/components/app/icons";
import { usePayments, type RealPayment } from "@/lib/use-payments";
import { useOnboarded } from "@/lib/onboarding";

type Row = { t: "pay" | "you" | "pip"; date: string; what: string; charity: string; by: string; amount: string; status: string; chip: string; ref?: string | null };

const PER = 10;

const STATUS: Record<string, [string, string]> = {
  COMPLETED: ["Paid", "ok"],
  PENDING: ["Pending", "rev"],
  FAILED: ["Failed", "conf-n"],
  BLOCKED: ["Stopped by your limit", "conf-n"],
};

/** The donor's real payments from the server, shaped like the designed rows. */
function realRows(payments: RealPayment[]): Row[] {
  return payments.map((p) => {
    const [status, chip] = STATUS[p.status] ?? [p.status, "neutral"];
    return {
      t: "pay" as const,
      date: new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      what: p.kind === "one-off" ? "One-off gift" : "Monthly gift",
      charity: p.charityName,
      by: "PayPal sandbox",
      amount: `$${(p.amountCents / 100).toFixed(2)}`,
      status,
      chip,
      ref: p.orderId,
    };
  });
}
const FILTER = ["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"];
const SORT = ["M7 4v16", "M3 8l4-4 4 4", "M17 20V4", "M13 16l4 4 4-4"];

export default function HistoryView() {
  const { status, loaded } = usePayments();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [newestFirst, setNewestFirst] = useState(true);

  const all = useMemo(() => (status ? realRows(status.payments) : []), [status]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = all.filter((r) => (type === "all" || r.t === type) && (!t || `${r.what} ${r.charity} ${r.by}`.toLowerCase().includes(t)));
    return newestFirst ? f : [...f].reverse();
  }, [all, q, type, newestFirst]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * PER;
  const rows = filtered.slice(start, start + PER);

  function exportCsv() {
    const head = ["Date", "Activity", "Charity", "By", "Amount", "Status"];
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [head, ...filtered.map((r) => [r.date, r.what, r.charity, r.by, r.amount, r.status])].map((l) => l.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "givewise-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>History &amp; receipts</h1>
          <p>Every payment GiveWise sent through PayPal, with its PayPal order ID.</p>
        </div>
        {all.length > 0 && (
          <div className="actions">
            <button className="btn" onClick={exportCsv}><Ic d={I.download} />Export CSV</button>
          </div>
        )}
      </div>

      {!loaded ? (
        <section className="card"><p style={{ margin: 0, padding: 24, color: "var(--muted)" }}>Loading your history…</p></section>
      ) : all.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={I.file}
            title="No history yet"
            body="Every payment will be listed here with its PayPal order ID. Nothing is ever paid without your approval."
            action={<NextStep />}
          />
        </section>
      ) : (
        <section className="card" aria-labelledby="h-h">
          <div className="card-h">
            <h2 id="h-h">Activity</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
              <label className="search">
                <Ic d={I.search} />
                <span className="sr-only">Search history</span>
                <input type="search" placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              </label>
              <label className="btn" style={{ padding: "0 4px 0 10px", gap: 6 }}>
                <Ic d={FILTER} />
                <span className="sr-only">Filter by type</span>
                <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} style={{ font: "inherit", fontSize: 13, border: 0, outline: 0, backgroundColor: "transparent", color: "var(--text)", minHeight: 34 }}>
                  <option value="all">All activity</option>
                  <option value="pay">Payments</option>
                </select>
              </label>
              <button className="btn hide-m" onClick={() => setNewestFirst(!newestFirst)}><Ic d={SORT} />{newestFirst ? "Newest first" : "Oldest first"}</button>
            </div>
          </div>

          <div className="tbl-wrap">
            <table className="tbl" style={{ minWidth: 760 }}>
              <thead><tr><th style={{ width: 52 }}>No</th><th>Date</th><th>Activity</th><th>Charity</th><th>By</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th><th>PayPal order</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={start + i}>
                    <td className="num" style={{ color: "var(--muted)" }}>{start + i + 1}</td>
                    <td className="num" style={{ color: "var(--text2)" }}>{r.date}</td>
                    <td style={{ fontWeight: 500, whiteSpace: "normal", minWidth: 200 }}>{r.what}</td>
                    <td style={{ color: "var(--text2)", whiteSpace: "normal", minWidth: 120 }}>{r.charity}</td>
                    <td style={{ color: "var(--text2)" }}>{r.by}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>{r.amount}</td>
                    <td><span className={`chip ${r.chip}`}><i />{r.status}</span></td>
                    <td>{r.ref ? <span className="num" style={{ fontSize: 12, color: "var(--text2)" }}>{r.ref}</span> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mlist">
            {rows.map((r, i) => (
              <div key={start + i}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontWeight: 500 }}>{r.what}</span><span className="num" style={{ fontWeight: 600 }}>{r.amount}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{r.date} · {r.charity}</span><span className={`chip ${r.chip}`}><i />{r.status}</span></div>
                {r.ref && <span className="num" style={{ fontSize: 12, color: "var(--muted)" }}>PayPal order {r.ref}</span>}
              </div>
            ))}
          </div>
          {!filtered.length && <EmptyState compact icon={I.search} title="Nothing matches your search" body="Try another word, or switch the filter back to All activity." />}

          <div className="foot">
            <span className="num">{filtered.length ? `Showing ${start + 1} to ${start + rows.length} of ${filtered.length} results` : "No results"}</span>
            {pages > 1 && (
              <div className="pager" role="navigation" aria-label="Pages">
                <button onClick={() => setPage(Math.max(1, cur - 1))} aria-label="Previous page"><Ic d={I.chevronLeft} /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button key={n} className={n === cur ? "on" : ""} aria-current={n === cur ? "page" : undefined} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button onClick={() => setPage(Math.min(pages, cur + 1))} aria-label="Next page"><Ic d={I.chevronRight} /></button>
              </div>
            )}
          </div>
        </section>
      )}

      <p style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--muted)" }}>
        Receipts come from PayPal sandbox for now. Whether a gift can be claimed against tax depends on your country and the charity’s registration.
      </p>
    </main>
  );
}

/** Where to go when there's no history yet. Setup is only offered to donors who haven't done it. */
function NextStep() {
  const onboarded = useOnboarded();
  const { status } = usePayments();
  if (onboarded === null) return null;
  if (!onboarded) return <Link className="btn btn-primary btn-sm" href="/onboarding">Set up with Pip</Link>;
  if (status?.planSaved) return <Link className="btn btn-primary btn-sm" href="/plan">Go to My plan</Link>;
  return <Link className="btn btn-primary btn-sm" href="/discover">Find charities with Pip</Link>;
}
