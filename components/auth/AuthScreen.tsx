"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PipLogo } from "../Pip";
import ThemeToggle from "../ThemeToggle";
import { authClient, fetchMe } from "@/lib/auth-client";
import { setOnboardedLocal } from "@/lib/onboarding";

type Mode = "login" | "signup";

const COPY = {
  login: {
    img: "/images/donor-hoodie-hd.jpg",
    imgAlt: "A young man in a green hoodie smiling at his phone",
    artTitle: "Keep giving to the causes you care about.",
    artBody: "Clean water, girls’ education, your own community. See where your money went, what it did, and the receipts for every donation.",
    title: "Welcome back",
    sub: "Log in to see your giving plan, impact updates and receipts.",
    sso: "Log in",
    cta: "Log in",
    switchQ: "New to GiveWise?",
    switchA: "Sign up",
    switchHref: "/signup",
  },
  signup: {
    img: "/images/water-tap-hd.jpg",
    imgAlt: "A child cupping clean water from a tap",
    artTitle: "Turn what you care about into monthly giving.",
    artBody: "Pick your causes and a monthly budget. GiveWise finds charities that can show their results, and your donations go straight to them through PayPal.",
    title: "Create your account",
    sub: "Free to use. Change or stop your giving whenever you like.",
    sso: "Sign up",
    cta: "Create account",
    switchQ: "Already have an account?",
    switchA: "Log in",
    switchHref: "/login",
  },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 0–4: length ≥10, has a number, has a letter, has a symbol or mixed case. */
function strength(pw: string) {
  let s = 0;
  if (pw.length >= 10) s++;
  if (/\d/.test(pw)) s++;
  if (/[a-z]/i.test(pw)) s++;
  if (/[^a-z0-9]/i.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return s;
}
const STRENGTH_LABEL = ["Too short", "Weak", "Okay", "Good", "Strong"];

type Errors = Partial<Record<"name" | "email" | "password", string>>;

export default function AuthScreen({ mode }: { mode: Mode }) {
  const c = COPY[mode];
  const isSignup = mode === "signup";
  const router = useRouter();
  const params = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ssoNote, setSsoNote] = useState("");

  const pwScore = strength(password);

  // Carry the amount picked on the landing page into onboarding.
  const carry = new URLSearchParams();
  const amount = params.get("amount");
  const frequency = params.get("frequency");
  if (amount) carry.set("amount", amount);
  if (frequency) carry.set("frequency", frequency);
  const onboarding = `/onboarding${carry.size ? `?${carry}` : ""}`;
  // New accounts always meet Pip first. Returning users skip onboarding once they've finished it.
  const nextPath = (onboarded: boolean) => (isSignup || !onboarded ? onboarding : "/plan");

  // Which social buttons are live, and where to send people after OAuth.
  const [providers, setProviders] = useState({ google: false, paypal: false });
  useEffect(() => {
    fetchMe().then((r) => setProviders(r.providers));
    const err = params.get("error");
    if (err) {
      setFormError(
        err === "account_not_linked"
          ? "That email already has a GiveWise account. Log in with your password first."
          : err === "state_mismatch"
            ? "That sign-in timed out. Please try again from this same page."
            : "That sign-in didn’t finish. Please try again, or use email.",
      );
    }
  }, [params]);

  function validate(): Errors {
    const e: Errors = {};
    if (isSignup && !name.trim()) e.name = "Tell us what to call you.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    if (isSignup) {
      if (password.length < 10 || !/\d/.test(password)) e.password = "Use at least 10 characters, including a number.";
    } else if (!password) {
      e.password = "Enter your password.";
    }
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError("");
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const res = isSignup
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      : await authClient.signIn.email({ email: email.trim(), password, rememberMe: remember });
    if (res.error) {
      setBusy(false);
      setFormError(friendly(res.error.code, res.error.message));
      return;
    }
    const me = await fetchMe();
    const onboarded = Boolean(me.user?.onboarded);
    setOnboardedLocal(onboarded);
    router.push(nextPath(onboarded));
    router.refresh();
  }

  async function sso(provider: "paypal" | "google") {
    setSsoNote("");
    if (!providers[provider]) {
      setSsoNote(`${provider === "paypal" ? "PayPal" : "Google"} sign-in isn’t set up on this server yet. Use email for now.`);
      return;
    }
    // New social accounts go to onboarding; returning ones land on /auth/continue, which decides.
    await authClient.signIn.social({
      provider,
      callbackURL: `/auth/continue${carry.size ? `?${carry}` : ""}`,
      newUserCallbackURL: onboarding,
      errorCallbackURL: isSignup ? "/signup" : "/login",
    });
  }

  return (
    <div className="auth">
      {/* Photo side */}
      <section className="auth-art" aria-label="About GiveWise">
        <Image src={c.img} alt={c.imgAlt} fill priority quality={90} sizes="(max-width: 1000px) 0px, 52vw" />
        <div className="shade" />
        <div className="art-top">
          <Link className="logo" href="/" style={{ color: "#fff" }}>
            <PipLogo className="logo-mark" />
            <span>GiveWise</span>
          </Link>
        </div>
        <div className="art-copy">
          <h2>{c.artTitle}</h2>
          <p>{c.artBody}</p>
          <div className="art-pts">
            <span>Charities checked before you give</span>
            <span>A source behind every claim</span>
            <span>Monthly giving through PayPal</span>
          </div>
        </div>
      </section>

      {/* Form side */}
      <section className="auth-form" aria-labelledby="auth-h">
        <div className="auth-head">
          <Link className="logo home" href="/">
            <PipLogo className="logo-mark" />
            <span>GiveWise</span>
          </Link>
          <span style={{ flex: 1 }} />
          <span className="switchlink">
            {c.switchQ} <Link href={`${c.switchHref}${params.size ? `?${params}` : ""}`}>{c.switchA}</Link>
          </span>
          <ThemeToggle />
        </div>

        <div className="auth-body">
          <div className="mob-hero">
            <Image src={c.img} alt="" fill sizes="100vw" quality={85} />
          </div>

          <div>
            <h1 id="auth-h">{c.title}</h1>
            <p className="sub">{c.sub}</p>
          </div>

          <div className="sso">
            <button type="button" className="btn" onClick={() => sso("paypal")}>
              <span className="pp-mark">
                <b>Pay</b>
                <i>Pal</i>
              </span>
              {c.sso}
            </button>
            <button type="button" className="btn" onClick={() => sso("google")}>
              <GoogleMark />
              Google
            </button>
          </div>
          {ssoNote && (
            <p className="soon" role="status">
              {ssoNote}
            </p>
          )}

          <div className="or">or with email</div>

          <form className="stack" onSubmit={onSubmit} noValidate>
            {formError && (
              <p className="form-err" role="alert">
                {formError}
              </p>
            )}

            {isSignup && (
              <label className="field">
                Your name
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "err-name" : undefined} />
                {errors.name && <span className="err" id="err-name">{errors.name}</span>}
              </label>
            )}

            <label className="field">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "err-email" : undefined} />
              {errors.email && <span className="err" id="err-email">{errors.email}</span>}
            </label>

            <label className="field">
              Password
              <span className="pw">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "err-pw" : isSignup ? "pw-hint" : undefined}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw}>
                  <svg className="ic ic-s" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPw && <path d="M3 3l18 18" />}
                  </svg>
                </button>
              </span>
              {isSignup && (
                <>
                  <span className="pwmeter" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <i key={i} className={i < pwScore ? "on" : ""} />
                    ))}
                  </span>
                  <span className="hint" id="pw-hint">
                    {password ? `${STRENGTH_LABEL[pwScore]}. ` : ""}At least 10 characters with a number.
                  </span>
                </>
              )}
              {errors.password && <span className="err" id="err-pw">{errors.password}</span>}
            </label>

            {!isSignup && (
              <div className="rowbetween">
                <label className="check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Keep me signed in
                </label>
                <Link href="/forgot-password" style={{ fontWeight: 500, textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
              {busy && <span className="spin" aria-hidden="true" />}
              {busy ? (isSignup ? "Creating your account…" : "Logging in…") : c.cta}
            </button>
          </form>

          <div className="trust">
            <svg className="ic ic-s" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span>
              GiveWise never holds your money. Donations go from your PayPal straight to each charity, and <strong>nothing moves without your approval.</strong>
            </span>
          </div>

          {isSignup && (
            <p className="legal">
              By creating an account you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy notice</Link>.
            </p>
          )}
        </div>

        <div className="auth-foot">
          <span>© 2026 GiveWise</span>
          <span>
            <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link> · <Link href="/help" style={{ color: "inherit" }}>Help</Link>
          </span>
        </div>
      </section>
    </div>
  );
}

function friendly(code?: string, message?: string) {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don’t match. Check them and try again.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There’s already an account with this email. Log in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters, including a number.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    default:
      return message || "Something went wrong. Please try again.";
  }
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width={16} height={16}>
      <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" />
      <path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.6z" fill="#FBBC05" />
      <path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.8 9.4 6 12 6z" fill="#EA4335" />
    </svg>
  );
}
