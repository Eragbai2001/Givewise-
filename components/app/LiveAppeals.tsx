"use client";

import Link from "next/link";
import { useState } from "react";
import Pip from "@/components/Pip";
import { I, Ic } from "@/components/app/icons";
import { KIND_LABEL, toCharity } from "@/components/app/LiveSearch";
import type { FoundCharity, SearchResult } from "@/lib/pip-search";
import { paymentsChanged, usePayments } from "@/lib/use-payments";

const AMOUNTS = [5, 10, 25];
const usd = (c: number) => `$${Number.isInteger(c / 100) ? c / 100 : (c / 100).toFixed(2)}`;

type Outcome = { status: string; reason?: string; orderId?: string | null };

/**
 * Pip's live urgent appeals.
 * Pip researches the web for charities with a current appeal, with sources.
 * The donor picks an amount and sends one gift through PayPal. The server checks the limits first.
 */
export default function LiveAppeals() {
  const { status } = usePayments();
  const [q, setQ] = useState("urgent appeals for clean water, girls’ education or health in Nigeria");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState("");
  const [done, setDone] = useState<Record<string, Outcome>>({});
  const [hidden, setHidden] = useState<string[]>([]);

  // Room left this month: the smaller of the one-off limit and what's left under the monthly limit.
  const room = status ? Math.max(0, Math.min(status.oneOffLimitCents, status.hardLimitCents - status.givenThisMonthCents)) : 0;

  async function find() {
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/pip/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: `Charities with an active, current urgent appeal or emergency fundraising need: ${q.trim()}` }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setError(d.error || "Pip couldn’t finish that search. Please try again.");
      else setRes(d as SearchResult);
    } catch {
      setError("Pip couldn’t be reached. Please try again.");
    }
    setBusy(false);
  }

  async function give(f: FoundCharity, cents: number) {
    const c = toCharity(f);
    setSending(c.id);
    setConfirm("");
    try {
      const r = await fetch("/api/payments/give", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ charityId: c.id, charityName: f.name, amountCents: cents }),
      });
      const d = await r.json().catch(() => ({}));
      setDone((x) => ({ ...x, [c.id]: r.ok ? (d.result as Outcome) : { status: "ERROR", reason: d.error || "That gift couldn’t be sent. Nothing was charged." } }));
    } catch {
      setDone((x) => ({ ...x, [c.id]: { status: "ERROR", reason: "GiveWise couldn’t be reached. Nothing was charged." } }));
    }
    setSending("");
    paymentsChanged();
  }

  // Only appeals with a real, sourced current need. "Couldn't verify" ones are left out: Pip won't ask you to give to those.
  const appeals = (res?.results ?? []).filter(
    (f) => f.confidence !== "none" && f.need && !/^no current appeal/i.test(f.need) && !hidden.includes(toCharity(f).id),
  );

  return (
    <section className="card" aria-labelledby="la-h" aria-busy={busy}>
      <div className="card-h">
        <h2 id="la-h">Urgent appeals Pip found today</h2>
        <span className="meta">Live web research · every claim has a link</span>
      </div>
      <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <Pip mood={busy ? "researching" : "idle"} size={48} motion={false} decorative />
          <div className="bubble" style={{ flex: 1 }}>
            Tell me what you care about. I’ll look for charities with an appeal open right now, show you my sources, and you decide if you want to give extra once. Your monthly plan won’t change.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label className="search" style={{ flex: "1 1 260px" }}>
            <Ic d={I.search} />
            <span className="sr-only">What kind of appeal</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim().length > 2 && !busy && find()} />
          </label>
          <button className="btn btn-primary" onClick={find} disabled={busy || q.trim().length < 3}>
            {busy ? "Pip is searching…" : res ? "Search again" : "Find appeals"}
          </button>
        </div>
        {busy && <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Pip is reading news, registries and charity pages. This can take up to a minute.</p>}
        {error && <p className="form-err" role="alert" style={{ margin: 0 }}>{error}</p>}

        {res && !busy && (
          <>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              Searched {new Date(res.searchedAt).toLocaleString()}
              {res.cached ? " · saved result from the last few hours" : ""}. Charities Pip couldn’t verify are left out.
            </p>
            {appeals.length === 0 && <p style={{ margin: 0 }}>I couldn’t find an open appeal I can back with sources. Try other words or a wider place.</p>}
          </>
        )}

        {appeals.map((f) => {
          const c = toCharity(f);
          const out = done[c.id];
          const amt = amount[c.id] ?? AMOUNTS.find((a) => a * 100 <= room) ?? AMOUNTS[0];
          const cents = amt * 100;
          const fits = cents <= room;
          return (
            <article key={c.id} className="ccard" aria-label={f.name} style={{ gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span className="ttag urg">Urgent appeal</span>
                {f.confidence === "verified" ? (
                  <span className="chip ok"><Ic d={I.check} style={{ width: 12, height: 12 }} />Verified</span>
                ) : (
                  <span className="chip rev"><i />Partly verified</span>
                )}
                {f.cause && <span className="chip neutral">{f.cause}</span>}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{f.name}</h3>
                <span className="loc">{f.place}</span>
              </div>
              <div className="outcome" style={{ alignItems: "flex-start" }}>
                <span><b>Right now:</b> {f.need}</span>
              </div>
              {f.what && <p style={{ margin: 0, color: "var(--text2)" }}>{f.what}</p>}
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>{f.confidenceReason}</p>
              {f.redFlags.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--red-ink)" }}>
                  {f.redFlags.map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}
              <ul className="ev">
                {f.proofs.map((p) => (
                  <li key={p.url}>
                    {p.note && <span>{p.note}</span>}
                    <div className="row">
                      <span className="chip neutral">{KIND_LABEL[p.kind] ?? "Source"}</span>
                      <a className="src" href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
                      <span className="date">{p.domain}</span>
                    </div>
                  </li>
                ))}
              </ul>

              {out ? (
                <div className="outcome" role="status" style={{ alignItems: "flex-start" }}>
                  {out.status === "COMPLETED" ? (
                    <span><b>Sent {usd(cents)} once.</b> PayPal order {out.orderId}. Your monthly plan hasn’t changed. It’s in History &amp; receipts.</span>
                  ) : out.status === "BLOCKED" ? (
                    <span><b>Stopped by your limit.</b> {out.reason} Nothing was charged.</span>
                  ) : (
                    <span><b>Not sent.</b> {out.reason}</span>
                  )}
                </div>
              ) : !status ? null : !status.connected ? (
                <p style={{ margin: 0, fontSize: 13 }}>
                  <Link href="/plan">Connect PayPal on My plan</Link> to give to an appeal.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="amtpick" role="radiogroup" aria-label={`Gift amount for ${f.name}`}>
                    {AMOUNTS.map((a) => (
                      <button key={a} className={amt === a ? "on" : ""} role="radio" aria-checked={amt === a} onClick={() => setAmount((x) => ({ ...x, [c.id]: a }))}>${a}</button>
                    ))}
                  </div>
                  <span className="extra-note" style={{ fontSize: 12, color: fits ? "var(--muted)" : "var(--red-ink)" }}>
                    <Ic d={I.shield} />
                    {fits
                      ? `You have ${usd(room)} left for one-off gifts this month. Your limit is checked again on the server before anything is sent.`
                      : `That’s more than the ${usd(room)} you have left this month, so the server will stop it.`}
                  </span>
                  {status.env === "sandbox" && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      Sandbox test: the money goes to GiveWise’s test charity account, not to {f.name}. No real money moves.
                    </span>
                  )}
                  {confirm === c.id ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 13 }}>Send {usd(cents)} once to {f.name} from your PayPal?</span>
                      <button className="btn btn-primary" onClick={() => give(f, cents)} disabled={sending !== ""}>Yes, send it</button>
                      <button className="btn" onClick={() => setConfirm("")}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-primary" onClick={() => setConfirm(c.id)} disabled={sending !== ""} aria-busy={sending === c.id}>
                        {sending === c.id ? "Sending…" : `Give ${usd(cents)} once`}
                      </button>
                      <button className="btn" onClick={() => setHidden((h) => [...h, c.id])}>Not now</button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
