"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Pip from "../Pip";
import { PipLogo } from "../Pip";
import ThemeToggle from "../ThemeToggle";
import TestLoginNote, { type TestLogin } from "../TestLoginNote";
import { markOnboarded } from "@/lib/onboarding";
import { toCharity } from "@/components/app/LiveSearch";
import type { SearchResult } from "@/lib/pip-search";

const CAUSES = [
  { id: "water", label: "Clean water", p: ["M12 2.5C10.5 5 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-5.5-10-7-12.5z", "M9 15a3 3 0 0 0 3 3"] },
  { id: "girls", label: "Girls’ education", p: ["M22 10L12 5 2 10l10 5 10-5z", "M6 12v5c3 2 9 2 12 0v-5"] },
  { id: "hunger", label: "Hunger", p: ["M3 11h18a9 9 0 0 1-18 0z", "M12 7V3"] },
  { id: "health", label: "Health", p: ["M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z", "M9 11h6"] },
  { id: "local", label: "Local community", p: ["M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z", "M9 21v-7h6v7"] },
  { id: "animals", label: "Animals", p: ["M8 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M16 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M4.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M19.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M12 10c-3 0-5.5 4.5-5.5 7a2.5 2.5 0 0 0 3.5 2.3c1.3-.6 2.7-.6 4 0A2.5 2.5 0 0 0 17.5 17c0-2.5-2.5-7-5.5-7z"] },
  { id: "climate", label: "Climate", p: ["M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16z", "M4 21c4-4 7-6 10-8"] },
];

const WHERE = [
  { id: "mix", t: "A mix of global and local", d: "Most where it helps most, some near home", p: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M3 12h18"] },
  { id: "global", t: "Wherever it helps most", d: "Pip looks worldwide", p: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 3a14 14 0 0 1 0 18"] },
  { id: "local", t: "Close to home", d: "Lagos and nearby", p: ["M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z", "M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"] },
];

type SplitItem = { id: string; name: string; cents: number; color: string; why: string; conf: string; chip: string; src: string | null };
const COLORS = ["var(--s1)", "var(--s2)", "var(--s3)"];
const WHERE_WORDS: Record<string, string> = { mix: "in Nigeria and worldwide", global: "anywhere in the world", local: "in Lagos, Nigeria" };

/** Make the amounts add up to exactly the budget (any rounding goes to the first charity). */
function fitTo(items: SplitItem[], budget: number): SplitItem[] {
  const diff = budget * 100 - items.reduce((t, i) => t + i.cents, 0);
  if (items[0]) items[0] = { ...items[0], cents: items[0].cents + diff };
  return items;
}

/** Used only when Pip can't search (no API key, not logged in, or nothing found). Shown as sample data. */
function sampleSplit(budget: number): SplitItem[] {
  const base = [
    { id: "cs", name: "ClearSpring Water Initiative", share: 0.5, why: "Builds and repairs village wells. 2025 audit published.", conf: "Verified", chip: "ok" },
    { id: "bf", name: "Bright Futures Scholarship Fund", share: 0.3, why: "Pays school fees for girls. Reports each term.", conf: "Verified", chip: "ok" },
    { id: "rl", name: "Roots Local Aid", share: 0.2, why: "Local food and school-supply drives. Latest report is from 2024.", conf: "Partly verified", chip: "rev" },
  ];
  return fitTo(base.map((b, i) => ({ id: b.id, name: b.name, why: b.why, conf: b.conf, chip: b.chip, cents: Math.round(b.share * budget * 100), color: COLORS[i], src: null })), budget);
}

/** Pip's split from live research: up to 3 charities it could back with sources. Verified ones get twice the share. */
function liveSplit(res: SearchResult, budget: number): SplitItem[] {
  const picks = (res.results ?? [])
    .filter((f) => f.confidence !== "none")
    .sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === "verified" ? -1 : 1))
    .slice(0, 3);
  if (!picks.length) return [];
  const w = picks.map((f) => (f.confidence === "verified" ? 2 : 1));
  const W = w.reduce((a, b) => a + b, 0);
  const items = picks.map((f, i) => ({
    id: toCharity(f).id,
    name: f.name,
    cents: Math.floor((budget * w[i]) / W) * 100, // whole dollars per charity
    color: COLORS[i],
    why: f.what || f.need,
    conf: f.confidence === "verified" ? "Verified" : "Partly verified",
    chip: f.confidence === "verified" ? "ok" : "rev",
    src: f.proofs[0]?.url ?? f.website,
  }));
  return fitTo(items, budget);
}
const money = (cents: number) => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);

