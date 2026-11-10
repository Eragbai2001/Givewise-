"use client";

import { useCallback, useEffect, useState } from "react";
import type { FoundCharity } from "@/lib/pip-search";

export type RealPayment = { id: string; charityName: string; amountCents: number; kind: string; status: string; orderId: string | null; error: string | null; createdAt: string };
export type RealStatus = {
  connected: boolean;
  paypalEmail: string | null;
  env: "sandbox" | "live";
  hardLimitCents: number;
  oneOffLimitCents: number;
  givenThisMonthCents: number;
  planSaved: boolean;
  paidCharityIds: string[];
  // details = what Pip found (sources, confidence). null for charities saved before Pip kept them.
  plan: { charityId: string; charityName: string; amountCents: number; details: (FoundCharity & { checkedAt: string }) | null }[];
  payments: RealPayment[];
};

export const PAYMENTS_CHANGED = "gw-payments";

// One shared request for every part of the screen (sidebar, page, PayPal card), instead of one each.
type Fetched = { code: number; data: RealStatus | null };
let inflight: Promise<Fetched> | null = null;
let last: (Fetched & { at: number }) | null = null;

/** Get the donor's status. Callers within 2 seconds of each other share one request. */
export function fetchStatus(): Promise<Fetched> {
  if (last && Date.now() - last.at < 2000) return Promise.resolve(last);
  inflight ??= fetch("/api/payments/status", { cache: "no-store" })
    .then(async (r) => ({ code: r.status, data: r.ok ? ((await r.json()) as RealStatus) : null }))
    .catch(() => ({ code: 0, data: null }))
    .then((f) => {
      last = { ...f, at: Date.now() };
      inflight = null;
      return f;
    });
  return inflight;
}

/** Tell every screen that payments, the plan or the limits changed. */
export const paymentsChanged = () => {
  last = null;
  inflight = null;
  window.dispatchEvent(new Event(PAYMENTS_CHANGED));
};

/** The signed-in donor's real plan and payments. `status` is null when logged out or still loading. */
export function usePayments() {
  // Moving between pages shows the last known status straight away, then refreshes it.
  const [status, setStatus] = useState<RealStatus | null>(() => last?.data ?? null);
  const [loaded, setLoaded] = useState(() => Boolean(last));

  const reload = useCallback(async () => {
    const f = await fetchStatus();
    setStatus(f.data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
    // Any screen that sends money fires this, so the limit card and tables stay in step.
    window.addEventListener(PAYMENTS_CHANGED, reload);
    return () => window.removeEventListener(PAYMENTS_CHANGED, reload);
  }, [reload]);

  return { status, loaded, reload };
}
