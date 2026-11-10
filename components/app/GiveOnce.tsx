"use client";

import Link from "next/link";
import { useState } from "react";
import { I, Ic } from "@/components/app/icons";
import { toCharity } from "@/components/app/LiveSearch";
import type { FoundCharity } from "@/lib/pip-search";
import { paymentsChanged, usePayments } from "@/lib/use-payments";

const AMOUNTS = [5, 10, 25];
const usd = (c: number) => `$${Number.isInteger(c / 100) ? c / 100 : (c / 100).toFixed(2)}`;

type Outcome = { status: string; reason?: string; orderId?: string | null };

/**
 * One-click "Give $X once" through the donor's connected PayPal, after a confirm.
 * Used for urgent appeals and people in need. The server checks the limits before anything is sent.
 */
export default function GiveOnce({ f, onHide }: { f: FoundCharity; onHide?: () => void }) {
  const { status } = usePayments();
  const c = toCharity(f);
  const [amt, setAmt] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [out, setOut] = useState<Outcome | null>(null);

  if (!status) return null;
  // Pip won't ask you to give to something it couldn't verify at all.
  if (f.confidence === "none") {
    return <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Pip couldn’t verify this, so it can’t be paid through GiveWise.</p>;
  }
  if (!status.connected) {
    return (
      <p style={{ margin: 0, fontSize: 13 }}>
        <Link href="/plan">Connect PayPal on My plan</Link> to give once.
      </p>
    );
  }

  // Room left this month: the smaller of the one-off limit and what's left under the monthly limit.
  const room = Math.max(0, Math.min(status.oneOffLimitCents, status.hardLimitCents - status.givenThisMonthCents));
  const pick = amt ?? AMOUNTS.find((a) => a * 100 <= room) ?? AMOUNTS[0];
  const cents = pick * 100;
  const fits = cents <= room;
  const who = f.type === "person" ? "this person" : f.name;

  async function give() {
    setSending(true);
    setConfirm(false);
    try {
      const r = await fetch("/api/payments/give", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ charityId: c.id, charityName: f.name, amountCents: cents }),
      });
      const d = await r.json().catch(() => ({}));
      setOut(r.ok ? (d.result as Outcome) : { status: "ERROR", reason: d.error || "That gift couldn’t be sent. Nothing was charged." });
    } catch {
      setOut({ status: "ERROR", reason: "GiveWise couldn’t be reached. Nothing was charged." });
    }
    setSending(false);
    paymentsChanged();
  }

  if (out) {
    return (
      <div className="outcome" role="status" style={{ alignItems: "flex-start" }}>
        {out.status === "COMPLETED" ? (
          <span><b>Sent {usd(cents)} once.</b> PayPal order {out.orderId}. Your monthly plan hasn’t changed. It’s in History &amp; receipts.</span>
        ) : out.status === "BLOCKED" ? (
          <span><b>Stopped by your limit.</b> {out.reason} Nothing was charged.</span>
        ) : (
          <span><b>Not sent.</b> {out.reason}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="amtpick" role="radiogroup" aria-label={`Gift amount for ${f.name}`}>
        {AMOUNTS.map((a) => (
          <button key={a} className={pick === a ? "on" : ""} role="radio" aria-checked={pick === a} onClick={() => setAmt(a)}>${a}</button>
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
          Sandbox test: the money goes to GiveWise’s test account, not to {who}. No real money moves.
        </span>
      )}
      {confirm ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>Send {usd(cents)} once to {who} from your PayPal?</span>
          <button className="btn btn-primary" onClick={give} disabled={sending}>Yes, send it</button>
          <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => setConfirm(true)} disabled={sending} aria-busy={sending}>
            {sending ? "Sending…" : `Give ${usd(cents)} once`}
          </button>
          {onHide && <button className="btn" onClick={onHide}>Not now</button>}
        </div>
      )}
    </div>
  );
}
