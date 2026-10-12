"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import EmptyState from "@/components/app/EmptyState";
import { I, Ic } from "@/components/app/icons";
import { useDemoState, type DemoState } from "@/lib/demo-state";

type Row = { t: "pay" | "you" | "pip"; date: string; what: string; charity: string; by: string; amount: string; status: string; chip: string; receipt?: boolean };

const pay = (date: string, charity: string, amount: string): Row => ({ t: "pay", date, what: "Monthly gift", charity, by: "PayPal sandbox", amount, status: "Paid", chip: "ok", receipt: true });

function buildRows(state: DemoState): Row[] {
  if (state === "empty") return [];
  if (state === "new")
    return [
      { t: "you", date: "9 Oct 2026", what: "Approved plan: 3 monthly gifts", charity: "3 charities", by: "You", amount: "$50/mo", status: "Approved", chip: "ok" },
      { t: "pip", date: "9 Oct 2026", what: "Recommended 3 charities", charity: "—", by: "Pip · suggestion", amount: "—", status: "Done", chip: "neutral" },
    ];
  const rows: Row[] = [
    { t: "pip", date: "6 Oct 2026", what: "Suggested moving $25/mo to Blue Horizon until March", charity: "ClearSpring", by: "Pip · suggestion", amount: "—", status: "Pending", chip: "rev" },
    { t: "pip", date: "2 Oct 2026", what: "Noticed the well project was fully funded", charity: "ClearSpring", by: "Pip", amount: "—", status: "Noted", chip: "neutral" },
  ];
  const extras: Record<string, Row[]> = {
    "1 Sep 2026": [{ t: "you", date: "3 Sep 2026", what: "Approved: pause $10 while registration is renewed", charity: "Roots Local Aid", by: "You", amount: "$0.00", status: "Approved", chip: "ok" }],
    "1 Aug 2026": [
      { t: "you", date: "14 Aug 2026", what: "Approved: new PayPal payee", charity: "Roots Local Aid", by: "You", amount: "$10/mo", status: "Approved", chip: "ok" },
      { t: "pip", date: "12 Aug 2026", what: "Suggested updating the payee", charity: "Roots Local Aid", by: "Pip · suggestion", amount: "—", status: "Resolved", chip: "neutral" },
    ],
  };
  for (const m of ["1 Oct 2026", "1 Sep 2026", "1 Aug 2026", "1 Jul 2026"]) {
    rows.push(...(extras[m] ?? []));
    rows.push(pay(m, "ClearSpring Water Initiative", "$25.00"), pay(m, "Bright Futures Scholarship Fund", "$15.00"), pay(m, "Roots Local Aid", "$10.00"));
  }
  rows.push(pay("10 Jun 2026", "ClearSpring Water Initiative", "$25.00"), pay("10 Jun 2026", "Bright Futures Scholarship Fund", "$15.00"), pay("10 Jun 2026", "Roots Local Aid", "$10.00"));
  rows.push({ t: "you", date: "10 Jun 2026", what: "Approved plan: 3 monthly gifts", charity: "3 charities", by: "You", amount: "$50/mo", status: "Approved", chip: "ok" });
  rows.push({ t: "pip", date: "10 Jun 2026", what: "Recommended 3 charities", charity: "—", by: "Pip · suggestion", amount: "—", status: "Done", chip: "neutral" });
  return rows;
}

const PER = 10;
const FILTER = ["M22 3H2l8 9.46V19l4 2v-8.54L22 3z"];
const SORT = ["M7 4v16", "M3 8l4-4 4 4", "M17 20V4", "M13 16l4 4 4-4"];
const STATEMENT = ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M12 18v-6", "M9 15l3 3 3-3"];

export default function HistoryView() {
  const { state } = useDemoState();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [newestFirst, setNewestFirst] = useState(true);

  const all = useMemo(() => buildRows(state), [state]);
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
          <p>Every payment, every approval and everything Pip did, with a receipt for each payment.</p>
        </div>
        {all.length > 0 && (
          <div className="actions">
            <button className="btn" onClick={exportCsv}><Ic d={I.download} />Export CSV</button>
            <button className="btn btn-primary" disabled={state !== "full"} title={state !== "full" ? "Available after your first payment" : undefined}><Ic d={STATEMENT} />2026 giving statement</button>
          </div>
        )}
      </div>

      {state === "empty" ? (
        <section className="card">
          <EmptyState
            icon={I.file}
            title="No history yet"
            body="Every payment, approval and suggestion will be listed here, with a PayPal receipt for each gift. Nothing is ever paid without your approval."
            action={<Link className="btn btn-primary btn-sm" href="/onboarding">Set up with Pip</Link>}
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
                  <option value="you">Your approvals</option>
                  <option value="pip">Pip’s actions</option>
                </select>
              </label>
              <button className="btn hide-m" onClick={() => setNewestFirst(!newestFirst)}><Ic d={SORT} />{newestFirst ? "Newest first" : "Oldest first"}</button>
            </div>
          </div>

          {state === "new" && (
            <div className="banner" role="status" style={{ margin: "14px 16px 0" }}>
              <span className="bdot" aria-hidden="true" style={{ background: "var(--accent)" }} />
              <p><b>No payments yet.</b><span className="hide-m"> Your first payment goes out on 1 Nov, and its receipt will appear here.</span></p>
            </div>
          )}

          <div className="tbl-wrap">
            <table className="tbl" style={{ minWidth: 760 }}>
              <thead><tr><th style={{ width: 52 }}>No</th><th>Date</th><th>Activity</th><th>Charity</th><th>By</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
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
                    <td>{r.receipt ? <a className="src" href="#" aria-label={`Download receipt for ${r.charity}, ${r.date}`}>PDF</a> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
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
                {r.receipt && <a className="src" href="#" style={{ alignSelf: "flex-start" }}>Download receipt</a>}
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
        Receipts come from PayPal sandbox for now. Whether a gift can be claimed against tax depends on your country and the charity’s registration. The statement says which gifts may qualify.
      </p>
    </main>
  );
}
