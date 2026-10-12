"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export type Me = { id: string; name: string; email: string; image: string | null; onboarded: boolean };

export async function fetchMe(): Promise<{ user: Me | null; providers: { google: boolean; paypal: boolean } }> {
  try {
    const r = await fetch("/api/me", { cache: "no-store" });
    return await r.json();
  } catch {
    return { user: null, providers: { google: false, paypal: false } };
  }
}
