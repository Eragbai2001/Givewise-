"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sendPaypalResult } from "@/lib/paypal-connect";

/** Where the PayPal tab lands. Tells the GiveWise tab what happened, then closes. */
export default function PaypalDone() {
  const params = useSearchParams();
  const paypal = params.get("paypal") ?? "error";
  const msg = params.get("msg") ?? undefined;
  const to = params.get("to") === "plan" ? "plan" : "onboarding";
  const [stayed, setStayed] = useState(false);

  useEffect(() => {
    sendPaypalResult({ paypal, msg });
    window.close();
    // Some browsers won't close the tab. Then show a short note instead.
    const t = setTimeout(() => setStayed(true), 400);
    return () => clearTimeout(t);
  }, [paypal, msg]);

  const ok = paypal === "connected";
  const text = ok ? "PayPal is connected." : paypal === "cancelled" ? "You cancelled at PayPal, so nothing was connected." : msg || "PayPal couldn’t be connected.";
  const back = `/${to}?paypal=${encodeURIComponent(paypal)}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 380, textAlign: "center", display: "flex", flexDirection: "column", gap: 14, visibility: stayed ? "visible" : "hidden" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>{text}</h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>You can close this tab and carry on in your GiveWise tab.</p>
        <Link className="btn btn-primary" href={back}>
          Continue here instead
        </Link>
      </div>
    </main>
  );
}
