"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { PipLogo } from "../Pip";
import ThemeToggle from "../ThemeToggle";
import { authClient } from "@/lib/auth-client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Forgot password (ask for the email) and Reset password (arrive from the emailed link). */
export default function ResetScreen({ mode }: { mode: "request" | "reset" }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const linkBad = mode === "reset" && (!token || params.get("error"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setBusy(true);
    await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reset-password" }).catch(() => {});
    setBusy(false);
    // Same message whether or not the email has an account, so nobody can probe for accounts.
    setSent(true);
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10 || !/\d/.test(password)) {
      setError("Use at least 10 characters, including a number.");
      return;
    }
    setError("");
    setBusy(true);
    const res = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (res.error) {
      setError("That link has expired or was already used. Ask for a new one.");
      return;
    }
    router.replace("/login?reset=1");
  }

  return (
    <div className="auth">
      <section className="auth-art" aria-label="About GiveWise">
        <Image src="/images/water-tap-hd.jpg" alt="A child cupping clean water from a tap" fill priority quality={90} sizes="(max-width: 1000px) 0px, 52vw" />
        <div className="shade" />
        <div className="art-top">
          <Link className="logo" href="/" style={{ color: "#fff" }}>
            <PipLogo className="logo-mark" />
            <span>GiveWise</span>
          </Link>
        </div>
      </section>

      <section className="auth-form" aria-labelledby="auth-h">
        <div className="auth-head">
          <Link className="logo home" href="/">
            <PipLogo className="logo-mark" />
            <span>GiveWise</span>
          </Link>
          <span style={{ flex: 1 }} />
          <span className="switchlink">
            Remembered it? <Link href="/login">Log in</Link>
          </span>
          <ThemeToggle />
        </div>

        <div className="auth-body">
          {mode === "request" && !sent && (
            <>
              <div>
                <h1 id="auth-h">Forgot your password?</h1>
                <p className="sub">Enter your email and we’ll send you a link to choose a new one.</p>
              </div>
              <form className="stack" onSubmit={onRequest} noValidate>
                {error && (
                  <p className="form-err" role="alert">
                    {error}
                  </p>
                )}
                <label className="field">
                  Email
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
                </label>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
                  {busy && <span className="spin" aria-hidden="true" />}
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}

          {mode === "request" && sent && (
            <div>
              <h1 id="auth-h">Check your email</h1>
              <p className="sub">
                If there’s a GiveWise account for <strong>{email.trim()}</strong>, a reset link is on its way. It works for one hour. Check your spam folder if you don’t see it.
              </p>
              <p style={{ marginTop: 16 }}>
                <Link href="/login" style={{ fontWeight: 600, textDecoration: "none" }}>
                  Back to log in
                </Link>
              </p>
            </div>
          )}

          {mode === "reset" && linkBad && (
            <div>
              <h1 id="auth-h">That link has expired</h1>
              <p className="sub">Reset links work once, for one hour. Ask for a new one and we’ll send it right away.</p>
              <p style={{ marginTop: 16 }}>
                <Link href="/forgot-password" style={{ fontWeight: 600, textDecoration: "none" }}>
                  Get a new link
                </Link>
              </p>
            </div>
          )}

          {mode === "reset" && !linkBad && (
            <>
              <div>
                <h1 id="auth-h">Choose a new password</h1>
                <p className="sub">At least 10 characters, including a number.</p>
              </div>
              <form className="stack" onSubmit={onReset} noValidate>
                {error && (
                  <p className="form-err" role="alert">
                    {error}
                  </p>
                )}
                <label className="field">
                  New password
                  <span className="pw">
                    <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} aria-pressed={showPw}>
                      <svg className="ic ic-s" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                        {showPw && <path d="M3 3l18 18" />}
                      </svg>
                    </button>
                  </span>
                </label>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
                  {busy && <span className="spin" aria-hidden="true" />}
                  {busy ? "Saving…" : "Save new password"}
                </button>
              </form>
            </>
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
