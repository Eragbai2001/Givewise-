"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Pip from "@/components/Pip";
import EmptyState from "@/components/app/EmptyState";
import { I, Ic } from "@/components/app/icons";
import { isOnboarded } from "@/lib/onboarding";
import { fetchMe, type Me } from "@/lib/auth-client";
import { paymentsChanged, usePayments } from "@/lib/use-payments";

type Tab = "profile" | "causes" | "budget" | "pip" | "notif" | "pay" | "sec";
type ThemePick = "light" | "dark" | "system";

const USER = ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"];
const DROP = ["M12 2.7C10 6 6 9.6 6 14a6 6 0 0 0 12 0c0-4.4-4-8-6-11.3z"];
const PLUS = ["M12 5v14", "M5 12h14"];
const UP = ["M18 15l-6-6-6 6"];

const TABS: { id: Tab; label: string; icon: readonly string[] }[] = [
  { id: "profile", label: "Profile", icon: USER },
  { id: "causes", label: "Causes & values", icon: I.heart },
  { id: "budget", label: "Budget & limits", icon: I.sliders },
  { id: "pip", label: "Pip", icon: DROP },
  { id: "notif", label: "Notifications", icon: I.bell },
  { id: "pay", label: "PayPal & payments", icon: I.wallet },
  { id: "sec", label: "Security", icon: I.lock },
];

const ALL_CAUSES = ["Clean water", "Girls’ education", "Local community aid", "Hunger relief", "Health care", "Climate & environment", "Animal welfare", "Disaster relief"];
const NEVER_OPTS = ["Political campaigns", "Religious groups", "Large international NGOs", "Animal testing"];

function readTheme(): ThemePick {
  try {
    const t = localStorage.getItem("gw-theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function applyTheme(pick: ThemePick) {
  const t = pick === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pick;
  document.documentElement.dataset.theme = t;
  try {
    if (pick === "system") localStorage.removeItem("gw-theme");
    else localStorage.setItem("gw-theme", pick);
  } catch {}
  window.dispatchEvent(new Event("gw-theme"));
}

export default function SettingsView() {
  const { status } = usePayments();
  const [tab, setTab] = useState<Tab>("profile");
  const [onboarded, setOnboarded] = useState(true);
  const [theme, setTheme] = useState<ThemePick>("system");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(0); // bump to reset unsaved edits

  const [me, setMe] = useState<Me | null>(null);
  const [saveErr, setSaveErr] = useState("");
  // Tabs that really save register a function here. It returns an error message, or null when saved.
  const saver = useRef<null | (() => Promise<string | null>)>(null);

  useEffect(() => {
    setOnboarded(isOnboarded());
    setTheme(readTheme());
    fetchMe().then(({ user }) => {
      if (!user) return;
      setMe(user);
      setOnboarded(user.onboarded);
    });
  }, []);

  // Things this account still doesn't have. Drives the notice and the dots on the tabs.
  const missing: { tab: Tab; label: string }[] = [];
  if (status && !status.connected) missing.push({ tab: "pay", label: "PayPal" });
  const incomplete = !onboarded || missing.length > 0;

  const save = async () => {
    setSaveErr("");
    const err = saver.current ? await saver.current() : null;
    if (err) return setSaveErr(err);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <main className="content">
      <div className="head">
        <div>
          <h1>Settings</h1>
          <p>Your profile, what you care about, your limits, how Pip works for you, and your PayPal connection.</p>
        </div>
        <div className="actions keep">
          {saved && (
            <span className="set-saved" role="status">
              <Ic d={I.check} />
              Saved
            </span>
          )}
          <button className="btn" onClick={() => setForm((n) => n + 1)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save changes</button>
        </div>
      </div>

      {saveErr && (
        <p className="form-err" role="alert" style={{ margin: 0 }}>
          {saveErr}
        </p>
      )}

      {incomplete && (
        <div className="set-note" role="status">
          <Pip mood="concerned" size={52} motion={false} decorative />
          <div>
            <b>Your profile is incomplete</b>
            <p>
              {missing.length > 0
                ? "You haven’t connected PayPal yet, so nothing can be paid. It only takes a minute."
                : "You skipped part of setup. Your plan still works, but finishing helps Pip suggest charities that fit you."}
            </p>
            {missing.length > 0 && (
              <div className="todo" aria-label="Still to do">
                {missing.map((m) => (
                  <span key={m.tab}>{m.label}</span>
                ))}
              </div>
            )}
          </div>
          <Link className="btn btn-primary" href="/onboarding">Finish setting up with Pip</Link>
        </div>
      )}

      <section className="card set" aria-label="Settings" key={form}>
        <nav className="set-nav" aria-label="Settings sections" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              <Ic d={t.icon} />
              {t.label}
              {missing.some((m) => m.tab === t.id) && <span className="tdot" aria-label="needs setting up" />}
            </button>
          ))}
        </nav>
        <div className="set-body" role="tabpanel">
          {tab === "profile" && <Profile me={me} key={me?.id ?? "demo"} theme={theme} setTheme={(t) => { setTheme(t); applyTheme(t); }} />}
          {tab === "causes" && <Causes />}
          {tab === "budget" && <Budget register={(fn) => (saver.current = fn)} />}
          {tab === "pip" && <PipPrefs />}
          {tab === "notif" && <Notifications />}
          {tab === "pay" && <Payments />}
          {tab === "sec" && <Security />}
        </div>
      </section>
    </main>
  );
}

