"use client";

import { useCallback, useEffect, useState } from "react";

export type RealPayment = { id: string; charityName: string; amountCents: number; kind: string; status: string; orderId: string | null; error: string | null; createdAt: string };
export type RealStatus = {
  connected: boolean;
  paypalEmail: string | null;
  env: "sandbox" | "live";
  hardLimitCents: number;
  oneOffLimitCents: number;
  givenThisMonthCents: number;
  planSaved: boolean;
  plan: { charityId: string; charityName: string; amountCents: number }[];
  payments: RealPayment[];
};

/** The signed-in donor's real plan and payments. `status` is null when logged out or still loading. */
export function usePayments() {
  const [status, setStatus] = useState<RealStatus | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/payments/status", { cache: "no-store" });
      setStatus(r.ok ? ((await r.json()) as RealStatus) : null);
    } catch {
      setStatus(null);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { status, loaded, reload };
}
