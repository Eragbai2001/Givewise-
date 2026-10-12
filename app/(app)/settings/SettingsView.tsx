"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Pip from "@/components/Pip";
import EmptyState from "@/components/app/EmptyState";
import { I, Ic } from "@/components/app/icons";
import { useDemoState } from "@/lib/demo-state";
import { isOnboarded } from "@/lib/onboarding";
import { fetchMe, type Me } from "@/lib/auth-client";

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
  const { state } = useDemoState();
  const empty = state === "empty";
  const [tab, setTab] = useState<Tab>("profile");
  const [onboarded, setOnboarded] = useState(true);
  const [theme, setTheme] = useState<ThemePick>("system");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(0); // bump to reset unsaved edits

  const [me, setMe] = useState<Me | null>(null);

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
  const missing: { tab: Tab; label: string }[] = empty
    ? [
        { tab: "causes", label: "Your causes" },
        { tab: "budget", label: "Monthly budget" },
        { tab: "pay", label: "PayPal" },
      ]
    : [];
  const incomplete = !onboarded || missing.length > 0;

  const save = () => {
    // TODO: PATCH /api/settings once accounts are real.
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

      {incomplete && (
        <div className="set-note" role="status">
          <Pip mood="concerned" size={52} motion={false} decorative />
          <div>
            <b>Your profile is incomplete</b>
            <p>
              {missing.length > 0
                ? "You haven’t finished setting up, so Pip can’t suggest charities or a split yet. It only takes a couple of minutes."
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
          {tab === "causes" && <Causes empty={empty} />}
          {tab === "budget" && <Budget empty={empty} />}
          {tab === "pip" && <PipPrefs />}
          {tab === "notif" && <Notifications />}
          {tab === "pay" && <Payments state={state} />}
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
          <label className="field">Full name<input defaultValue={me?.name ?? "Ada Lewis"} autoComplete="name" /></label>
          <label className="field">Email<input type="email" defaultValue={me?.email ?? "ada.lewis@example.com"} autoComplete="email" readOnly={Boolean(me)} /></label>
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

function Causes({ empty }: { empty: boolean }) {
  const [causes, setCauses] = useState<string[]>(empty ? [] : ["Clean water", "Girls’ education", "Local community aid"]);
  const [never, setNever] = useState<string[]>(empty ? [] : ["Political campaigns"]);
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
          <select defaultValue={empty ? "Anywhere" : "Nigeria first, then anywhere"}>
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

function Budget({ empty }: { empty: boolean }) {
  const start = empty ? "" : "50";
  const [budget, setBudget] = useState(start);
  const [hard, setHard] = useState(start);
  const [per, setPer] = useState(empty ? "" : "30");
  const [oneoff, setOneoff] = useState(empty ? "" : "20");

  const h = Number(hard) || 0;
  const raised = !empty && h > 50;
  const budgetErr = Number(budget) > h && h > 0 ? "Your budget is above your hard limit. Pip will only plan up to the limit." : undefined;
  const perErr = Number(per) > h && h > 0 ? "This is more than your hard limit." : undefined;

  return (
    <>
      {empty && (
        <div className="banner" role="status" style={{ marginTop: 16 }}>
          <span className="bdot" aria-hidden="true" />
          <p><b>No limit set yet</b> · until you set one, nothing can be paid.</p>
        </div>
      )}
      <Row title="Monthly budget" desc="How much you want to give each month.">
        <div className="fields">
          <Money label="Monthly budget" value={budget} set={setBudget} err={budgetErr} />
        </div>
      </Row>
      <Row title="Hard limit" desc="GiveWise can never go above this, whatever happens.">
        <div className="fields">
          <Money
            label="Monthly hard limit"
            value={hard}
            set={setHard}
            hint={raised ? `Raising to $${h} applies in 24 hours. Until then the limit stays $50.` : "Raising it takes 24 hours to apply. Lowering it applies now."}
          />
          <Money label="Most for any one charity" value={per} set={setPer} err={perErr} />
          <Money label="One-off gift limit" value={oneoff} set={setOneoff} hint="For urgent appeals, on top of your plan." />
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

function Payments({ state }: { state: "full" | "new" | "empty" }) {
  const [connected, setConnected] = useState(state !== "empty");
  const [paused, setPaused] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!connected)
    return (
      <Row title="PayPal connection" desc="Gifts go straight from your PayPal to each charity. GiveWise never holds your money or sees your card.">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="ppcard">
            <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--grey-soft)", color: "var(--grey-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic d={I.wallet} />
            </span>
            <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column" }}>
              <b style={{ fontWeight: 600 }}>PayPal isn’t connected</b>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Connect it to start monthly giving. You approve the amount in PayPal.</span>
            </div>
            <span className="chip none">Not connected</span>
          </div>
          {/* TODO: start PayPal billing-agreement OAuth here. */}
          <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => setConnected(true)}>
            <Ic d={I.wallet} />Connect PayPal
          </button>
        </div>
      </Row>
    );

  const hasPaid = state === "full";
  return (
    <>
      <Row title="PayPal connection" desc="Gifts go straight from your PayPal to each charity. GiveWise never holds your money or sees your card.">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="ppcard">
            <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--grey-soft)", color: "var(--grey-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic d={I.wallet} />
            </span>
            <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column" }}>
              <b style={{ fontWeight: 600 }}>PayPal sandbox · ada.lewis@example.com</b>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Connected {hasPaid ? "10 Jun 2026" : "9 Oct 2026"} · approved up to $50/month
              </span>
            </div>
            {paused ? <span className="chip rev"><i />Paused</span> : <span className="chip ok"><i />Connected</span>}
          </div>
          <dl className="kv">
            <dt>Next payment</dt>
            <dd className="num">{paused ? "None while paused" : "1 Nov 2026 · $50.00 to 3 charities"}</dd>
            <dt>Payments this year</dt>
            <dd className="num">{hasPaid ? "15 · all paid" : "None yet"}</dd>
          </dl>
        </div>
      </Row>
      <Row title="Pause or stop" desc="Pausing keeps your plan. Disconnecting stops every future payment.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={() => setPaused((p) => !p)}>{paused ? "Resume giving" : "Pause all giving"}</button>
          {confirm ? (
            <>
              <span style={{ fontSize: 13, color: "var(--text2)" }}>Stop every future payment?</span>
              <button className="btn danger" onClick={() => { setConnected(false); setConfirm(false); }}>Yes, disconnect</button>
              <button className="btn" onClick={() => setConfirm(false)}>Keep connected</button>
            </>
          ) : (
            <button className="btn danger" onClick={() => setConfirm(true)}>Disconnect PayPal</button>
          )}
        </div>
      </Row>
    </>
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
