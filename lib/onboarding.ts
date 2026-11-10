// "Has this user finished Pip's setup?"
// Signed-in users: stored on their account (see /api/me).
// The localStorage flag stays as a fallback for browsing without an account.
import { useEffect, useState } from "react";

const KEY = "gw-onboarded";

/** null while loading. AppShell syncs the flag from the account before pages use it. */
export function useOnboarded(): boolean | null {
  const [v, setV] = useState<boolean | null>(null);
  useEffect(() => setV(isOnboarded()), []);
  return v;
}

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
  // Save to the account too; ignored if nobody is signed in.
  fetch("/api/me", { method: "POST" }).catch(() => {});
}

export function resetOnboarded() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Sync the local flag from the account so every screen agrees. */
export function setOnboardedLocal(v: boolean) {
  try {
    if (v) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {}
}