/* ---------- small pieces ---------- */

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="srow2">
      <div>
        <h3>{title}</h3>
        <p className="d">{desc}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Switch({ label, desc, on, set, locked }: { label: string; desc: string; on: boolean; set?: (v: boolean) => void; locked?: boolean }) {
  return (
    <div className="sw-row">
      <div>
        <b>{label}</b>
        <span className="d">{desc}</span>
      </div>
      <button
        className={`switch ${on ? "on" : ""} ${locked ? "locked" : ""}`}
        role="switch"
        aria-checked={on}
        aria-disabled={locked || undefined}
        aria-label={locked ? `${label}, always on` : label}
        onClick={() => !locked && set?.(!on)}
      >
        <i />
      </button>
    </div>
  );
}

function Money({ label, value, set, hint, err }: { label: string; value: string; set: (v: string) => void; hint?: string; err?: string }) {
  return (
    <label className="field">
      {label}
      <span className="money num" style={{ maxWidth: 200 }}>
        $<input type="number" inputMode="decimal" min={0} value={value} placeholder="0" onChange={(e) => set(e.target.value)} />
      </span>
      {err ? <span className="err">{err}</span> : hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

/* ---------- sections ---------- */

function Profile({ me, theme, setTheme }: { me: Me | null; theme: ThemePick; setTheme: (t: ThemePick) => void }) {
  const opts: { id: ThemePick; label: string }[] = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "system", label: "Match device" },
  ];
  return (
    <>
      <Row title="Your details" desc="Used on receipts and your yearly statement.">
        <div className="fields">
          <label className="field">Full name<input defaultValue={me?.name ?? ""} autoComplete="name" /></label>
          <label className="field">Email<input type="email" defaultValue={me?.email ?? ""} autoComplete="email" readOnly={Boolean(me)} /></label>
          <label className="field">
            Country
            <select defaultValue="Nigeria">
              <option>Nigeria</option>
              <option>United States</option>
              <option>United Kingdom</option>
            </select>
          </label>
          <label className="field">
            Currency
            <select defaultValue="USD">
              <option value="USD">US dollar (USD)</option>
              <option value="NGN">Nigerian naira (NGN)</option>
            </select>
            <span className="hint">Payments in the demo are in USD.</span>
          </label>
        </div>
      </Row>
      <Row title="Appearance" desc="Light, dark, or match your device.">
        <div className="seg" role="group" aria-label="Theme">
          {opts.map((o) => (
            <button key={o.id} className={theme === o.id ? "on" : ""} aria-pressed={theme === o.id} onClick={() => setTheme(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </Row>
    </>
  );
}

function Causes() {
  const [causes, setCauses] = useState<string[]>([]);
  const [never, setNever] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const left = ALL_CAUSES.filter((c) => !causes.includes(c));
  const move = (i: number) => setCauses((c) => { const n = [...c]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });

  const summary =
    causes.length === 0
      ? ""
      : causes.length === 1
        ? `So: everything goes to ${causes[0].toLowerCase()}. Got it.`
        : `So: ${causes[0].toLowerCase()} first, then ${causes.slice(1).map((c) => c.toLowerCase()).join(", then ")}. Got it.`;

  return (
    <>
      <Row title="What you care about" desc="In order of importance. Pip uses this to find charities and suggest splits.">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {causes.length === 0 ? (
            <EmptyState compact icon={I.heart} title="No causes yet" body="Add the causes you care about most. You can reorder them any time." />
          ) : (
            <div className="rank">
              {causes.map((c, i) => (
                <div key={c}>
                  <span className="n">{i + 1}</span>
                  <span style={{ flex: 1 }}>{c}</span>
                  {i > 0 && (
                    <button className="iconbtn" aria-label={`Move ${c} up`} onClick={() => move(i)}>
                      <Ic d={UP} />
                    </button>
                  )}
                  <button className="iconbtn" aria-label={`Remove ${c}`} onClick={() => setCauses((x) => x.filter((y) => y !== c))}>
                    <Ic d={I.close} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {adding && left.length > 0 ? (
            <div className="addrow">
              <select
                autoFocus
                defaultValue=""
                aria-label="Pick a cause"
                onChange={(e) => { if (e.target.value) { setCauses((c) => [...c, e.target.value]); setAdding(false); } }}
              >
                <option value="" disabled>Pick a cause…</option>
                {left.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          ) : (
            left.length > 0 && (
              <button className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setAdding(true)}>
                <Ic d={PLUS} />Add a cause
              </button>
            )
          )}
          {summary && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <Pip mood="idle" size={36} motion={false} decorative />
              <div className="bubble" style={{ flex: 1 }}>{summary}</div>
            </div>
          )}
        </div>
      </Row>
      <Row title="Where" desc="Where you’d like your giving to go.">
        <label className="field" style={{ maxWidth: 320 }}>
          <span className="sr-only">Location</span>
          <select defaultValue="Anywhere">
            <option>Nigeria first, then anywhere</option>
            <option>Nigeria only</option>
            <option>Africa</option>
            <option>Anywhere</option>
          </select>
        </label>
      </Row>
      <Row title="Never fund" desc="Pip will never suggest charities in these groups.">
        <div className="chipset">
          {never.map((n) => (
            <span key={n} className="chip neutral">
              {n}
              <button className="x" aria-label={`Remove ${n}`} onClick={() => setNever((x) => x.filter((y) => y !== n))}>×</button>
            </span>
          ))}
          {never.length === 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}>Nothing excluded.</span>}
          <select
            className="btn btn-sm"
            value=""
            aria-label="Add a group to never fund"
            onChange={(e) => e.target.value && setNever((x) => [...x, e.target.value])}
            style={{ minHeight: 32 }}
          >
            <option value="">Add…</option>
            {NEVER_OPTS.filter((o) => !never.includes(o)).map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </Row>
    </>
  );
}

function Budget({ register }: { register: (fn: null | (() => Promise<string | null>)) => void }) {
  const [hard, setHard] = useState("");
  const [oneoff, setOneoff] = useState("");
  const [planned, setPlanned] = useState(0);
  const MAX = 50;

  // Load the donor's real limits.
  useEffect(() => {
    fetch("/api/payments/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setHard(String(d.hardLimitCents / 100));
        setOneoff(String(d.oneOffLimitCents / 100));
        setPlanned(d.planSaved ? d.plan.reduce((t: number, i: { amountCents: number }) => t + i.amountCents, 0) / 100 : 0);
      })
      .catch(() => {});
  }, []);

  const h = Number(hard) || 0;
  const o = Number(oneoff) || 0;
  const hardErr = h > MAX ? `Test accounts can be set up to $${MAX} a month.` : h > 0 && h < planned ? `Your plan gives $${planned} a month, so the limit can’t be lower than that.` : undefined;
  const oneErr = o > h && h > 0 ? "A one-off gift can’t be more than your monthly limit." : undefined;

  // Save button in the page header calls this.
  useEffect(() => {
    register(async () => {
      if (!(h > 0) || !(o > 0)) return "Enter both limits.";
      if (hardErr || oneErr) return hardErr ?? oneErr ?? null;
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hardLimitCents: Math.round(h * 100), oneOffLimitCents: Math.round(o * 100) }),
      }).catch(() => null);
      if (!r) return "Couldn’t reach GiveWise. Your limits didn’t change.";
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return d.error || "Couldn’t save your limits.";
      paymentsChanged();
      return null;
    });
    return () => register(null);
  }, [h, o, hardErr, oneErr, register]);

  return (
    <>
      <Row title="Hard limit" desc="GiveWise can never go above this in a month, whatever happens. The server checks it before every payment.">
        <div className="fields">
          <Money
            label="Monthly hard limit"
            value={hard}
            set={setHard}
            err={hardErr}
            hint={`Test accounts can be set up to $${MAX}.${planned ? ` Your plan gives $${planned} a month.` : ""}`}
          />
          <Money label="One-off gift limit" value={oneoff} set={setOneoff} err={oneErr} hint="The most for one extra gift, like an urgent appeal. It still counts toward your monthly limit." />
        </div>
      </Row>
      <Row title="Your approval" desc="This is how GiveWise works, so it can’t be turned off.">
        <Switch label="Ask me before every change" desc="Pip can suggest. Only you can approve." on locked />
      </Row>
    </>
  );
}

function PipPrefs() {
  const [gentle, setGentle] = useState(true);
  const [corner, setCorner] = useState(true);
  const [anim, setAnim] = useState(true);
  return (
    <>
      <Row title="Checks" desc="How often Pip looks at your charities.">
        <label className="field" style={{ maxWidth: 260 }}>
          <span className="sr-only">Check frequency</span>
          <select defaultValue="Every week">
            <option>Every week</option>
            <option>Every two weeks</option>
            <option>Every month</option>
          </select>
        </label>
      </Row>
      <Row title="When a charity slips" desc="What Pip suggests first.">
        <div className="choice" role="radiogroup">
          <label className={gentle ? "on" : ""}>
            <input type="radio" name="style" checked={gentle} onChange={() => setGentle(true)} />
            <span>
              <b style={{ fontWeight: 600 }}>Gentle steps</b>
              <br />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Watch first, then suggest giving less, and only then a switch.</span>
            </span>
          </label>
          <label className={!gentle ? "on" : ""}>
            <input type="radio" name="style" checked={!gentle} onChange={() => setGentle(false)} />
            <span>
              <b style={{ fontWeight: 600 }}>Suggest a switch</b>
              <br />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Go straight to a replacement charity.</span>
            </span>
          </label>
        </div>
      </Row>
      <Row title="Pip on screen" desc="How Pip shows up around the app.">
        <Switch label="Show Pip in the corner" desc="Tap to ask Pip anything about your giving." on={corner} set={setCorner} />
        <Switch label="Animations" desc="Turn off to keep Pip still. Pip is always still if your device asks for reduced motion." on={anim} set={setAnim} />
      </Row>
    </>
  );
}

function Notifications() {
  const [on, setOn] = useState({ prop: true, paid: true, impact: true, weekly: false });
  const tg = (k: keyof typeof on) => (v: boolean) => setOn((o) => ({ ...o, [k]: v }));
  return (
    <Row title="Notifications" desc="Choose what Pip tells you about. Pip never sends more than one nudge a day.">
      <Switch label="Pip’s suggestions" desc="Urgent appeals, matches and changes to your split." on={on.prop} set={tg("prop")} />
      <Switch label="Payment confirmations" desc="When each monthly gift goes through." on={on.paid} set={tg("paid")} />
      <Switch label="Payment problems" desc="Always on, so a failed gift never goes unnoticed." on locked />
      <Switch label="Impact updates" desc="When a charity shares results." on={on.impact} set={tg("impact")} />
      <Switch label="Weekly summary" desc="One email every Monday instead of many." on={on.weekly} set={tg("weekly")} />
    </Row>
  );
}

function Payments() {
  const { status, loaded } = usePayments();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function connect() {
    setErr("");
    setBusy(true);
    const r = await fetch("/api/paypal/vault/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: "plan" }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && d.url) {
      window.location.href = d.url;
      return;
    }
    setErr(d.error || "PayPal couldn’t be reached. Please try again.");
    setBusy(false);
  }

  if (!loaded) return <p style={{ margin: 0, padding: 16, color: "var(--muted)" }}>Loading…</p>;

  const paidCount = (status?.payments ?? []).filter((p) => p.status === "COMPLETED").length;
  const planTotal = (status?.plan ?? []).reduce((t, i) => t + i.amountCents, 0);
  const next = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Row title="PayPal connection" desc="Gifts go straight from your PayPal to each charity. GiveWise never holds your money or sees your card.">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="ppcard">
          <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--grey-soft)", color: "var(--grey-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic d={I.wallet} />
          </span>
          <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column" }}>
            <b style={{ fontWeight: 600 }}>
              {status?.connected ? `PayPal${status.env === "sandbox" ? " sandbox" : ""}${status.paypalEmail ? ` · ${status.paypalEmail}` : ""}` : "PayPal isn’t connected"}
            </b>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {status?.connected ? "Saved with your approval. Nothing is charged until payment day." : "Connect it to start monthly giving. Nothing is charged by connecting."}
            </span>
          </div>
          {status?.connected ? <span className="chip ok"><i />Connected</span> : <span className="chip none">Not connected</span>}
        </div>
        {status?.connected ? (
          <dl className="kv">
            <dt>Next payment day</dt>
            <dd className="num">{status.planSaved ? `${next} · $${(planTotal / 100).toFixed(2)} to ${status.plan.length} ${status.plan.length === 1 ? "charity" : "charities"}` : "No plan yet"}</dd>
            <dt>Payments so far</dt>
            <dd className="num">{paidCount ? `${paidCount} paid` : "None yet"}</dd>
          </dl>
        ) : (
          <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={connect} disabled={busy} aria-busy={busy}>
            <Ic d={I.wallet} />{busy ? "Opening PayPal…" : "Connect PayPal"}
          </button>
        )}
        {err && <span className="form-err" role="alert">{err}</span>}
      </div>
    </Row>
  );
}

function Security() {
  const [twofa, setTwofa] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Row title="Password" desc="At least 10 characters with a number.">
        <div className="fields">
          <label className="field">Current password<input type="password" autoComplete="current-password" placeholder="Current password" /></label>
          <label className="field">New password<input type="password" autoComplete="new-password" placeholder="New password" /></label>
        </div>
      </Row>
      <Row title="Two-step sign-in" desc="Ask for a code when you sign in on a new device.">
        <Switch label="Two-step sign-in" desc="Recommended for any account connected to payments." on={twofa} set={setTwofa} />
      </Row>
      <Row title="Your data" desc="Download everything, or close your account.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button className="btn"><Ic d={I.download} />Download my data</button>
          {confirm ? (
            <>
              <span style={{ fontSize: 13, color: "var(--text2)" }}>This stops all giving and can’t be undone.</span>
              <button className="btn danger" onClick={() => setConfirm(false)}>Delete for good</button>
              <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn danger" onClick={() => setConfirm(true)}>Delete account</button>
          )}
        </div>
      </Row>
    </>
  );
}
