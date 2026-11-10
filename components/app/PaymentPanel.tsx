"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { I, Ic } from "@/components/app/icons";
import TestLoginNote, { type TestLogin } from "@/components/TestLoginNote";
import { paymentsChanged } from "@/lib/use-payments";
import { connectPaypal, onPaypalResult } from "@/lib/paypal-connect";

type Payment = { id: string; charityName: string; amountCents: number; kind: string; status: string; orderId: string | null; error: string | null; createdAt: string };
type Status = {
  connected: boolean;
  paypalEmail: string | null;
  env: "sandbox" | "live";
  testLogin: TestLogin | null;
  hardLimitCents: number;
  givenThisMonthCents: number;
  planSaved: boolean;
  paidCharityIds: string[];
  plan: { charityId: string; charityName: string; amountCents: number }[];
  payments: Payment[];
};
type RunResult = { charityName: string; amountCents: number; status: string; orderId?: string | null; reason?: string };

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const STATUS_TEXT: Record<string, string> = { COMPLETED: "Sent", FAILED: "Failed", BLOCKED: "Stopped by your limit", PENDING: "Pending", SKIPPED: "Skipped" };

/** Real PayPal connection + "run payment day now" (sandbox). Everything here calls the server; the server enforces the limit. */
export default function PaymentPanel({ onChanged }: { onChanged?: () => void }) {
  const params = useSearchParams();
  const [s, setS] = useState<Status | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [busy, setBusy] = useState<"" | "connect" | "run">("");
  const [error, setError] = useState(params.get("paypal") === "error" ? params.get("msg") ?? "PayPal couldn’t be connected." : "");
  const [results, setResults] = useState<RunResult[] | null>(null);
  // PayPal is open in another tab.
  const [waiting, setWaiting] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/payments/status", { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 401) return setLoggedOut(true);
    if (r.ok) setS(await r.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // The PayPal tab tells us when it's done.
  useEffect(
    () =>
      onPaypalResult((r) => {
        setWaiting(false);
        if (r.paypal === "connected") setError("");
        else setError(r.paypal === "cancelled" ? "You cancelled at PayPal, so nothing was connected." : r.msg || "PayPal couldn’t be connected.");
        load().then(() => paymentsChanged());
        onChanged?.();
      }),
    [load, onChanged],
  );

  async function connect() {
    setError("");
    setBusy("connect");
    const r = await connectPaypal("plan");
    if (r.status === "redirected") return;
    setBusy("");
    if (r.status === "opened") setWaiting(true);
    else setError(r.error || "PayPal couldn’t be reached. Please try again.");
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
    onChanged?.();
    paymentsChanged();
  }

  if (loggedOut) {
    return (
      <section className="card" aria-labelledby="paypal-h">
        <div className="card-h"><h2 id="paypal-h">PayPal</h2><span className="meta">Log in to connect</span></div>
        <div className="card-b"><p style={{ margin: 0 }}>Log in to connect PayPal and run payments.</p></div>
      </section>
    );
  }
  if (!s) return null;

  const planTotal = s.plan.reduce((t, i) => t + i.amountCents, 0);
  const over = planTotal > s.hardLimitCents;
  // Payment day pays each charity once a month. Once they're all paid, there's nothing left to run.
  const due = s.plan.filter((i) => !s.paidCharityIds.includes(i.charityId));
  const dueTotal = due.reduce((t, i) => t + i.amountCents, 0);
  const allPaid = s.plan.length > 0 && due.length === 0;
  // Only a saved plan of charities Pip found can be paid.
  const realPlan = s.planSaved && s.plan.every((i) => i.charityId.startsWith("live-"));
  // Money left under this month's limit. If the rest of the plan doesn't fit, it waits for next month.
  const noRoom = !allPaid && s.givenThisMonthCents > 0 && dueTotal > s.hardLimitCents - s.givenThisMonthCents;
  const now = new Date();
  const thisMonth = now.toLocaleDateString("en-GB", { month: "long" });
  const nextDay = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  return (
    <section className="card" aria-labelledby="paypal-h">
      <div className="card-h">
        <h2 id="paypal-h">PayPal &amp; payment day</h2>
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
                {busy === "connect" ? "Opening PayPal…" : waiting ? "Open PayPal again" : "Connect PayPal"}
              </button>
            </div>
            {waiting && (
              <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                PayPal is open in a new tab. Finish there and this card will update by itself.
              </p>
            )}
            <TestLoginNote login={s.testLogin} />
          </>
        ) : (
          <div className="paypanel">
            {/* Left: the account and this month's giving against the limit */}
            <div className="pp-left">
              <div className="pp-acct">
                <span className="chip ok"><Ic d={I.check} style={{ width: 12, height: 12 }} />Connected</span>
                {s.paypalEmail && <span className="pp-email" title={s.paypalEmail}>{s.paypalEmail}</span>}
              </div>
              <div className="pp-month">
                <div className="pp-month-top">
                  <span>Given in {thisMonth}</span>
                  <span className="num"><b>{usd(s.givenThisMonthCents)}</b> of {usd(s.hardLimitCents)}</span>
                </div>
                <div className="meter" role="img" aria-label={`${usd(s.givenThisMonthCents)} of ${usd(s.hardLimitCents)} limit given in ${thisMonth}`}>
                  <span style={{ width: `${Math.min(100, Math.round((s.givenThisMonthCents / s.hardLimitCents) * 100))}%` }} />
                </div>
              </div>
            </div>

            {/* Right: what happens next */}
            <div className="pp-right">
              {!realPlan ? (
                <>
                  <Link className="btn btn-primary" href="/discover">Find charities with Pip</Link>
                  <span className="pp-sub">Payment day starts once you approve a plan of charities Pip found. Nothing is paid until then.</span>
                </>
              ) : allPaid ? (
                <>
                  <span className="pp-status"><Ic d={I.check} />{thisMonth} is done</span>
                  <span className="pp-sub">Every charity in your plan is paid. Next payment day: <b>{nextDay}</b>.</span>
                </>
              ) : noRoom ? (
                <>
                  <span className="pp-status muted">Limit reached for {thisMonth}</span>
                  <span className="pp-sub">The rest of your plan ({usd(dueTotal)}) goes out on <b>{nextDay}</b>.</span>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={run} disabled={busy !== "" || over} aria-busy={busy === "run"}>
                    {busy === "run" ? "Sending…" : `Run payment day now · ${usd(dueTotal)}`}
                  </button>
                  <span className="pp-sub">
                    Your approved plan
                    {due.length < s.plan.length ? ` · ${s.plan.length - due.length} already paid` : ""} · stops at your limit
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {over && <p className="form-err" role="alert" style={{ margin: 0 }}>Your plan is over your limit, so nothing can be sent.</p>}

        {results && (() => {
          const sent = results.filter((r) => r.status === "COMPLETED");
          const notSent = results.filter((r) => r.status !== "COMPLETED" && r.status !== "SKIPPED");
          return (
            <div className="pp-result" role="status" aria-live="polite">
              {sent.length > 0 && (
                <span><b>Sent {usd(sent.reduce((t, r) => t + r.amountCents, 0))}</b> to {sent.length} {sent.length === 1 ? "charity" : "charities"} through PayPal.</span>
              )}
              {notSent.map((r, i) => (
                <span key={i} style={{ color: "var(--red-ink)" }}>{r.charityName}: {STATUS_TEXT[r.status] ?? r.status}. {r.reason}</span>
              ))}
              {sent.length === 0 && notSent.length === 0 && <span>Nothing to send. Everything is already paid this month.</span>}
            </div>
          );
        })()}

        {s.connected && s.payments.length > 0 && (
          <Link className="src" href="/history" style={{ alignSelf: "flex-start", fontSize: 13 }}>
            See every payment and receipt in History &amp; receipts
          </Link>
        )}
      </div>
    </section>
  );
}
