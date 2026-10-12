"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { resetOnboarded } from "./onboarding";

/**
 * Which data the app pretends to have, so every screen can be checked in its
 * real-world states before the backend exists.
 *  - "full":  plan approved, payments made (the normal case)
 *  - "new":   plan approved and PayPal connected, but no payment has gone out yet
 *  - "empty": brand-new account — no plan, no charities, PayPal not connected
 * Set with ?state=full|new|empty, or the switcher in the corner (dev only).
 */
export type DemoState = "full" | "new" | "empty";
const KEY = "gw-demo-state";
const VALID: DemoState[] = ["full", "new", "empty"];

const Ctx = createContext<{ state: DemoState; setState: (s: DemoState) => void }>({ state: "full", setState: () => {} });

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<DemoState>("full");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("state") as DemoState | null;
    let saved: DemoState | null = null;
    try {
      saved = localStorage.getItem(KEY) as DemoState | null;
    } catch {}
    const pick = fromUrl && VALID.includes(fromUrl) ? fromUrl : saved && VALID.includes(saved) ? saved : "full";
    setStateRaw(pick);
  }, []);

  const setState = (s: DemoState) => {
    setStateRaw(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {}
  };

  return <Ctx.Provider value={{ state, setState }}>{children}</Ctx.Provider>;
}

export const useDemoState = () => useContext(Ctx);

/** Small floating switcher, shown only while developing. */
export function DemoStateSwitcher() {
  const { state, setState } = useDemoState();
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <div className="demo-switch" role="radiogroup" aria-label="Preview data state">
      <span>Data</span>
      {VALID.map((s) => (
        <button key={s} role="radio" aria-checked={state === s} className={state === s ? "on" : ""} onClick={() => setState(s)}>
          {s === "full" ? "Full" : s === "new" ? "New plan" : "Empty"}
        </button>
      ))}
      <button
        title="Make the next log in behave like a first-time user"
        onClick={() => {
          resetOnboarded();
          window.location.href = "/login";
        }}
      >
        Reset first login
      </button>
    </div>
  );
}
