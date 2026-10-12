"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { I, Ic } from "@/components/app/icons";

type Payment = { id: string; charityName: string; amountCents: number; kind: string; status: string; orderId: string | null; error: string | null; createdAt: string };
type Status = {
  connected: boolean;
  paypalEmail: string | null;
  env: "sandbox" | "live";
  hardLimitCents: number;
  givenThisMonthCents: number;
  planSaved: boolean;
  plan: { charityId: string; charityName: string; amountCents: number }[];
  payments: Payment[];
};
type RunResult = { charityName: string; amountCents: number; status: string; orderId?: string | null; reason?: string };

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const STATUS_CHIP: Record<string, string> = { COMPLETED: "ok", FAILED: "conf-n", BLOCKED: "conf-n", PENDING: "rev", SKIPPED: "rev" };
const STATUS_TEXT: Record<string, string> = { COMPLETED: "Sent", FAILED: "Failed", BLOCKED: "Stopped by your limit", PENDING: "Pending", SKIPPED: "Skipped" };

/** Real PayPal connection + "run payment day now" (sandbox). Everything here calls the server; the server enforces the limit. */
export default function PaymentPanel() {
  const params = useSearchParams();
  const [s, setS] = useState<Status | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [busy, setBusy] = useState<"" | "connect" | "run">("");
  const [error, setError] = useState(params.get("paypal") === "error" ? params.get("msg") ?? "PayPal couldn’t be connected." : "");
  const [results, setResults] = useState<RunResult[] | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/payments/status", { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401) return setLoggedOut(true);
    if (r.ok) setS(await r.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function connect() {
    setError("");
    setBusy("connect");
    const r = await fetch("/api/paypal/vault/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: "plan" }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.ok && d?.url) {
      window.location.href = d.url;
      return;
    }
    setError(d?.error || "PayPal couldn’t be reached. Please try again.");
    setBusy("");
  }

  async function run() {
    setError("");
    setResults(null);
    setBusy("run");
    const r = await fetch("/api/payments/run", { method: "POST" }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.ok) setResults(d.results);
    else setError(d?.error || "Payment day couldn’t run. Nothing was sent.");
    setBusy("");
    load();
  }

  if (loggedOut) {
    return (
      <section className="card" aria-labelledby="pay-h">
        <div className="card-h"><h2 id="pay-h">PayPal</h2><span className="meta">Log in to connect</span></div>
        <div className="card-b"><p style={{ margin: 0 }}>Log in to connect PayPal and run payments.</p></div>
      </section>
    );
  }
  if (!s) return null;

  const planTotal = s.plan.reduce((t, i) => t + i.amountCents, 0);
  const over = planTotal > s.hardLimitCents;

  return (
    <section className="card" aria-labelledby="pay-h">
      <div className="card-h">
        <h2 id="pay-h">PayPal &amp; payment day</h2>
        <span className="meta">{s.env === "sandbox" ? "Sandbox · no real money" : "Live"}</span>
      </div>
      <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <p className="form-err" role="alert" style={{ margin: 0 }}>{error}</p>}

        {!s.connected ? (
          <>
            <p style={{ margin: 0 }}>
              Connect your PayPal so payments can go from you straight to each charity. Connecting charges nothing, and you approve it on PayPal’s own page.
            </p>
            <div>
              <button className="btn btn-pp" onClick={connect} disabled={busy !== ""} aria-busy={busy === "connect"}>
                {busy === "connect" ? "Opening PayPal…" : "Connect PayPal"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              <span className="chip ok"><Ic d={I.check} style={{ width: 12, height: 12 }} />Connected</span>{" "}
              {s.paypalEmail ? <>as <b>{s.paypalEmail}</b>. </> : null}
              Given this month: <b className="num">{usd(s.givenThisMonthCents)}</b> of your <b className="num">{usd(s.hardLimitCents)}</b> limit.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btn-primary" onClick={run} disabled={busy !== "" || over} aria-busy={busy === "run"}>
                {busy === "run" ? "Sending…" : `Run payment day now (${usd(planTotal)})`}
              </button>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {s.planSaved ? "Uses your approved plan." : "Uses the sample plan until you approve your own."} Stops at your limit.
              </span>
            </div>
            {over && <p className="form-err" role="alert" style={{ margin: 0 }}>Your plan is over your limit, so nothing can be sent.</p>}
          </>
        )}

        {results && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }} aria-live="polite">
            {results.map((r, i) => (
              <li key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
                <span className={`chip ${STATUS_CHIP[r.status] ?? "rev"}`}>{STATUS_TEXT[r.status] ?? r.status}</span>
                <b>{r.charityName}</b>
                <span className="num">{usd(r.amountCents)}</span>
                {r.orderId && <span style={{ color: "var(--muted)" }}>Order {r.orderId}</span>}
                {r.reason && <span style={{ color: "var(--muted)" }}>{r.reason}</span>}
              </li>
            ))}
          </ul>
        )}

        {s.payments.length > 0 && (
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 500 }}>Recent payments ({s.payments.length})</summary>
            <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              {s.payments.map((p) => (
                <li key={p.id} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={`chip ${STATUS_CHIP[p.status] ?? "rev"}`}>{STATUS_TEXT[p.status] ?? p.status}</span>
                  <span>{p.charityName}</span>
                  <span className="num">{usd(p.amountCents)}</span>
                  <span style={{ color: "var(--muted)" }}>{new Date(p.createdAt).toLocaleDateString()}{p.orderId ? ` · ${p.orderId}` : ""}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