const TOTAL = 9;
// PayPal sandbox test accounts give up to $50 a month.
const MAX_BUDGET = 50;
const PRESETS = [10, 25, 50];
const CTA = ["Continue", "Continue", "Continue", "Continue", "Connect PayPal", "See my split", "Looks good, approve in PayPal", "", ""];
const NOTE = [
  "Nothing moves without your approval",
  "Nothing moves without your approval",
  "Nothing moves without your approval",
  "You can change your limit later in Settings",
  "Nothing moves without your approval",
  "Pip only suggests. You decide.",
  "You approve the final amounts in PayPal",
  "",
  "Nothing moves without your approval",
];

function Ico({ p, small = false }: { p: readonly string[]; small?: boolean }) {
  return (
    <svg className={small ? "ic ic-s" : "ic"} viewBox="0 0 24 24" aria-hidden="true">
      {p.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
const SHIELD = ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"];
const CHECK = ["M20 6L9 17l-5-5"];
const CROSS = ["M18 6L6 18", "M6 6l12 12"];
const LOCK = ["M7 11V7a5 5 0 0 1 10 0v4", "M5 11h14v11H5z"];
const ARROW_OUT = ["M7 17L17 7", "M8 7h9v9"];

export default function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const startAmount = Math.min(Number(params.get("amount")) || MAX_BUDGET, MAX_BUDGET);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("Ada");
  const [picked, setPicked] = useState<Record<string, boolean>>({ water: true, girls: true });
  const [where, setWhere] = useState("mix");
  const [budget, setBudget] = useState(PRESETS.includes(startAmount) ? startAmount : MAX_BUDGET);
  const [research, setResearch] = useState(0);
  const [custom, setCustom] = useState(false);
  const [words, setWords] = useState(""); // "Or tell Pip in your own words"
  // Pip's live research for the split. null = not finished yet.
  const [split, setSplit] = useState<SplitItem[] | null>(null);
  const [sample, setSample] = useState(false);
  const [searchNote, setSearchNote] = useState("");
  // Real PayPal connection (Vault). Nothing is charged by connecting.
  const [ppBusy, setPpBusy] = useState(false);
  const [ppError, setPpError] = useState("");
  const [ppEmail, setPpEmail] = useState<string | null>(null);
  const [testLogin, setTestLogin] = useState<TestLogin | null>(null);

  // Sandbox: fetch the fake PayPal login to show on the Connect PayPal step.
  useEffect(() => {
    if (step !== 4 || testLogin) return;
    fetch("/api/payments/status")
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => d?.testLogin && setTestLogin(d.testLogin))
      .catch(() => {});
  }, [step, testLogin]);

  // Coming back from PayPal: restore the answers, then continue after a good approval, or explain what happened.
  useEffect(() => {
    const r = params.get("paypal");
    if (!r) return;
    try {
      const a = JSON.parse(sessionStorage.getItem("gw-onboarding-answers") ?? "null");
      if (a) {
        if (typeof a.name === "string") setName(a.name);
        if (a.picked && typeof a.picked === "object") setPicked(a.picked);
        if (typeof a.where === "string") setWhere(a.where);
        if (typeof a.budget === "number" && a.budget > 0) setBudget(Math.min(a.budget, MAX_BUDGET));
        if (typeof a.words === "string") setWords(a.words);
      }
    } catch {}
    if (r === "connected") setStep(5);
    else {
      setStep(4);
      setPpError(r === "cancelled" ? "You cancelled at PayPal, so nothing was connected." : params.get("msg") || "PayPal couldn’t be connected.");
    }
    fetch("/api/payments/status")
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => d?.paypalEmail && setPpEmail(d.paypalEmail))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connecting PayPal leaves this page, so keep the donor's answers for when they come back.
  const ANSWERS = "gw-onboarding-answers";
  function saveAnswers() {
    try {
      sessionStorage.setItem(ANSWERS, JSON.stringify({ name, picked, where, budget, words }));
    } catch {}
  }

  async function connectPaypal() {
    saveAnswers();
    setPpError("");
    setPpBusy(true);
    try {
      const res = await fetch("/api/paypal/vault/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: "onboarding" }) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setPpError("Log in first, then connect PayPal.");
      } else if (!res.ok || !d.url) {
        setPpError(d.error || "PayPal couldn’t be reached. Please try again.");
      } else {
        window.location.href = d.url;
        return;
      }
    } catch {
      setPpError("PayPal couldn’t be reached. Please try again.");
    }
    setPpBusy(false);
  }

  async function approvePlan() {
    setPpError("");
    setPpBusy(true);
    const items = shown.filter((x) => x.cents > 0).map((x) => ({ charityId: x.id, charityName: x.name, amountCents: x.cents }));
    try {
      const res = await fetch("/api/payments/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // The budget picked in step 4 becomes the donor's hard limit.
        body: JSON.stringify({ items, hardLimitCents: budget * 100 }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPpError(d.error || "Couldn’t save your plan. Nothing was approved.");
        setPpBusy(false);
        return;
      }
    } catch {
      setPpError("Couldn’t save your plan. Nothing was approved.");
      setPpBusy(false);
      return;
    }
    setPpBusy(false);
    next();
  }

  // Step 6: Pip researches real charities for what the donor told it.
  // The checklist ticks along, but the last step only completes when the research is back.
  useEffect(() => {
    if (step !== 5) return;
    if (split) {
      setResearch(4);
      return;
    }
    setResearch(0);
    const id = setInterval(() => setResearch((r) => (r >= 3 ? r : r + 1)), 1400);
    let alive = true;
    const finish = (items: SplitItem[], isSample: boolean, note: string) => {
      if (!alive) return;
      clearInterval(id);
      setSplit(items);
      setSample(isSample);
      setSearchNote(note);
      setResearch(4);
    };
    const what = [...CAUSES.filter((c) => picked[c.id]).map((c) => c.label), words.trim()].filter(Boolean).join(", ") || "causes that help the most people";
    fetch("/api/pip/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: `Trustworthy charities for: ${what}, ${WHERE_WORDS[where] ?? ""}` }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => {
        const live = ok ? liveSplit(d as SearchResult, budget) : [];
        if (live.length) finish(live, false, (d as SearchResult).summary ?? "");
        else
          finish(
            sampleSplit(budget),
            true,
            ok ? "I couldn’t find charities I could back with sources for that, so here’s a sample split." : (d?.error as string) || "I couldn’t search the web just now, so here’s a sample split.",
          );
      })
      .catch(() => finish(sampleSplit(budget), true, "I couldn’t search the web just now, so here’s a sample split."));
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Changing causes, words, place or budget means Pip should look again.
  useEffect(() => {
    setSplit(null);
  }, [picked, words, where, budget]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Approving in PayPal (reaching the final step) completes onboarding.
    if (step === TOTAL - 1) markOnboarded();
  }, [step]);

  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const heard = [...CAUSES.filter((c) => picked[c.id]).map((c) => c.label.toLowerCase()), ...(words.trim() ? [words.trim().toLowerCase()] : [])];
  const shown = split ?? sampleSplit(budget);
  const display = name.trim() || "friend";

  return (
    <div className="mscreen setup">
      {/* web header */}
      <header className="setup-web">
        <Link className="logo" href="/">
          <PipLogo className="logo-mark" />
          <span>GiveWise</span>
        </Link>
        <span style={{ flex: 1 }} />
        <ThemeToggle />
        <Link href="/plan" className="skip" style={{ textDecoration: "none" }}>
          Finish later
        </Link>
      </header>
      {/* phone header */}
      <div className="setup-mob">
        <Link className="logo" href="/" style={{ fontSize: 15, gap: 8 }}>
          <PipLogo className="logo-mark" size={26} />
          <span>GiveWise</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="setup-top">
        {step > 0 && step < 8 && (
          <button className="iconbtn" onClick={back} aria-label="Back">
            <Ico small p={["M15 18l-6-6 6-6"]} />
          </button>
        )}
        <div className="prog-bar" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step + 1}>
          <span style={{ width: `${Math.round(((step + 1) / TOTAL) * 100)}%` }} />
        </div>
        <span className="setup-step num">
          {step + 1} of {TOTAL}
        </span>
      </div>

      <main className="setup-body" aria-live="polite">
        {step === 0 && (
          <>
            <div className="pip-say">
              <Pip mood="happy" size={76} />
              <div className="bubble tail-l">
                Hi! I’m <strong>Pip</strong>. I’ll help you give well, and I’ll always ask before anything changes.
              </div>
            </div>
            <h1 className="setup-q">What should I call you?</h1>
            <label className="bigfield">
              <span className="sr-only">Your first name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" autoFocus onKeyDown={(e) => e.key === "Enter" && next()} />
            </label>
            <p className="setup-hint" style={{ marginTop: 0 }}>
              Just your first name is fine.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <div className="pip-say">
              <Pip mood="listening" size={76} />
              <div className="bubble tail-l">Nice to meet you, {display}! I’m listening.</div>
            </div>
            <h1 className="setup-q">What do you care about?</h1>
            <p className="setup-hint">Pick as many as you like. You can change this later.</p>
            <div className="cause-grid">
              {CAUSES.map((c) => {
                const on = !!picked[c.id];
                return (
                  <button key={c.id} className={`cause ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setPicked({ ...picked, [c.id]: !on })}>
                    <span className="cic">
                      <Ico p={c.p} />
                    </span>
                    {c.label}
                    <span className="tick">
                      <Ico small p={CHECK} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="textask">
              <input
                type="text"
                placeholder="Or tell Pip in your own words… e.g. rescue dogs"
                aria-label="Tell Pip in your own words"
                value={words}
                maxLength={120}
                onChange={(e) => setWords(e.target.value)}
              />
            </div>
            <div className="heard" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 12, color: "var(--muted)" }}>
              <span>Pip heard:</span>
              {(heard.length ? heard : ["nothing yet"]).map((t) => (
                <span className="chip neutral" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="pip-say">
              <Pip mood="listening" size={76} />
              <div className="bubble tail-l">{heard.length ? `${heard.join(" and ")}. Got it.` : "Got it."}</div>
            </div>
            <h1 className="setup-q">Where should your money go?</h1>
            <div className="optlist" role="radiogroup" aria-label="Where to give">
              {WHERE.map((o) => (
                <button key={o.id} className={`opt ${where === o.id ? "on" : ""}`} role="radio" aria-checked={where === o.id} onClick={() => setWhere(o.id)}>
                  <span className="oic">
                    <Ico p={o.p} />
                  </span>
                  <span>
                    <strong>{o.t}</strong>
                    <span className="d">{o.d}</span>
                  </span>
                  <span className="radio" aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="pip-say">
              <Pip mood="happy" size={76} />
              <div className="bubble tail-l">Any amount helps. I’ll never go over what you set here.</div>
            </div>
            <h1 className="setup-q">How much a month feels right?</h1>
            <div className="amount num" aria-live="polite">
              ${budget}
              <small>/month</small>
            </div>
            <div className="presets">
              {PRESETS.map((v) => (
                <button key={v} className={budget === v ? "on" : ""} aria-pressed={budget === v} onClick={() => { setBudget(v); setCustom(false); }}>
                  ${v}
                </button>
              ))}
              {custom ? (
                <input
                  type="number"
                  min={1}
                  max={MAX_BUDGET}
                  autoFocus
                  aria-label="Other monthly amount in dollars"
                  className="num"
                  style={{ font: "inherit", fontSize: 14, fontWeight: 600, minHeight: 44, borderRadius: 11, border: "1px solid var(--accent)", background: "var(--surface)", color: "var(--text)", textAlign: "center", width: "100%" }}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value));
                    if (v > 0) setBudget(Math.min(v, MAX_BUDGET));
                  }}
                />
              ) : (
                <button onClick={() => setCustom(true)}>Other</button>
              )}
            </div>
            <div className="limitbox">
              <div className="row">
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14 }}>
                  <span style={{ color: "var(--accent-ink)", display: "flex" }}>
                    <Ico small p={LOCK} />
                  </span>
                  Hard limit
                </span>
                <span className="num" style={{ fontWeight: 600 }}>
                  ${budget}/mo
                </span>
              </div>
              <span style={{ fontSize: 13, lineHeight: "18px", color: "var(--muted)" }}>
                Pip can never plan more than this, and the server checks it before every payment. Test accounts can give up to ${MAX_BUDGET} a month.
              </span>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="pip-say">
              <Pip mood="idle" size={76} />
              <div className="bubble tail-l">PayPal handles the money. I never touch it.</div>
            </div>
            <h1 className="setup-q">Connect PayPal</h1>
            <div className="ppbox">
              <span className="pp-mark" style={{ fontSize: 22 }}>
                <b>Pay</b>
                <i>Pal</i>{" "}
                <span className="ppsandbox" style={{ fontStyle: "normal", verticalAlign: "middle" }}>
                  Sandbox
                </span>
              </span>
              <ul>
                <li><span className="y" style={{ display: "flex", color: "var(--accent-ink)" }}><Ico small p={CHECK} /></span>Pay each charity directly, once a month</li>
                <li><span style={{ display: "flex", color: "var(--accent-ink)" }}><Ico small p={CHECK} /></span>Send you a receipt for every payment</li>
                <li><span style={{ display: "flex", color: "var(--red-ink)" }}><Ico small p={CROSS} /></span>Pip can’t see your PayPal balance</li>
                <li><span style={{ display: "flex", color: "var(--red-ink)" }}><Ico small p={CROSS} /></span>Pip can’t move money without your approval</li>
              </ul>
            </div>
            <p className="setup-hint" style={{ marginTop: 0 }}>
              No bank connection needed. You can disconnect any time in Settings.
            </p>
            <TestLoginNote login={testLogin} />
          </>
        )}

        {step === 5 && (
          <>
            <div className="research">
              <Pip mood="researching" size={132} />
              <h2>{research >= 4 ? (sample ? "Here’s a starting point" : "All checked!") : "Pip is checking charities…"}</h2>
              <p>Looking for {heard.length ? heard.join(" and ") : "your causes"} groups that can show their results.</p>
            </div>
            <div className="rlist">
              {[
                ["Searched the web", "Done"],
                ["Read charity sites and news", "Done"],
                ["Kept only claims with a source", "Done"],
                ["Built your split", split ? `${split.length} ${split.length === 1 ? "charity" : "charities"}` : "Done"],
              ].map(([t, m], i) => {
                const st = research > i ? "ok" : research === i ? "go" : "wait";
                return (
                  <div key={t}>
                    <span className={`st ${st}`} aria-hidden="true">
                      {st === "ok" && <Ico small p={CHECK} />}
                    </span>
                    {t}
                    <span className="m num">{st === "ok" ? m : st === "go" ? "Working…" : "Next"}</span>
                  </div>
                );
              })}
            </div>
            <p className="setup-hint" style={{ marginTop: 0, textAlign: "center" }}>
              {research >= 4 ? searchNote : "Live web research. This can take up to a minute."}
            </p>
          </>
        )}

        {step === 6 && (
          <>
            <div className="pip-say">
              <Pip mood="idle" size={76} />
              <div className="bubble tail-l">
                {sample
                  ? "I couldn’t research this live, so this is a sample split to show how it works."
                  : shown.some((x) => x.chip === "rev")
                    ? "Here’s my suggestion. Some are only partly verified, so I gave them less."
                    : "Here’s my suggestion. Every charity here has sources you can open."}
              </div>
            </div>
            <h1 className="setup-q">Your suggested split</h1>
            <div className="sugg">
              <div className="sugg-h">
                <div className="sbar" aria-hidden="true">
                  {shown.map((s) => (
                    <i key={s.id} style={{ width: `${(s.cents / (budget * 100)) * 100}%`, background: s.color }} />
                  ))}
                </div>
                <strong className="num" style={{ fontSize: 15 }}>
                  ${budget}/mo
                </strong>
              </div>
              {sample && (
                <div className="sitem">
                  <span className="why2"><span className="chip neutral">Sample data</span> These aren’t real charities.</span>
                </div>
              )}
              {shown.map((s) => (
                <div className="sitem" key={s.id}>
                  <div className="top">
                    <span className="sw" style={{ background: s.color }} />
                    <span className="nm">{s.name}</span>
                    <span className="amt num">{money(s.cents)}</span>
                  </div>
                  <span className="why2">{s.why}</span>
                  <span className="meta2">
                    <span className={`chip ${s.chip}`}>
                      <i />
                      {s.conf}
                    </span>
                    {s.src ? (
                      <a className="src2" href={s.src} target="_blank" rel="noopener noreferrer">
                        Source
                        <Ico small p={ARROW_OUT} />
                      </a>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <div className="pip-say">
              <Pip mood="idle" size={64} />
              <div className="bubble tail-l">Over to you. This is PayPal’s screen. I can’t press anything here.</div>
            </div>
            <div className="ppsheet" role="dialog" aria-label="PayPal sandbox approval">
              <span className="grab" aria-hidden="true" />
              <div className="pphead">
                <span className="pp-mark" style={{ fontSize: 20 }}>
                  <b>Pay</b>
                  <i>Pal</i>
                </span>
                <span className="ppsandbox">Sandbox</span>
              </div>
              <strong style={{ fontSize: 17, lineHeight: "22px" }}>Approve your monthly plan</strong>
              <div className="pplines num">
                {shown.map((s) => (
                  <div key={s.id}>
                    <span>{s.name}</span>
                    <span>${(s.cents / 100).toFixed(2)}</span>
                  </div>
                ))}
                <div className="tot">
                  <span>Total each month</span>
                  <span>${budget.toFixed(2)}</span>
                </div>
              </div>
              <span style={{ fontSize: 12, lineHeight: "17px", color: "var(--muted)" }}>Paid from your PayPal to each charity directly. Nothing is sent until payment day, and you can change or stop it any time.</span>
              <div className="ppacct">
                <span className="avatar" style={{ width: 28, height: 28, fontSize: 11, borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
                  {display.slice(0, 1).toUpperCase()}
                </span>
                <span style={{ flex: 1 }}>{ppEmail ?? "Your PayPal"}</span>
                <span style={{ color: "var(--muted)" }}>Sandbox</span>
              </div>
              {ppError && (
                <p className="form-err" role="alert" style={{ margin: 0 }}>
                  {ppError}
                </p>
              )}
              <button className="btn btn-pp btn-block" onClick={approvePlan} disabled={ppBusy} aria-busy={ppBusy}>
                {ppBusy ? "Saving…" : "Agree and approve"}
              </button>
              <button className="btn btn-ghost" onClick={back} style={{ alignSelf: "center" }}>
                Cancel and go back
              </button>
            </div>
          </>
        )}

        {step === 8 && (
          <div className="celebrate">
            <div className="confetti" aria-hidden="true">
              <i style={{ left: "8%", top: "6%", background: "var(--s1)", transform: "rotate(18deg)" }} />
              <i style={{ left: "22%", top: "16%", background: "var(--s2)", transform: "rotate(-30deg)" }} />
              <i style={{ left: "78%", top: "4%", background: "var(--s3)", transform: "rotate(40deg)" }} />
              <i style={{ left: "90%", top: "18%", background: "var(--s4)", transform: "rotate(-12deg)" }} />
              <i style={{ left: "64%", top: "12%", background: "var(--accent)", transform: "rotate(60deg)" }} />
              <i style={{ left: "36%", top: "3%", background: "var(--s4)", transform: "rotate(22deg)" }} />
            </div>
            <Pip mood="celebrating" size={150} />
            <h1>You’re all set, {display}!</h1>
            <p>You approved ${budget} a month for {shown.length} {shown.length === 1 ? "charity" : "charities"}. I’ll keep checking them and ask you before anything changes.</p>
            <div className="recap num">
              <div><span>First payment</span><strong>{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong></div>
              <div><span>Monthly total</span><strong>${budget} of ${budget} limit</strong></div>
              <div><span>Pip’s next check</span><strong>Monday</strong></div>
            </div>
          </div>
        )}
      </main>

      {step !== 7 && (
        <div className="setup-foot">
          {step === 8 ? (
            <button className="btn btn-primary btn-block" onClick={() => router.push("/plan")}>
              Go to My plan
            </button>
          ) : (
            <>
            <button
              className={`btn btn-block ${step === 4 ? "btn-pp" : "btn-primary"}`}
              onClick={step === 4 ? connectPaypal : step === 6 && sample ? () => { setSplit(null); setStep(5); } : next}
              disabled={ppBusy}
              aria-busy={ppBusy}
            >
              {step === 4 && ppBusy ? "Opening PayPal…" : step === 6 && sample ? "Ask Pip to search again" : CTA[step]}
            </button>
            {step === 4 && ppError && (
              <p className="form-err" role="alert" style={{ margin: 0 }}>
                {ppError}
              </p>
            )}
            </>
          )}
          {step === 6 && (
            <Link className="btn btn-block" href="/discover" style={{ fontWeight: 500 }}>
              Edit split myself
            </Link>
          )}
          <span className="note">
            <Ico small p={SHIELD} />
            {NOTE[step]}
          </span>
        </div>
      )}
    </div>
  );
}
