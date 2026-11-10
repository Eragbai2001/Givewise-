"use client";

/**
 * Connect PayPal in a new tab, so the GiveWise page (with the sandbox test login) stays open.
 * When PayPal is done, the new tab lands on /paypal/done, which tells this tab the result and closes itself.
 * If the browser blocks the new tab, we fall back to the old same-tab redirect.
 */

export type PaypalResult = { paypal: string; msg?: string };
const CHANNEL = "gw-paypal";
const KEY = "gw-paypal-result";

export type ConnectOutcome = { status: "opened" | "redirected" | "error"; code?: number; error?: string };

export async function connectPaypal(to: "onboarding" | "plan"): Promise<ConnectOutcome> {
  // Open the tab right away, inside the click, or popup blockers stop it.
  const w = window.open("", "_blank");
  if (w) {
    try {
      w.opener = null;
      w.document.title = "Opening PayPal…";
      w.document.body.innerHTML = '<p style="font:16px system-ui,sans-serif;padding:24px;color:#555">Opening PayPal…</p>';
    } catch {}
  }
  try {
    const res = await fetch("/api/paypal/vault/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, newTab: !!w }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.url) {
      w?.close();
      return { status: "error", code: res.status, error: d.error };
    }
    if (w) {
      w.location.href = d.url;
      return { status: "opened" };
    }
    window.location.href = d.url;
    return { status: "redirected" };
  } catch {
    w?.close();
    return { status: "error" };
  }
}

/** Called by /paypal/done in the PayPal tab. */
export function sendPaypalResult(r: PaypalResult) {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(r);
    ch.close();
  } catch {}
  // Fallback for browsers without BroadcastChannel: a storage event reaches other tabs.
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...r, t: Date.now() }));
  } catch {}
}

/** Listen in the GiveWise tab. Returns a cleanup function. */
export function onPaypalResult(cb: (r: PaypalResult) => void): () => void {
  let last = "";
  const handle = (r: unknown) => {
    if (!r || typeof (r as PaypalResult).paypal !== "string") return;
    const k = JSON.stringify(r);
    if (k === last) return;
    last = k;
    cb(r as PaypalResult);
  };
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => handle(e.data);
  } catch {}
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const { paypal, msg } = JSON.parse(e.newValue);
      handle({ paypal, msg });
    } catch {}
  };
  window.addEventListener("storage", onStorage);
  return () => {
    ch?.close();
    window.removeEventListener("storage", onStorage);
  };
}
